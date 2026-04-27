const express = require("express");
const Stripe = require("stripe");
const { authenticate } = require("../middleware/auth");
const { env } = require("../config/env");
const { Transaction } = require("../models/Transaction");
const { Listing } = require("../models/Listing");
const { PriceHistory } = require("../models/PriceHistory");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
const stripe = env.stripe.secretKey ? new Stripe(env.stripe.secretKey) : null;

function ensureVerifiedForPayments(req, res) {
  const user = req.user;
  const studentOk = user.userType !== "student" || user.verification?.status === "approved";
  const ok = user.isEmailVerified && user.profileCompleted && studentOk;
  if (!ok) {
    res.status(403).json({ message: "Verify your account to buy" });
    return false;
  }
  return true;
}

router.post("/payments/create-intent", authenticate, asyncHandler(async (req, res) => {
  if (!ensureVerifiedForPayments(req, res)) return;
  const { listingId, amount, currency = "inr", paymentMethod = "upi" } = req.body;
  const normalizedAmount = Number(amount);
  const amountInSmallestUnit = Math.round(normalizedAmount * 100);

  if (!stripe) return res.status(500).json({ message: "Stripe is not configured on the server" });
  if (!listingId || !normalizedAmount || amountInSmallestUnit <= 0) return res.status(400).json({ message: "Valid listingId and amount are required" });

  const listing = await Listing.findById(listingId);
  if (!listing) return res.status(404).json({ message: "Listing not found" });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInSmallestUnit,
    currency: currency.toLowerCase(),
    payment_method_types: paymentMethod === "upi" ? ["upi", "card"] : ["card"],
    metadata: { listingId: String(listingId), buyerId: String(req.user._id) }
  });

  const tx = await Transaction.create({
    buyer: req.user._id,
    seller: listing.owner,
    listing: listing._id,
    amount: normalizedAmount,
    type: listing.type === "rent" ? "rental" : "purchase",
    paymentMethod: "online",
    status: "pending",
    stripePaymentIntentId: paymentIntent.id
  });

  res.json({ clientSecret: paymentIntent.client_secret, transactionId: tx._id });
}));

router.post("/payments/cash-confirm", authenticate, asyncHandler(async (req, res) => {
  if (!ensureVerifiedForPayments(req, res)) return;
  const tx = await Transaction.findById(req.body.transactionId);
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  if (String(tx.buyer) === String(req.user._id)) tx.cashConfirmations.buyer = true;
  if (String(tx.seller) === String(req.user._id)) tx.cashConfirmations.seller = true;
  if (tx.cashConfirmations.buyer && tx.cashConfirmations.seller) tx.status = "completed";
  await tx.save();
  res.json({ transaction: tx });
}));

router.post("/payments/webhook", express.raw({ type: "application/json" }), asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!stripe || !signature || !env.stripe.webhookSecret) return res.status(400).json({ message: "Missing webhook signature configuration" });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripe.webhookSecret);
  } catch (error) {
    return res.status(400).json({ message: `Webhook Error: ${error.message}` });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const tx = await Transaction.findOneAndUpdate({ stripePaymentIntentId: paymentIntent.id }, { status: "completed" }, { new: true }).populate("listing");
    if (tx?.listing) {
      tx.listing.status = tx.listing.type === "rent" ? "rented" : "sold";
      await tx.listing.save();
      await PriceHistory.create({
        listing: tx.listing._id,
        category: tx.listing.category,
        condition: tx.listing.condition,
        finalPrice: tx.amount,
        soldAt: new Date()
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    await Transaction.findOneAndUpdate({ stripePaymentIntentId: paymentIntent.id }, { status: "failed" });
  }

  res.json({ received: true });
}));

module.exports = router;
