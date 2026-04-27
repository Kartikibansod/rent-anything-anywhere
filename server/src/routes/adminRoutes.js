const express = require("express");
const { User } = require("../models/User");
const { Booking } = require("../models/Booking");
const { Listing } = require("../models/Listing");
const { Report } = require("../models/Report");
const { Transaction } = require("../models/Transaction");
const { authenticate, authorize } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticate, authorize("admin"));

router.get(
  "/verifications",
  asyncHandler(async (req, res) => {
    const users = await User.find({
      userType: "student",
      "verification.status": "pending"
    }).sort({ createdAt: -1 });
    res.json({ users });
  })
);

router.put("/verifications/:userId/approve", asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { "verification.status": "approved", isVerified: true },
    { new: true }
  );
  res.json({ user });
}));

router.put("/verifications/:userId/reject", asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { "verification.status": "rejected", isVerified: false },
    { new: true }
  );
  res.json({ user });
}));

router.get(
  "/reports",
  asyncHandler(async (req, res) => {
    const reports = await Report.find()
      .populate("reporter reported")
      .sort({ createdAt: -1 });
    res.json({ reports });
  })
);

router.put(
  "/reports/:id/resolve",
  asyncHandler(async (req, res) => {
    const report = await Report.findByIdAndUpdate(req.params.id, { status: "resolved" }, { new: true });
    res.json({ report });
  })
);

router.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    );
    res.json({ user });
  })
);

router.patch(
  "/listings/:id",
  asyncHandler(async (req, res) => {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status || "removed" },
      { new: true }
    );
    res.json({ listing });
  })
);

router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const [users, listings, deals, transactionsByCategory] =
      await Promise.all([
        User.countDocuments(),
        Listing.countDocuments(),
        Transaction.countDocuments({ status: "completed" }),
        Transaction.aggregate([
          { $match: { status: "completed" } },
          { $lookup: { from: "listings", localField: "listing", foreignField: "_id", as: "listing" } },
          { $unwind: "$listing" },
          { $group: { _id: "$listing.category", total: { $sum: "$amount" } } }
        ])
      ]);

    const gmv = await Transaction.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      counts: { users, listings, deals },
      gmvByCategory: transactionsByCategory,
      gmv: gmv[0]?.total || 0
    });
  })
);

module.exports = router;

