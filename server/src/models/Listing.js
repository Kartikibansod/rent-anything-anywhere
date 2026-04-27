const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["sell", "rent"],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140
    },
    photos: {
      type: [imageSchema],
      validate: [(photos) => photos.length <= 5, "A listing can have up to 5 photos"]
    },
    category: {
      type: String,
      required: true,
      enum: ["Books", "Electronics", "Furniture", "Clothes", "Cycles", "Kitchenware", "Sports gear"]
    },
    condition: {
      type: String,
      enum: ["new", "like_new", "used", "poor"],
      required: true
    },
    conditionDescription: {
      type: String,
      trim: true,
      maxlength: 280
    },
    itemAge: {
      type: String,
      trim: true,
      maxlength: 80
    },
    askingPrice: Number,
    rentRates: {
      daily: Number,
      weekly: Number,
      monthly: Number
    },
    damageDeposit: {
      type: Number,
      default: 0
    },
    description: {
      type: String,
      trim: true,
      maxlength: 3000
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        required: true
      },
    },
    wishlistedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    offers: [
      {
        buyer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        amount: Number,
        message: String,
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending"
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    status: {
      type: String,
      enum: ["active", "sold", "rented", "inactive"],
      default: "active"
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

listingSchema.index({ location: "2dsphere" });

const Listing = mongoose.model("Listing", listingSchema);

module.exports = { Listing };
