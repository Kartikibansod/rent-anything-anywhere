const express = require("express");
const { authenticate } = require("../middleware/auth");
const { Message } = require("../models/Message");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const messages = await Message.find({
    $or: [{ sender: req.user._id }, { receiver: req.user._id }]
  }).sort({ createdAt: -1 });

  const grouped = Object.values(
    messages.reduce((acc, item) => {
      if (!acc[item.conversationId]) acc[item.conversationId] = item;
      return acc;
    }, {})
  );

  res.json({ conversations: grouped });
}));

router.get("/:conversationId", asyncHandler(async (req, res) => {
  const messages = await Message.find({ conversationId: req.params.conversationId })
    .populate("sender receiver", "name verification rating")
    .sort({ createdAt: 1 });
  res.json({ messages });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { receiverId, listingId, content, photos = [], type = "text" } = req.body;
  const sorted = [String(req.user._id), String(receiverId)].sort();
  const conversationId = `${sorted[0]}:${sorted[1]}:${listingId || "general"}`;

  const message = await Message.create({
    conversationId,
    sender: req.user._id,
    receiver: receiverId,
    listing: listingId,
    content,
    photos,
    type
  });
  res.status(201).json({ message });
}));

module.exports = router;