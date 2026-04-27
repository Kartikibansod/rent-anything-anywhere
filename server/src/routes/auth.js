const express = require("express");
const {
  login,
  me,
  register,
  uploadStudentVerification,
  updateMyLocation,
  verifyRegistrationOtp,
  verifyLoginOtp,
  resendOtp,
  updateSettings,
  sendAuthResponse
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { Listing } = require("../models/Listing");
const { Transaction } = require("../models/Transaction");
const { User } = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");
const { env } = require("../config/env");
const passport = require("../config/passport");
const twilio = require("twilio");
const { createOtp, verifyOtp } = require("../services/otpService");

const authRouter = express.Router();

function ensureGoogleStrategy(req, res, next) {
  if (passport._strategy("google")) return next();
  return res.status(503).json({
    message: "Google auth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env and restart server."
  });
}

authRouter.post("/register", register);
authRouter.post("/register/verify-otp", verifyRegistrationOtp);
authRouter.post("/login", login);
authRouter.post("/login/verify-otp", verifyLoginOtp);
authRouter.post("/otp/resend", resendOtp);

authRouter.get("/google", ensureGoogleStrategy, passport.authenticate("google", { scope: ["profile", "email"] }));
authRouter.get("/google/callback", ensureGoogleStrategy, passport.authenticate("google", { session: false, failureRedirect: `${env.clientUrl}/` }), async (req, res) => {
  if (!req.user.isEmailVerified) {
    return res.redirect(`${env.clientUrl}/?error=google_email_not_verified`);
  }
  if (req.user.googleOnboardingPending) {
    return res.redirect(`${env.clientUrl}/?userId=${req.user._id}`);
  }
  const otp = await createOtp({ user: req.user._id, email: req.user.email, purpose: "login_2fa" });
  res.redirect(`${env.clientUrl}/?googleOtpUserId=${req.user._id}&purpose=login_2fa&otpExpiresAt=${encodeURIComponent(otp.expiresAt.toISOString())}`);
});

authRouter.post("/google/user-type", asyncHandler(async (req, res) => {
  const { userId, userType } = req.body;
  const user = await User.findByIdAndUpdate(userId, { userType, googleOnboardingPending: false }, { new: true });
  if (!user) return res.status(404).json({ message: "User not found" });
  const otp = await createOtp({ user: user._id, email: user.email, purpose: "login_2fa" });
  res.json({
    requiresOtp: true,
    purpose: "login_2fa",
    userId: user._id,
    expiresAt: otp.expiresAt
  });
}));

authRouter.get("/me", authenticate, me);
authRouter.patch("/me/location", authenticate, updateMyLocation);
authRouter.patch("/me/settings", authenticate, updateSettings);
authRouter.post("/phone/send-otp", authenticate, asyncHandler(async (req, res) => {
  if (!req.user.phoneNumber) return res.status(400).json({ message: "Add phone number first" });
  const otp = await createOtp({ user: req.user._id, email: req.user.email, purpose: "phone_verify" });
  if (env.twilio.sid && env.twilio.authToken && env.twilio.phone) {
    const client = twilio(env.twilio.sid, env.twilio.authToken);
    await client.messages.create({
      body: `Your Rent Anywhere phone verification OTP is ${otp.otp}. It expires in 10 minutes.`,
      from: env.twilio.phone,
      to: req.user.phoneNumber
    });
  }
  res.json({ message: "Phone OTP sent", expiresAt: otp.expiresAt });
}));
authRouter.post("/phone/verify-otp", authenticate, asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const result = await verifyOtp({ user: req.user._id, purpose: "phone_verify", otp });
  if (!result.ok) return res.status(400).json({ message: result.reason });
  req.user.isPhoneVerified = true;
  await req.user.save();
  res.json({ user: req.user.toSafeJSON() });
}));

authRouter.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select("-password -phoneNumber");
    if (!user) return res.status(404).json({ message: "User not found" });

    const [activeListings, pastTransactions] = await Promise.all([
      Listing.find({ owner: user._id, status: "active" }).sort({ createdAt: -1 }),
      Transaction.find({ $or: [{ buyer: user._id }, { seller: user._id }] })
        .populate("listing")
        .sort({ createdAt: -1 })
        .limit(20)
    ]);

    res.json({ user, activeListings: activeListings ?? [], pastTransactions: pastTransactions ?? [] });
  })
);

authRouter.post(
  "/student-verification",
  authenticate,
  upload.single("collegeId"),
  uploadStudentVerification
);

module.exports = authRouter;
