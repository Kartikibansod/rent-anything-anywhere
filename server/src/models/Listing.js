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
    conditionScore: Number,
    conditionAiReasoning: String,
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
      minlength: 20,
      maxlength: 500
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
      address: String
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
          enum: ["pending", "accepted", "rejected", "countered", "expired"],
          default: "pending"
        },
        counterPrice: Number,
        expiresAt: Date,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    moderation: {
      isFlagged: { type: Boolean, default: false },
      reasons: [String],
      rejectionReason: String,
      state: { type: String, enum: ["live", "under_review", "pending_first_approval", "rejected"], default: "live" }
    },
    status: {
      type: String,
      enum: ["active", "sold", "rented", "inactive", "expired", "pending_approval"],
      default: "active"
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    expirationNotice: {
      day25Sent: { type: Boolean, default: false },
      sentAt: Date
    },
    viewCount: {
      type: Number,
      default: 0
    },
    aiPriceEstimate: {
      sellPrice: Number,
      rentPerDay: Number,
      confidence: String,
      reasoning: String,
      marketAnalysis: String,
      pricingReasoning: String,
      conditionScore: Number,
      actualCondition: String,
      warning: String,
      appliedAt: Date
    }
  },
  { timestamps: true }
);

listingSchema.index({ location: "2dsphere" });

const Listing = mongoose.model("Listing", listingSchema);

module.exports = { Listing };
