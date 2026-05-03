const crypto = require("node:crypto");
const express = require("express");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const { authenticate, authorize } = require("../middleware/auth");
const { env } = require("../config/env");
const { Transaction } = require("../models/Transaction");
const { Listing } = require("../models/Listing");
const { PriceHistory } = require("../models/PriceHistory");
const { CashMeetupRequest } = require("../models/CashMeetupRequest");
const { Chat } = require("../models/Chat");
const { Message } = require("../models/Message");
const { createNotification } = require("../services/notificationService");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

function hasRealStripeKey(key = "") {
  return /^sk_(test|live)_[A-Za-z0-9]/.test(key) && !key.includes("your_key_here");
}

function hasRealStripePublishableKey(key = "") {
  return /^pk_(test|live)_[A-Za-z0-9]/.test(key) && !key.includes("your_key_here");
}

function hasRealStripeWebhookSecret(key = "") {
  return /^whsec_[A-Za-z0-9]/.test(key) && !key.includes("your_key_here");
}

const stripe = hasRealStripeKey(env.stripe.secretKey) ? new Stripe(env.stripe.secretKey) : null;

function assertObjectId(id, label = "id") {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(`Invalid ${label}`);
    error.statusCode = 400;
    throw error;
  }
}

function calculateListingAmount(listing) {
  const amount = listing.type === "rent"
    ? Number(listing.rentRates?.daily || listing.rentRates?.weekly || listing.rentRates?.monthly || 0)
    : Number(listing.askingPrice || 0);
  if (!amount || amount <= 0) {
    const error = new Error("Listing does not have a valid payable amount");
    error.statusCode = 400;
    throw error;
  }
  return amount;
}

function ensureVerifiedForPayments(req, res) {
  return true;
}

async function getPayableListing(req) {
  const { listingId } = req.body;
  assertObjectId(listingId, "listingId");

  const listing = await Listing.findById(listingId);
  if (!listing) {
    const error = new Error("Listing not found");
    error.statusCode = 404;
    throw error;
  }
  if (listing.status !== "active") {
    const error = new Error("This listing is not available for payment");
    error.statusCode = 409;
    throw error;
  }
  if (String(listing.owner) === String(req.user._id)) {
    const error = new Error("You cannot pay for your own listing");
    error.statusCode = 403;
    throw error;
  }

  const existing = await Transaction.findOne({
    buyer: req.user._id,
    listing: listing._id,
    status: { $in: ["pending", "awaiting_confirmation", "paid", "completed"] }
  });
  if (existing) {
    const error = new Error("A payment or handoff flow already exists for this listing");
    error.statusCode = 409;
    throw error;
  }

  return listing;
}

async function completeTransaction(tx) {
  const wasPending = tx.status === "pending";
  tx.status = "held";
  await tx.save();
  if (wasPending) {
    const listing = await Listing.findById(tx.listing).select("title");
    await notify(tx.seller, "Online payment successful", `${tx.buyer?.name || "Buyer"} has paid INR ${tx.amount} for ${listing?.title || "your item"}. Payment is held in escrow until buyer confirms receipt.`, {
      transactionId: tx._id,
      listingId: tx.listing,
      actionUrl: `${env.clientUrl}/my-deals`
    }, "payment_confirmation", `Payment received for ${listing?.title || "item"}!`);
  }
}

async function releaseTransaction(tx) {
  tx.status = "released";
  tx.releasedAt = new Date();
  await tx.save();
  const listing = await Listing.findById(tx.listing);
  if (listing && listing.status === "active") {
    listing.status = listing.type === "rent" ? "rented" : "sold";
    await listing.save();
    await PriceHistory.create({
      listing: listing._id,
      category: listing.category,
      condition: listing.condition,
      finalPrice: tx.amount,
      soldAt: new Date()
    });
  }
  await notify(tx.buyer, "Payment released", "Thanks for confirming receipt. Your seller has been notified.", { transactionId: tx._id, actionUrl: `${env.clientUrl}/my-deals` }, "payment_confirmation");
  await notify(tx.seller, "Item marked as received", `Buyer has confirmed receipt. Your payment of INR ${tx.amount} has been released.`, { transactionId: tx._id, actionUrl: `${env.clientUrl}/my-deals` }, "payment_confirmation", `Payment released for ${listing?.title || "item"}!`);
}

async function notify(user, title, message, data = {}, type = "cash_meetup", subject) {
  await createNotification({ user, type, title, message, data, subject });
}

