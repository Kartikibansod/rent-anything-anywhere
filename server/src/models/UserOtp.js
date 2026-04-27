const mongoose = require("mongoose");

const userOtpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    purpose: {
      type: String,
      enum: ["register_verify", "login_2fa", "phone_verify"],
      required: true
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    consumedAt: Date
  },
  { timestamps: true }
);

userOtpSchema.index({ user: 1, purpose: 1, consumedAt: 1 });
userOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const UserOtp = mongoose.model("UserOtp", userOtpSchema);

module.exports = { UserOtp };
