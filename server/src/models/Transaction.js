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
      enum: ["online", "cash"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    },
    stripePaymentIntentId: String,
    cashConfirmations: {
      buyer: { type: Boolean, default: false },
      seller: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = { Transaction };

