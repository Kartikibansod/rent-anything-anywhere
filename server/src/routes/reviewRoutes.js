const express = require("express");
const {
  createReview,
  getSellerReviews,
  getListingReviews,
  checkReviewEligibility
} = require("../controllers/reviewController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create a review
router.post("/", createReview);

// Get reviews for a seller
router.get("/seller/:sellerId", getSellerReviews);

// Get reviews for a listing
router.get("/listing/:listingId", getListingReviews);

// Check review eligibility
router.get("/check/:transactionId", checkReviewEligibility);

module.exports = router;