const express = require("express");
const { Listing } = require("../models/Listing");
const { RentalRequest } = require("../models/RentalRequest");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { createNotification } = require("../services/notificationService");

const router = express.Router();
router.use(authenticate);

// ── GET all requests for the current user (as renter or owner) ──────────────
router.get("/", asyncHandler(async (req, res) => {
  const requests = await RentalRequest.find({
    $or: [{ renter: req.user._id }, { owner: req.user._id }]
  })
    .populate("listing", "title photos category type rentRates askingPrice location")
    .populate("renter owner", "name avatar rating verification")
    .sort({ createdAt: -1 });

  res.json({ requests });
}));

// ── GET single request ───────────────────────────────────────────────────────
router.get("/:id", asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.id)
    .populate("listing", "title photos category type rentRates damageDeposit location")
    .populate("renter owner", "name avatar rating verification");

  if (!request) return res.status(404).json({ message: "Rental request not found" });

  const isParty = request.renter.equals(req.user._id) || request.owner.equals(req.user._id);
  if (!isParty) return res.status(403).json({ message: "Access denied" });

  res.json({ request });
}));

// ── POST create a new rental request ────────────────────────────────────────
router.post("/", asyncHandler(async (req, res) => {
  const { listingId, startDate, endDate, message } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing) return res.status(404).json({ message: "Listing not found" });
  if (listing.type !== "rent") {
    return res.status(400).json({ message: "This listing is not available for rent" });
  }
  if (listing.status !== "active") {
    return res.status(400).json({ message: "This listing is no longer available" });
  }
  if (listing.owner.equals(req.user._id)) {
    return res.status(400).json({ message: "You cannot rent your own listing" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || end <= start) {
    return res.status(400).json({ message: "Invalid date range" });
  }

  // Prevent requests for dates in the past
  if (start < new Date()) {
    return res.status(400).json({ message: "Start date cannot be in the past." });
  }

  // Check for date overlap with existing approved or paid requests for this listing
  const overlapping = await RentalRequest.findOne({
    listing: listing._id,
    status: { $in: ["approved", "pending"] },
    paymentStatus: { $ne: "paid" }, // already-paid ones are definite blocks
    $or: [
      // new request starts inside an existing window
      { startDate: { $lte: end }, endDate: { $gte: start } }
    ]
  });

  // Also check paid requests (definite blocks regardless of status)
  const paidOverlap = await RentalRequest.findOne({
    listing: listing._id,
    paymentStatus: "paid",
    startDate: { $lte: end },
    endDate: { $gte: start }
  });

  if (paidOverlap) {
    return res.status(409).json({
      message: "These dates are already booked. Please choose different dates."
    });
  }

  // Warn about pending/approved overlap but still allow (owner can reject)
  const hasPendingOverlap = !!overlapping;

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const dailyRate = listing.rentRates?.daily || 0;
  const rentalAmount = dailyRate * days;

  // Prevent the same renter from submitting duplicate active requests for this listing
  const existingRequest = await RentalRequest.findOne({
    listing: listing._id,
    renter: req.user._id,
    status: { $in: ["pending", "approved"] }
  });
  if (existingRequest) {
    return res.status(409).json({
      message: "You already have an active request for this listing.",
      existingRequestId: existingRequest._id
    });
  }

  const rentalRequest = await RentalRequest.create({
    listing: listing._id,
    renter: req.user._id,
    owner: listing.owner,
    startDate: start,
    endDate: end,
    rentalAmount,
    damageDeposit: listing.damageDeposit || 0,
    message: message || ""
  });

  await createNotification({
    user: listing.owner,
    type: "booking_request",
    title: "New rental request",
    body: `${req.user.name} wants to rent "${listing.title}".`,
    data: { rentalRequestId: rentalRequest._id, listingId: listing._id }
  });

  const populated = await rentalRequest.populate([
    { path: "listing", select: "title photos category rentRates" },
    { path: "renter owner", select: "name avatar" }
  ]);

  res.status(201).json({ request: populated, hasPendingOverlap });
}));

// ── PATCH owner approves or rejects ─────────────────────────────────────────
router.patch("/:id/respond", asyncHandler(async (req, res) => {
  const { action } = req.body; // "approve" | "reject"
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
  }

  const request = await RentalRequest.findById(req.params.id).populate("listing", "title");
  if (!request) return res.status(404).json({ message: "Rental request not found" });
  if (!request.owner.equals(req.user._id)) {
    return res.status(403).json({ message: "Only the owner can respond to rental requests" });
  }
  if (request.status !== "pending") {
    return res.status(400).json({ message: `Request is already ${request.status}` });
  }

  request.status = action === "approve" ? "approved" : "rejected";
  await request.save();

  await createNotification({
    user: request.renter,
    type: "booking_request",
    title: `Rental request ${request.status}`,
    body: `Your request for "${request.listing?.title}" was ${request.status}.`,
    data: { rentalRequestId: request._id }
  });

  res.json({ request });
}));

// ── PATCH renter cancels their own pending request ───────────────────────────
router.patch("/:id/cancel", asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Rental request not found" });
  if (!request.renter.equals(req.user._id)) {
    return res.status(403).json({ message: "Only the renter can cancel this request" });
  }
  if (!["pending", "approved"].includes(request.status)) {
    return res.status(400).json({ message: "Cannot cancel a request that is already " + request.status });
  }

  request.status = "cancelled";
  await request.save();
  res.json({ request });
}));

module.exports = router;