router.get("/payments/config", (req, res) => {
  res.json({
    stripeConfigured: Boolean(stripe),
    stripePublishableKeyConfigured: hasRealStripePublishableKey(env.stripe.publishableKey),
    stripeWebhookConfigured: hasRealStripeWebhookSecret(env.stripe.webhookSecret),
    upiFallbackEnabled: true,
    currency: "inr"
  });
});

router.post("/payments/create-intent", authenticate, asyncHandler(async (req, res) => {
  if (!ensureVerifiedForPayments(req, res)) return;
  if (!stripe) return res.status(503).json({ message: "Stripe is not configured. Use UPI fallback or Cash on meetup." });

  const method = req.body.payment_method_type === "upi" ? "upi" : "card";
  const listing = await getPayableListing(req);
  const amount = calculateListingAmount(listing);
  const amountInSmallestUnit = Math.round(amount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInSmallestUnit,
    currency: "inr",
    payment_method_types: [method],
    capture_method: method === "upi" ? "automatic" : "manual",
    metadata: {
      listingId: String(listing._id),
      buyerId: String(req.user._id),
      sellerId: String(listing.owner)
    }
  });

  const tx = await Transaction.create({
    buyer: req.user._id,
    seller: listing.owner,
    listing: listing._id,
    amount,
    currency: "inr",
    type: listing.type === "rent" ? "rental" : "purchase",
    paymentMethod: method,
    status: "pending",
    stripePaymentIntentId: paymentIntent.id
  });

  res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id, transactionId: tx._id, amount, currency: "inr" });
}));

router.get("/payments/status/:transactionId", authenticate, asyncHandler(async (req, res) => {
  assertObjectId(req.params.transactionId, "transactionId");
  const tx = await Transaction.findById(req.params.transactionId);
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  if (![String(tx.buyer), String(tx.seller)].includes(String(req.user._id))) {
    return res.status(403).json({ message: "You are not part of this transaction" });
  }

  if (stripe && tx.stripePaymentIntentId && tx.status === "pending") {
    const paymentIntent = await stripe.paymentIntents.retrieve(tx.stripePaymentIntentId);
    if (paymentIntent.status === "requires_capture") await completeTransaction(tx);
    if (paymentIntent.status === "succeeded") {
      await completeTransaction(tx);
    }
    if (paymentIntent.status === "requires_payment_method" && paymentIntent.last_payment_error) {
      tx.status = "failed";
      await tx.save();
    }
  }

  res.json({ transaction: tx });
}));

