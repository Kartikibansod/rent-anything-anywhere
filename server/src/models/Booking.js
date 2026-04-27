const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    depositAmount: {
      type: Number,
      default: 0
    },
    depositStatus: {
      type: String,
      enum: ["held", "released", "disputed"],
      default: "held"
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "active", "completed", "disputed"],
      default: "pending"
    },
    returnedByRenter: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = { Booking };

