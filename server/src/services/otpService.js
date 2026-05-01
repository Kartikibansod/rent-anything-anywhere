const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const { env, smtpConfigured } = require("../config/env");
const { UserOtp } = require("../models/UserOtp");

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function getTransporter() {
  if (!smtpConfigured()) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: Number(env.smtp.port || 587),
    secure: Number(env.smtp.port) === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass }
  });
}

function isSmtpConfigured() {
  return smtpConfigured();
}

async function sendOtpEmail({ to, otp, purpose }) {
  const transporter = getTransporter();
  if (!transporter) {
    const error = new Error("SMTP is not configured. Email OTP cannot be sent.");
    error.statusCode = env.nodeEnv === "production" ? 503 : 503;
    throw error;
  }
  const subject = purpose === "login_2fa" ? "Your login OTP" : "Verify your Rent Anywhere account";
  await transporter.sendMail({
    from: env.smtp.from || env.smtp.user,
    to,
    subject,
    text: `Your OTP is ${otp}. It expires in 10 minutes.`
  });
}

async function createOtp({ user, email, purpose }) {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await UserOtp.updateMany({ user, purpose, used: false }, { consumedAt: new Date(), used: true });

  await UserOtp.create({ user, email, purpose, otpHash, expiresAt });
  await sendOtpEmail({ to: email, otp, purpose });
  return { expiresAt, otp };
}

async function verifyOtp({ user, purpose, otp }) {
  const record = await UserOtp.findOne({ user, purpose, used: false }).sort({ createdAt: -1 });
  if (!record) return { ok: false, reason: "OTP not found" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "OTP expired" };
  if (record.attempts >= 5) return { ok: false, reason: "Too many OTP attempts. Request a new code." };
  if (record.otpHash !== hashOtp(otp)) {
    record.attempts += 1;
    await record.save();
    return { ok: false, reason: "Invalid OTP" };
  }
  record.consumedAt = new Date();
  record.used = true;
  await record.save();
  return { ok: true };
}

module.exports = { createOtp, verifyOtp, isSmtpConfigured };
