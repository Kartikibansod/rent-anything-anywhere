const express = require("express");
const {
  login,
  me,
  register,
  uploadStudentVerification,
  googleAuth,
  updateMyLocation
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { Listing } = require("../models/Listing");
const { Transaction } = require("../models/Transaction");
const { User } = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/google", googleAuth);
authRouter.get("/me", authenticate, me);
authRouter.patch("/me/location", authenticate, updateMyLocation);

authRouter.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select("-password -phoneNumber");
    if (!user) return res.status(404).json({ message: "User not found" });

    const [activeListings, pastTransactions] = await Promise.all([
      Listing.find({ owner: user._id, status: "active" }).sort({ createdAt: -1 }),
      Transaction.find({ $or: [{ buyer: user._id }, { seller: user._id }] })
        .populate("listing")
        .sort({ createdAt: -1 })
        .limit(20)
    ]);

    res.json({ user, activeListings: activeListings ?? [], pastTransactions: pastTransactions ?? [] });
  })
);

authRouter.post(
  "/student-verification",
  authenticate,
  upload.single("collegeId"),
  uploadStudentVerification
);

module.exports = authRouter;

