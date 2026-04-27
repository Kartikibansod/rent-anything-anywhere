const express = require("express");
const { Booking } = require("../models/Booking");
const { Listing } = require("../models/Listing");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({
      $or: [{ owner: req.user._id }, { renter: req.user._id }]
    })
      .populate("listing")
      .populate("owner renter", "name avatar rating verification")
      .sort({ createdAt: -1 });

    res.json({ bookings });
  })
);

router.get(
  "/my",
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({
      $or: [{ owner: req.user._id }, { renter: req.user._id }]
    })
      .populate("listing")
      .populate("owner renter", "name avatar rating verification")
      .sort({ createdAt: -1 });

    res.json({ bookings });
  })
);

async function updateStatus(req, res, status, ownerOnly = false) {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (ownerOnly && !booking.owner.equals(req.user._id)) {
    return res.status(403).json({ message: "Only owner can perform this action" });
  }
  booking.status = status;
  await booking.save();
  return res.json({ booking });
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.body.listingId);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    const booking = await Booking.create({
      listing: listing._id,
      renter: req.user._id,
      owner: listing.owner,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      totalPrice: req.body.totalPrice,
      depositAmount: req.body.depositAmount || listing.damageDeposit || 0
    });
    res.status(201).json({ booking });
  })
);

router.put("/:id/approve", asyncHandler(async (req, res) => updateStatus(req, res, "approved", true)));
router.put("/:id/reject", asyncHandler(async (req, res) => updateStatus(req, res, "rejected", true)));
router.put("/:id/return", asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (!booking.renter.equals(req.user._id)) return res.status(403).json({ message: "Only renter can mark return" });
  booking.returnedByRenter = true;
  booking.status = "active";
  await booking.save();
  res.json({ booking });
}));
router.put("/:id/confirm-return", asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (!booking.owner.equals(req.user._id)) return res.status(403).json({ message: "Only owner can confirm return" });
  booking.status = "completed";
  booking.depositStatus = "released";
  await booking.save();
  res.json({ booking });
}));

module.exports = router;
