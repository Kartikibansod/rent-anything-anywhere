const express = require("express");
const { Listing } = require("../models/Listing");
const { Notification } = require("../models/Notification");
const { asyncHandler } = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

function listingFilters(query) {
  const filter = { status: { $ne: "inactive" } };
  const search = query.search || query.keyword;

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").trim();
    if (escaped) {
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { category: { $regex: escaped, $options: "i" } }
      ];
    }
  }
  if (query.category) filter.category = query.category;
  if (query.condition) filter.condition = query.condition;
  const requestedType = (query.type || query.listingType || "").toString().trim().toLowerCase();
  if (requestedType && requestedType !== "all") {
    filter.type = requestedType;
  }

  const priceFilter = {};
  if (query.minPrice) priceFilter.$gte = Number(query.minPrice);
  if (query.maxPrice) priceFilter.$lte = Number(query.maxPrice);
  if (Object.keys(priceFilter).length) filter.askingPrice = priceFilter;

  return filter;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { lng, lat, radius = 10, page = 1, limit = 20 } = req.query;
    const filter = listingFilters(req.query);
    console.log("Listings query filter:", JSON.stringify(filter));
    const skip = (Number(page) - 1) * Number(limit);

    if (lng && lat) {
      const geoListings = await Listing.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [Number(lng), Number(lat)]
            },
            distanceField: "distanceMeters",
            maxDistance: Number(radius) * 1000,
            query: filter,
            spherical: true
          }
        },
        { $skip: skip },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner"
          }
        },
        { $unwind: "$owner" },
        {
          $project: {
            type: 1,
            title: 1,
            photos: 1,
            category: 1,
            condition: 1,
            conditionDescription: 1,
            itemAge: 1,
            askingPrice: 1,
            rentRates: 1,
            damageDeposit: 1,
            description: 1,
            location: 1,
            wishlistedBy: 1,
            offers: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            distanceMeters: 1,
            distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] },
            owner: {
              _id: "$owner._id",
              name: "$owner.name",
              userType: "$owner.userType",
              hostel: "$owner.hostel",
              locality: "$owner.locality",
              rating: "$owner.rating",
              verification: "$owner.verification",
              avatar: "$owner.avatar"
            }
          }
        }
      ]);

      return res.json({ listings: geoListings, page: Number(page), limit: Number(limit) });
    }

    const listings = await Listing.find(filter)
      .populate("owner", "name userType hostel locality rating verification avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ listings, page: Number(page), limit: Number(limit) });
  })
);

router.get(
  "/mine",
  authenticate,
  asyncHandler(async (req, res) => {
    const listings = await Listing.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ listings });
  })
);

router.get(
  "/my",
  authenticate,
  asyncHandler(async (req, res) => {
    const listings = await Listing.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ listings });
  })
);

router.get(
  "/wishlist",
  authenticate,
  asyncHandler(async (req, res) => {
    const listings = await Listing.find({ wishlistedBy: req.user._id })
      .populate("owner", "name userType rating verification")
      .sort({ updatedAt: -1 });
    res.json({ listings });
  })
);

router.post("/", authenticate, asyncHandler(async (req, res) => {
  const listing = await Listing.create({
    owner: req.user._id,
    ...req.body
  });
  res.status(201).json({ listing });
}));

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate(
      "owner",
      "name userType hostel locality rating verification avatar"
    );

    if (!listing || listing.status === "removed") {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json({ listing });
  })
);

router.get(
  "/:id/similar",
  asyncHandler(async (req, res) => {
    const current = await Listing.findById(req.params.id).select("category");
    if (!current) return res.status(404).json({ message: "Listing not found" });

    const listings = await Listing.find({
      _id: { $ne: req.params.id },
      category: current.category,
      status: "active"
    })
      .populate("owner", "name userType rating verification avatar")
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit || 4));

    res.json({ listings });
  })
);

router.put(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (!listing.owner.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the owner can edit this listing" });
    }

    Object.assign(listing, req.body);

    await listing.save();

    res.json({ listing });
  })
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (!listing.owner.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the owner can delete this listing" });
    }

    await listing.deleteOne();
    res.json({ message: "Listing deleted" });
  })
);

router.post(
  "/:id/wishlist",
  authenticate,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    const saved = listing.wishlistedBy.some((userId) => userId.equals(req.user._id));
    listing.wishlistedBy = saved
      ? listing.wishlistedBy.filter((userId) => !userId.equals(req.user._id))
      : [...listing.wishlistedBy, req.user._id];
    await listing.save();

    res.json({ saved: !saved });
  })
);

router.post(
  "/:id/offer",
  authenticate,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    const offer = {
      buyer: req.user._id,
      amount: Number(req.body.amount),
      message: req.body.message,
      status: "pending",
      createdAt: new Date()
    };

    listing.offers.push(offer);
    await listing.save();

    await Notification.create({
      user: listing.owner,
      type: "offer",
      title: "New offer received",
      message: `${req.user.name} offered INR ${offer.amount} for ${listing.title}.`,
      data: { listingId: listing._id }
    });

    res.status(201).json({ offer });
  })
);

router.patch(
  "/:id/offers/:offerId",
  authenticate,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (!listing.owner.equals(req.user._id)) {
      return res.status(403).json({ message: "Only the seller can respond to offers" });
    }

    const offer = listing.offers.id(req.params.offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    offer.status = req.body.status === "accepted" ? "accepted" : "rejected";
    await listing.save();

    await Notification.create({
      user: offer.buyer,
      type: "offer",
      title: `Offer ${offer.status}`,
      message: `Your offer for ${listing.title} was ${offer.status}.`,
      data: { listingId: listing._id }
    });

    res.json({ offer });
  })
);

module.exports = router;
