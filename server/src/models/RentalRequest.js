const mongoose = require("mongoose");

const rentalRequestSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    owner: {
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
    // Calculated at request time: daily rate × number of days
    rentalAmount: {
      type: Number,
      required: true
    },
    damageDeposit: {
      type: Number,
      default: 0
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500
    },
    // Owner approval gate
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending"
    },
    // Payment only allowed after status = "approved"
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending"
    },
    // Linked transaction after payment
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction"
    }
  },
  { timestamps: true }
);

const RentalRequest = mongoose.model("RentalRequest", rentalRequestSchema);

module.exports = { RentalRequest };
