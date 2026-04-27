const { User } = require("../models/User");
const { uploadImageBuffer } = require("../services/cloudinaryService");
const { createOtp, verifyOtp } = require("../services/otpService");
const { asyncHandler } = require("../utils/asyncHandler");
const { signAuthToken } = require("../utils/token");

function sendAuthResponse(res, user, statusCode = 200) {
  const token = signAuthToken(user);

  res.status(statusCode).json({
    token,
    user: user.toSafeJSON()
  });
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, userType } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const user = await User.create({
    name,
    email,
    password,
    userType,
    isEmailVerified: false
  });

  const otp = await createOtp({ user: user._id, email: user.email, purpose: "register_verify" });
  res.status(201).json({
    requiresOtp: true,
    purpose: "register_verify",
    userId: user._id,
    expiresAt: otp.expiresAt
  });
});

const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const result = await verifyOtp({ user: user._id, purpose: "register_verify", otp });
  if (!result.ok) return res.status(400).json({ message: result.reason });

  user.isEmailVerified = true;
  await user.save();
  sendAuthResponse(res, user);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (!user.isActive) {
    return res.status(403).json({ message: "This account is disabled" });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({ message: "Please verify your email before logging in" });
  }

  if (user.otp2faEnabled) {
    const otp = await createOtp({ user: user._id, email: user.email, purpose: "login_2fa" });
    return res.json({
      requiresOtp: true,
      purpose: "login_2fa",
      userId: user._id,
      expiresAt: otp.expiresAt
    });
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendAuthResponse(res, user);
});

const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const result = await verifyOtp({ user: user._id, purpose: "login_2fa", otp });
  if (!result.ok) return res.status(400).json({ message: result.reason });

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  sendAuthResponse(res, user);
});

const resendOtp = asyncHandler(async (req, res) => {
  const { userId, purpose } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  const otp = await createOtp({ user: user._id, email: user.email, purpose });
  res.json({ message: "OTP resent", expiresAt: otp.expiresAt });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

const updateMyLocation = asyncHandler(async (req, res) => {
  const { lat, lng, locationText } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "lat and lng must be numbers" });
  }

  req.user.location = {
    type: "Point",
    coordinates: [lng, lat]
  };
  if (typeof locationText === "string") req.user.locationText = locationText;
  await req.user.save();

  res.json({ user: req.user.toSafeJSON() });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { otp2faEnabled, locationText, phoneNumber } = req.body;
  if (typeof otp2faEnabled === "boolean") req.user.otp2faEnabled = otp2faEnabled;
  if (typeof locationText === "string") req.user.locationText = locationText;
  if (typeof phoneNumber === "string") req.user.phoneNumber = phoneNumber;
  await req.user.save();
  res.json({ user: req.user.toSafeJSON() });
});

const uploadStudentVerification = asyncHandler(async (req, res) => {
  if (req.user.userType !== "student") {
    return res.status(400).json({ message: "Only student accounts need college ID verification" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "College ID image is required" });
  }

  const uploaded = await uploadImageBuffer(req.file.buffer, "rent-anything-anywhere/college-ids");

  req.user.verification.collegeIdImage = uploaded;
  req.user.verification.status = "pending";
  req.user.verification.method = "college_id";
  await req.user.save();

  res.json({
    message: "College ID uploaded for admin review",
    user: req.user.toSafeJSON()
  });
});

module.exports = {
  register,
  verifyRegistrationOtp,
  login,
  verifyLoginOtp,
  resendOtp,
  me,
  updateMyLocation,
  updateSettings,
  uploadStudentVerification,
  sendAuthResponse
};
