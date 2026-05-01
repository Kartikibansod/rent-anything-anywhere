const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing"
    },
    type: {
      type: String,
      enum: ["purchase", "rental"],
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "cash"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "awaiting_confirmation", "held", "paid", "released", "completed", "failed", "refunded", "disputed"],
      default: "pending"
    },
    stripePaymentIntentId: String,
    currency: {
      type: String,
      default: "inr",
      lowercase: true
    },
    upi: {
      vpa: String,
      deepLink: String,
      reference: String
    },
    cashConfirmations: {
      buyer: { type: Boolean, default: false },
      seller: { type: Boolean, default: false }
    },
    releasedAt: Date,
    refundedAt: Date,
    dispute: {
      reason: String,
      evidenceUrl: String,
      openedAt: Date,
      status: { type: String, enum: ["open", "resolved"] }
    }
  },
  { timestamps: true }
);

transactionSchema.index(
  { buyer: 1, listing: 1, status: 1 },
  { partialFilterExpression: { status: { $in: ["pending", "awaiting_confirmation", "paid", "completed"] } } }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = { Transaction };
