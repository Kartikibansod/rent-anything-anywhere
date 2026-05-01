const express = require("express");
const { Listing } = require("../models/Listing");
const { Notification } = require("../models/Notification");
const { PriceHistory } = require("../models/PriceHistory");
const { Transaction } = require("../models/Transaction");
const { asyncHandler } = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { uploadImageBuffer } = require("../services/cloudinaryService");
const { estimatePrice, scoreCondition } = require("../services/aiService");

const router = express.Router();
const suspiciousKeywords = ["advance payment only", "urgent transfer", "crypto only", "no meetup"];
const conditionMap = {
  New: "new",
  "Like New": "like_new",
  Used: "used",
  Poor: "poor"
};

function listingFilters(query) {
  const filter = { status: "active", expiresAt: { $gt: new Date() } };
  const search = query.q || query.search || query.keyword;

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").trim();
    if (escaped) {
      filter.$and = [
        ...(filter.$and || []),
        { $or: [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { category: { $regex: escaped, $options: "i" } }
        ] }
      ];
    }
  }
  if (query.category) filter.category = query.category;
  if (query.condition) filter.condition = conditionMap[query.condition] || query.condition;
  const requestedType = (query.type || query.listingType || query.mode || "").toString().trim().toLowerCase();
  if (requestedType && requestedType !== "all") filter.type = requestedType;

  const minPrice = Number(query.minPrice);
  const maxPrice = Number(query.maxPrice);
  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    const range = {};
    if (!Number.isNaN(minPrice)) range.$gte = minPrice;
    if (!Number.isNaN(maxPrice)) range.$lte = maxPrice;
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ askingPrice: range }, { "rentRates.daily": range }] }
    ];
  }

  return filter;
}

async function detectFraudSignals({ owner, category, price, description }) {
  const reasons = [];
  const avg = await Listing.aggregate([
    { $match: { category, status: { $in: ["active", "sold", "rented"] } } },
    { $group: { _id: "$category", avgPrice: { $avg: "$askingPrice" } } }
  ]);

  const avgPrice = avg[0]?.avgPrice || 0;
  if (avgPrice > 0 && price < avgPrice * 0.3) reasons.push("Price appears 70% below category average");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const listingCount = await Listing.countDocuments({ owner, createdAt: { $gte: oneHourAgo } });
  if (listingCount >= 5) reasons.push("More than 5 listings posted in one hour");

  const desc = (description || "").toLowerCase();
  if (suspiciousKeywords.some((word) => desc.includes(word))) reasons.push("Description contains suspicious keywords");

  return reasons;
}

function normalizeAiEstimate(raw) {
  if (!raw) return undefined;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return {
    sellPrice: Number(parsed.sellPrice?.recommended || parsed.sellPrice || 0) || undefined,
    rentPerDay: Number(parsed.rentPerDay?.recommended || parsed.rentPerDay || 0) || undefined,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    marketAnalysis: parsed.marketAnalysis,
    pricingReasoning: parsed.pricingReasoning,
    conditionScore: Number(parsed.conditionScore || 0) || undefined,
    actualCondition: parsed.actualCondition,
    warning: parsed.warning,
    appliedAt: new Date()
  };
}

router.get("/", asyncHandler(async (req, res) => {
  const { lng, lat, radius = 10, page = 1, limit = 20 } = req.query;
  const filter = listingFilters(req.query);
  const skip = (Number(page) - 1) * Number(limit);

  if (lng && lat) {
    const geoListings = await Listing.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          distanceField: "distanceMeters",
          maxDistance: Number(radius) * 1000,
          query: filter,
          spherical: true
        }
      },
      { $skip: skip },
      { $limit: Number(limit) },
      { $lookup: { from: "users", localField: "owner", foreignField: "_id", as: "owner" } },
      { $unwind: "$owner" },
      ...(req.query.sellerType && req.query.sellerType !== "All" ? [{ $match: { "owner.userType": req.query.sellerType.toLowerCase() } }] : []),
      { $addFields: { distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] } } },
      {
        $project: {
          "owner.password": 0,
          "owner.phoneNumber": 0,
          "owner.googleId": 0,
          "owner.__v": 0
        }
      }
    ]);

    return res.json({ listings: geoListings, page: Number(page), limit: Number(limit) });
  }

  const listings = await Listing.find(filter)
    .populate("owner", "name userType locationText collegeName rating verification avatar isVerified isPhoneVerified")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const sellerType = req.query.sellerType && req.query.sellerType !== "All" ? req.query.sellerType.toLowerCase() : "";
  res.json({ listings: sellerType ? listings.filter((listing) => listing.owner?.userType === sellerType) : listings, page: Number(page), limit: Number(limit) });
}));

router.get("/mine", authenticate, asyncHandler(async (req, res) => {
  const listings = await Listing.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ listings });
}));

router.get("/wishlist", authenticate, asyncHandler(async (req, res) => {
  const listings = await Listing.find({ wishlistedBy: req.user._id })
    .populate("owner", "name userType collegeName rating verification isVerified")
    .sort({ updatedAt: -1 });
  res.json({ listings });
}));

