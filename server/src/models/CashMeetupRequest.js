const mongoose = require("mongoose");

const cashMeetupRequestSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },
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
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed"],
      default: "pending"
    },
    buyerConfirmed: {
      type: Boolean,
      default: false
    },
    sellerConfirmed: {
      type: Boolean,
      default: false
    },
    chatRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat"
    }
  },
  { timestamps: true }
);

cashMeetupRequestSchema.index(
  { listing: 1, buyer: 1, status: 1 },
  { partialFilterExpression: { status: { $in: ["pending", "accepted"] } } }
);

const CashMeetupRequest = mongoose.model("CashMeetupRequest", cashMeetupRequestSchema);

module.exports = { CashMeetupRequest };
