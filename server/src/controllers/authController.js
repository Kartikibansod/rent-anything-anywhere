const { OAuth2Client } = require("google-auth-library");
const { User } = require("../models/User");
const { uploadImageBuffer } = require("../services/cloudinaryService");
const { asyncHandler } = require("../utils/asyncHandler");
const { signAuthToken } = require("../utils/token");
const { env } = require("../config/env");

const googleClient = new OAuth2Client(env.google.clientId);

function sendAuthResponse(res, user, statusCode = 200) {
  const token = signAuthToken(user);

  res.status(statusCode).json({
    token,
    user: user.toSafeJSON()
  });
}

const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    userType,
    hostel,
    locality,
    collegeName,
    collegeEmail,
    location
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const user = await User.create({
    name,
    email,
    password,
    userType,
    hostel,
    locality,
    collegeName,
    location,
    verification: {
      collegeEmail
    }
  });

  sendAuthResponse(res, user, 201);
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

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendAuthResponse(res, user);
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

const updateMyLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "lat and lng must be numbers" });
  }

  req.user.location = {
    type: "Point",
    coordinates: [lng, lat]
  };
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

const googleAuth = asyncHandler(async (req, res) => {
  const { credential, userType = "local" } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required" });
  }

  if (!env.google.clientId) {
    return res.status(503).json({ message: "Google login is not configured on this server" });
  }

  // ── 1. Verify the Google ID token ────────────────────────────────────────
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.google.clientId
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: "Invalid Google token" });
  }

  // ── 2. Validate the payload ───────────────────────────────────────────────
  if (!payload.email_verified) {
    return res.status(401).json({ message: "Google account email is not verified" });
  }

  const { email, name, picture, sub: googleId } = payload;

  if (!email || !name) {
    return res.status(400).json({ message: "Incomplete Google profile — email and name are required" });
  }

  // ── 3. Upsert user — no duplicates ────────────────────────────────────────
  // Detect userType from email domain: .edu / .ac.in → student
  const isAcademicEmail = /(\.edu|\.ac\.in)$/i.test(email);
  const resolvedUserType = isAcademicEmail ? "student" : userType;

  const verificationStatus = isAcademicEmail ? "approved" : "not_required";
  const verificationMethod = isAcademicEmail ? "email_domain" : "none";

  let user = await User.findOne({ email });

  if (user) {
    // Existing user — update avatar and last login
    if (picture && !user.avatar?.url) {
      user.avatar = { url: picture, publicId: `google_${googleId}` };
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "This account has been disabled" });
    }
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
  } else {
    // New user — create with a random unusable password (Google users never use it)
    const randomPassword = `google_${googleId}_${Date.now()}`;
    user = await User.create({
      name,
      email,
      password: randomPassword,
      userType: resolvedUserType,
      avatar: picture ? { url: picture, publicId: `google_${googleId}` } : undefined,
      verification: {
        status: verificationStatus,
        method: verificationMethod,
        collegeEmail: isAcademicEmail ? email : undefined
      }
    });
  }

  sendAuthResponse(res, user);
});

module.exports = {
  register,
  login,
  me,
  updateMyLocation,
  uploadStudentVerification,
  googleAuth
};
