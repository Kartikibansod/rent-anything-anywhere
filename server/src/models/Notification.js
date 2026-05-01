const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: [
        "message",
        "offer",
        "booking_request",
        "payment_confirmation",
        "incoming_call",
        "price_drop",
        "verification",
        "report_update",
        "cash_meetup"
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: String,
    read: {
      type: Boolean,
      default: false
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = { Notification };
