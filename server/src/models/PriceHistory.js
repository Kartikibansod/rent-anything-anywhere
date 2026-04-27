const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    category: { type: String, required: true },
    condition: { type: String, required: true },
    finalPrice: { type: Number, required: true },
    soldAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

priceHistorySchema.index({ category: 1, soldAt: -1 });

const PriceHistory = mongoose.model("PriceHistory", priceHistorySchema);

module.exports = { PriceHistory };
