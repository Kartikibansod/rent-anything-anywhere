const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const { env } = require("../config/env");
const { UserOtp } = require("../models/UserOtp");

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function getTransporter() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: Number(env.smtp.port || 587),
    secure: Number(env.smtp.port) === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass }
  });
}

async function sendOtpEmail({ to, otp, purpose }) {
  const transporter = getTransporter();
  if (!transporter) return;
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

  await UserOtp.updateMany({ user, purpose, consumedAt: null }, { consumedAt: new Date() });

  await UserOtp.create({ user, email, purpose, otpHash, expiresAt });
  await sendOtpEmail({ to: email, otp, purpose });
  return { expiresAt, otp };
}

async function verifyOtp({ user, purpose, otp }) {
  const record = await UserOtp.findOne({ user, purpose, consumedAt: null }).sort({ createdAt: -1 });
  if (!record) return { ok: false, reason: "OTP not found" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "OTP expired" };
  if (record.otpHash !== hashOtp(otp)) {
    record.attempts += 1;
    await record.save();
    return { ok: false, reason: "Invalid OTP" };
  }
  record.consumedAt = new Date();
  await record.save();
  return { ok: true };
}

module.exports = { createOtp, verifyOtp };
