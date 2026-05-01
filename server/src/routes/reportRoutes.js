const express = require("express");
const { Report } = require("../models/Report");
const { Listing } = require("../models/Listing");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticate);

router.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const reports = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 });
    res.json({ reports });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const type = req.body.type || req.body.targetType;
    const isUserReport = type === "user";
    const reported =
      req.body.reported ||
      req.body.targetUser ||
      req.body.targetListing;

    if (!["user", "listing"].includes(type) || !reported || !req.body.reason) {
      return res.status(400).json({ message: "type, reported target, and reason are required" });
    }

    const report = await Report.create({
      reporter: req.user._id,
      type,
      reported,
      typeRef: isUserReport ? "User" : "Listing",
      reason: req.body.reason,
      description: req.body.description
    });
    if (!isUserReport) {
      const count = await Report.countDocuments({ type: "listing", reported, status: "pending" });
      if (count >= 3) {
        await Listing.findByIdAndUpdate(reported, {
          status: "inactive",
          "moderation.isFlagged": true,
          "moderation.state": "under_review"
        });
      }
    }
    res.status(201).json({ report });
  })
);

module.exports = router;