router.post("/payments/capture", authenticate, asyncHandler(async (req, res) => {
  const id = req.body.transactionId || req.body.paymentIntentId;
  const tx = mongoose.isValidObjectId(id)
    ? await Transaction.findById(id)
    : await Transaction.findOne({ stripePaymentIntentId: id });
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  if (String(tx.buyer) !== String(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the buyer can confirm receipt" });
  }
  if (tx.paymentMethod === "upi" && tx.status === "held") {
    return res.json({ transaction: tx });
  }
  if (stripe && tx.paymentMethod === "card" && tx.stripePaymentIntentId && tx.status === "held") {
    await stripe.paymentIntents.capture(tx.stripePaymentIntentId);
  }
  await releaseTransaction(tx);
  res.json({ transaction: tx });
}));

router.post("/payments/refund", authenticate, asyncHandler(async (req, res) => {
  const id = req.body.transactionId || req.body.paymentIntentId;
  const tx = mongoose.isValidObjectId(id)
    ? await Transaction.findById(id)
    : await Transaction.findOne({ stripePaymentIntentId: id });
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  if (String(tx.buyer) !== String(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only buyer or admin can request refund" });
  }
  if (stripe && tx.stripePaymentIntentId) {
    await stripe.refunds.create({ payment_intent: tx.stripePaymentIntentId });
  }
  tx.status = "refunded";
  tx.refundedAt = new Date();
  await tx.save();
  res.json({ transaction: tx });
}));

router.post("/payments/upi", authenticate, asyncHandler(async (req, res) => {
  if (!ensureVerifiedForPayments(req, res)) return;
  const listing = await getPayableListing(req);
  const amount = calculateListingAmount(listing);
  const vpa = env.upi.vpa;
  if (!vpa) return res.status(503).json({ message: "UPI payment is not configured." });
  const reference = `RAA-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const name = encodeURIComponent("Rent Anything Anywhere");
  const note = encodeURIComponent(`${listing.title} ${reference}`.slice(0, 80));
  const deepLink = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${name}&am=${amount.toFixed(2)}&cu=INR&tn=${note}`;

  const tx = await Transaction.create({
    buyer: req.user._id,
    seller: listing.owner,
    listing: listing._id,
    amount,
    currency: "inr",
    type: listing.type === "rent" ? "rental" : "purchase",
    paymentMethod: "upi",
    status: "awaiting_confirmation",
    upi: { vpa, deepLink, reference }
  });

  res.status(201).json({
    transactionId: tx._id,
    status: tx.status,
    amount,
    currency: "inr",
    upi: tx.upi,
    message: "Open your UPI app and pay. Payment remains awaiting confirmation until seller or admin verifies it."
  });
}));

router.post("/payments/cash", authenticate, asyncHandler(async (req, res) => {
  if (!ensureVerifiedForPayments(req, res)) return;
  const listing = await getPayableListing(req);
  const existing = await CashMeetupRequest.findOne({
    listing: listing._id,
    buyer: req.user._id,
    status: { $in: ["pending", "accepted"] }
  });
  if (existing) return res.status(409).json({ message: "Cash meetup request already exists for this listing" });

  const request = await CashMeetupRequest.create({
    listing: listing._id,
    buyer: req.user._id,
    seller: listing.owner,
    status: "pending"
  });

  const price = calculateListingAmount(listing);
  await notify(listing.owner, "Cash meetup request", `Hi seller, ${req.user.name} wants to buy ${listing.title} for INR ${price} via cash meetup. Click here to accept or decline.`, {
    requestId: request._id,
    listingId: listing._id,
    actionUrl: `${env.clientUrl}/my-deals`
  }, "cash_meetup", `${req.user.name} wants cash meetup for ${listing.title}`);

  res.status(201).json({
    request,
    message: "Request sent! Waiting for seller to accept."
  });
}));

router.get("/cash-meetups/my", authenticate, asyncHandler(async (req, res) => {
  const requests = await CashMeetupRequest.find({
    $or: [{ buyer: req.user._id }, { seller: req.user._id }]
  })
    .populate("listing", "title category photos askingPrice rentRates type")
    .populate("buyer seller", "name email")
    .sort({ updatedAt: -1 });
  res.json({ requests });
}));

router.patch("/cash-meetups/:requestId/status", authenticate, asyncHandler(async (req, res) => {
  assertObjectId(req.params.requestId, "requestId");
  const request = await CashMeetupRequest.findById(req.params.requestId).populate("listing");
  if (!request) return res.status(404).json({ message: "Cash meetup request not found" });
  if (String(request.seller) !== String(req.user._id)) return res.status(403).json({ message: "Only seller can accept or decline" });
  if (request.status !== "pending") return res.status(409).json({ message: "Request is no longer pending" });

  const action = req.body.action;
  if (action === "reject") {
    request.status = "rejected";
    await request.save();
    await notify(request.buyer, "Cash meetup declined", `Hi buyer, seller has declined the cash meetup. Please choose another payment method.`, { requestId: request._id, actionUrl: `${env.clientUrl}/checkout/${request.listing._id}` }, "cash_meetup", `Cash meetup request for ${request.listing.title}`);
    return res.json({ request });
  }
  if (action !== "accept") return res.status(400).json({ message: "Invalid action" });

  const chat = await Chat.findOneAndUpdate(
    { listingId: request.listing._id, buyerId: request.buyer, sellerId: request.seller },
    {
      listingId: request.listing._id,
      buyerId: request.buyer,
      sellerId: request.seller,
      lastMessage: `Cash meetup agreed for ${request.listing.title}`,
      lastMessageAt: new Date()
    },
    { upsert: true, new: true }
  );
  request.status = "accepted";
  request.chatRoomId = chat._id;
  await request.save();
  const sorted = [String(request.buyer), String(request.seller)].sort();
  const conversationId = `${sorted[0]}:${sorted[1]}:${request.listing._id}`;
  await Message.create({
    conversationId,
    sender: request.seller,
    receiver: request.buyer,
    listing: request.listing._id,
    type: "system",
    content: `Cash meetup agreed for ${request.listing.title}`
  });
  await notify(request.buyer, "Cash meetup accepted!", `Hi buyer, seller has accepted your cash meetup request for ${request.listing.title}. Open the app to arrange the meetup.`, { requestId: request._id, chatId: chat._id, actionUrl: `${env.clientUrl}/chat?with=${request.seller}&listing=${request.listing._id}` }, "cash_meetup", `Cash meetup accepted for ${request.listing.title}!`);
  await notify(request.seller, "Cash meetup accepted!", `Cash meetup agreed for ${request.listing.title}.`, { requestId: request._id, chatId: chat._id, actionUrl: `${env.clientUrl}/chat?with=${request.buyer}&listing=${request.listing._id}` });
  res.json({ request });
}));

router.patch("/cash-meetups/:requestId/confirm", authenticate, asyncHandler(async (req, res) => {
  assertObjectId(req.params.requestId, "requestId");
  const request = await CashMeetupRequest.findById(req.params.requestId).populate("listing");
  if (!request) return res.status(404).json({ message: "Cash meetup request not found" });
  if (request.status !== "accepted") return res.status(409).json({ message: "Seller must accept before handoff confirmation" });
  if (![String(request.buyer), String(request.seller)].includes(String(req.user._id))) {
    return res.status(403).json({ message: "You are not part of this request" });
  }

  if (String(request.buyer) === String(req.user._id)) request.buyerConfirmed = true;
  if (String(request.seller) === String(req.user._id)) request.sellerConfirmed = true;
  if (request.buyerConfirmed && request.sellerConfirmed) {
    request.status = "completed";
    if (request.listing?.status === "active") {
      request.listing.status = request.listing.type === "rent" ? "rented" : "sold";
      await request.listing.save();
    }
    await notify(request.buyer, "Cash meetup completed", `Cash meetup completed for ${request.listing.title}.`, { requestId: request._id, listingId: request.listing._id, actionUrl: `${env.clientUrl}/my-deals` });
    await notify(request.seller, "Cash meetup completed", `Cash meetup completed for ${request.listing.title}.`, { requestId: request._id, listingId: request.listing._id, actionUrl: `${env.clientUrl}/my-deals` });
  }
  await request.save();
  res.json({ request });
}));

router.post("/payments/:transactionId/confirm-handoff", authenticate, asyncHandler(async (req, res) => {
  assertObjectId(req.params.transactionId, "transactionId");
  const tx = await Transaction.findById(req.params.transactionId);
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  if (![String(tx.buyer), String(tx.seller)].includes(String(req.user._id))) {
    return res.status(403).json({ message: "You are not part of this transaction" });
  }
  if (!["cash", "upi"].includes(tx.paymentMethod)) {
    return res.status(400).json({ message: "Handoff confirmation is only for cash or UPI fallback payments" });
  }

  if (String(tx.buyer) === String(req.user._id)) tx.cashConfirmations.buyer = true;
  if (String(tx.seller) === String(req.user._id)) tx.cashConfirmations.seller = true;
  if (tx.cashConfirmations.buyer && tx.cashConfirmations.seller) {
    tx.status = "completed";
    const listing = await Listing.findById(tx.listing);
    if (listing && listing.status === "active") {
      listing.status = listing.type === "rent" ? "rented" : "sold";
      await listing.save();
    }
    await notify(tx.buyer, "Meetup payment completed", "Meetup payment completed.", { transactionId: tx._id, actionUrl: `${env.clientUrl}/my-deals` }, "payment_confirmation");
    await notify(tx.seller, "Meetup payment completed", "Meetup payment completed.", { transactionId: tx._id, actionUrl: `${env.clientUrl}/my-deals` }, "payment_confirmation");
  }
  await tx.save();
  res.json({ transaction: tx });
}));

router.post("/payments/:transactionId/admin-mark-paid", authenticate, authorize("admin"), asyncHandler(async (req, res) => {
  assertObjectId(req.params.transactionId, "transactionId");
  const tx = await Transaction.findById(req.params.transactionId);
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  if (tx.paymentMethod !== "upi") return res.status(400).json({ message: "Only UPI fallback payments can be manually marked paid" });
  await completeTransaction(tx);
  res.json({ transaction: tx });
}));

router.post("/payments/webhook", express.raw({ type: "application/json" }), asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!stripe || !signature || !hasRealStripeWebhookSecret(env.stripe.webhookSecret)) {
    return res.status(400).json({ message: "Missing Stripe webhook configuration" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripe.webhookSecret);
  } catch (error) {
    return res.status(400).json({ message: `Webhook Error: ${error.message}` });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const tx = await Transaction.findOne({ stripePaymentIntentId: paymentIntent.id });
    if (tx && !["released", "completed"].includes(tx.status)) await completeTransaction(tx);
  }

  if (event.type === "payment_intent.amount_capturable_updated") {
    const paymentIntent = event.data.object;
    const tx = await Transaction.findOne({ stripePaymentIntentId: paymentIntent.id });
    if (tx && tx.status === "pending") await completeTransaction(tx);
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    await Transaction.findOneAndUpdate({ stripePaymentIntentId: paymentIntent.id }, { status: "failed" });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    await Transaction.findOneAndUpdate({ stripePaymentIntentId: charge.payment_intent }, { status: "refunded" });
  }

  res.json({ received: true });
}));

module.exports = router;