router.post("/estimate-price", authenticate, upload.array("photos", 5), asyncHandler(async (req, res) => {
  const images = [];
  for (const file of req.files || []) {
    const base64 = file.buffer.toString("base64");
    images.push(`data:${file.mimetype};base64,${base64}`);
  }
  const result = await estimatePrice({ ...req.body, images });
  res.json(result);
}));

router.post("/score-condition", authenticate, upload.single("photo"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Photo is required" });
  const uploaded = await uploadImageBuffer(req.file.buffer, "rent-anything-anywhere/condition-ai");
  const result = await scoreCondition(uploaded.url);
  const score = Number(result.score || 0);
  let condition = "used";
  if (score >= 9) condition = "new";
  else if (score >= 7) condition = "like_new";
  else if (score <= 3) condition = "poor";
  res.json({ ...result, score, condition });
}));

router.post("/", authenticate, upload.array("photos", 5), asyncHandler(async (req, res) => {
  const location = JSON.parse(req.body.location || "{}");
  const rentRates = req.body.rentRates ? JSON.parse(req.body.rentRates) : undefined;
  const photos = [];
  for (const file of req.files || []) {
    const uploaded = await uploadImageBuffer(file.buffer, "rent-anything-anywhere/listings");
    photos.push(uploaded);
  }

  const askingPrice = Number(req.body.askingPrice || rentRates?.daily || 0);
  const completedDeals = await Transaction.countDocuments({
    seller: req.user._id,
    status: { $in: ["completed", "released"] }
  });
  const approvedListings = await Listing.countDocuments({
    owner: req.user._id,
    "moderation.state": { $in: ["live", "under_review"] }
  });
  const needsFirstApproval = completedDeals === 0 && approvedListings === 0;
  const fraudReasons = await detectFraudSignals({
    owner: req.user._id,
    category: req.body.category,
    price: askingPrice,
    description: req.body.description
  });

  const listing = await Listing.create({
    owner: req.user._id,
    type: req.body.type,
    title: req.body.title,
    photos,
    category: req.body.category,
    condition: req.body.condition,
    conditionScore: req.body.conditionScore ? Number(req.body.conditionScore) : undefined,
    conditionAiReasoning: req.body.conditionAiReasoning,
    conditionDescription: req.body.conditionDescription,
    itemAge: req.body.itemAge,
    askingPrice: req.body.type === "sell" ? askingPrice : undefined,
    rentRates: req.body.type === "rent" ? rentRates : undefined,
    damageDeposit: Number(req.body.damageDeposit || 0),
    description: req.body.description,
    aiPriceEstimate: normalizeAiEstimate(req.body.aiPriceEstimate),
    location,
    moderation: {
      isFlagged: fraudReasons.length > 0,
      reasons: fraudReasons,
      state: needsFirstApproval ? "pending_first_approval" : fraudReasons.length > 0 ? "under_review" : "live"
    },
    status: needsFirstApproval ? "pending_approval" : fraudReasons.length > 0 ? "inactive" : "active"
  });

  res.status(201).json({ listing });
}));

router.get('/:id/price-history', asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  const history = await PriceHistory.find({ category: listing.category }).sort({ soldAt: -1 }).limit(30);
  res.json({ history });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const listing = await Listing.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }, { new: true })
    .populate('owner', 'name userType locationText collegeName rating verification avatar isVerified isPhoneVerified');
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  res.json({ listing });
}));

router.get('/:id/similar', asyncHandler(async (req, res) => {
  const current = await Listing.findById(req.params.id).select('category askingPrice rentRates location');
  if (!current) return res.status(404).json({ message: 'Listing not found' });
  const price = Number(current.askingPrice || current.rentRates?.daily || 0);
  const priceRange = price ? { $or: [{ askingPrice: { $gte: price * 0.6, $lte: price * 1.4 } }, { "rentRates.daily": { $gte: price * 0.6, $lte: price * 1.4 } }] } : {};
  const listings = await Listing.find({ _id: { $ne: req.params.id }, category: current.category, status: 'active', expiresAt: { $gt: new Date() }, ...priceRange })
    .populate('owner', 'name userType collegeName rating verification avatar')
    .sort({ createdAt: -1 })
    .limit(Number(req.query.limit || 4));
  res.json({ listings });
}));

router.post('/:id/wishlist', authenticate, asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  const saved = listing.wishlistedBy.some((userId) => userId.equals(req.user._id));
  listing.wishlistedBy = saved ? listing.wishlistedBy.filter((userId) => !userId.equals(req.user._id)) : [...listing.wishlistedBy, req.user._id];
  await listing.save();
  res.json({ saved: !saved });
}));

router.post('/:id/offer', authenticate, asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  const amount = Number(req.body.amount);
  const asking = Number(listing.askingPrice || listing.rentRates?.daily || 0);
  if (!amount || amount < asking * 0.5) {
    return res.status(400).json({ message: "Offer cannot be below 50% of asking price" });
  }
  const offer = { buyer: req.user._id, amount, message: req.body.message, status: 'pending', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), createdAt: new Date() };
  listing.offers.push(offer);
  await listing.save();
  await Notification.create({ user: listing.owner, type: 'offer', title: 'New offer received', message: `${req.user.name} offered INR ${offer.amount} for ${listing.title}.`, data: { listingId: listing._id } });
  res.status(201).json({ offer });
}));

module.exports = router;
