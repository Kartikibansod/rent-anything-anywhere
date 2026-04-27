const { Review } = require("../models/Review");
const { User } = require("../models/User");
const { Transaction } = require("../models/Transaction");
const { asyncHandler } = require("../utils/asyncHandler");

// Create a review
const createReview = asyncHandler(async (req, res) => {
  const { rating, reviewText, listingId, sellerId, transactionId } = req.body;
  const reviewerId = req.user.id;

  // Check if transaction exists and is completed
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found"
    });
  }

  if (transaction.status !== "completed") {
    return res.status(400).json({
      success: false,
      message: "Can only review completed transactions"
    });
  }

  // Check if user already reviewed this transaction
  const existingReview = await Review.findOne({
    reviewerId,
    transactionId
  });

  if (existingReview) {
    return res.status(400).json({
      success: false,
      message: "You have already reviewed this transaction"
    });
  }

  // Create review
  const review = await Review.create({
    reviewerId,
    listingId,
    sellerId,
    rating,
    reviewText,
    transactionId
  });

  // Update seller's average rating and total reviews
  const seller = await User.findById(sellerId);
  if (seller) {
    const newTotalReviews = seller.totalReviews + 1;
    const newAverageRating =
      (seller.averageRating * seller.totalReviews + rating) / newTotalReviews;

    await User.findByIdAndUpdate(sellerId, {
      totalReviews: newTotalReviews,
      averageRating: Math.round(newAverageRating * 100) / 100
    });
  }

  // Populate review with reviewer info
  await review.populate("reviewer", "name avatar");

  res.status(201).json({
    success: true,
    data: review
  });
});

// Get reviews for a seller
const getSellerReviews = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const reviews = await Review.find({ sellerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("reviewer", "name avatar")
    .populate("listingId", "title");

  const total = await Review.countDocuments({ sellerId });

  const seller = await User.findById(sellerId).select("averageRating totalReviews");

  res.status(200).json({
    success: true,
    data: {
      reviews,
      averageRating: seller?.averageRating || 0,
      totalReviews: seller?.totalReviews || 0,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

// Get reviews for a listing
const getListingReviews = asyncHandler(async (req, res) => {
  const { listingId } = req.params;

  const reviews = await Review.find({ listingId })
    .sort({ createdAt: -1 })
    .populate("reviewer", "name avatar");

  const total = await Review.countDocuments({ listingId });

  res.status(200).json({
    success: true,
    data: {
      reviews,
      totalReviews: total
    }
  });
});

// Check if user can review a transaction
const checkReviewEligibility = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const reviewerId = req.user.id;

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found"
    });
  }

  const existingReview = await Review.findOne({
    reviewerId,
    transactionId
  });

  res.status(200).json({
    success: true,
    data: {
      eligible: transaction.status === "completed" && !existingReview,
      alreadyReviewed: !!existingReview
    }
  });
});

module.exports = {
  createReview,
  getSellerReviews,
  getListingReviews,
  checkReviewEligibility
};