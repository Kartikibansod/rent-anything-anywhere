const { Chat } = require("../models/Chat");
const { Message } = require("../models/Message");
const { asyncHandler } = require("../utils/asyncHandler");

// Get or create chat for a specific listing
const getOrCreateChat = asyncHandler(async (req, res) => {
  const { listingId, sellerId } = req.body;
  const buyerId = req.user.id;

  // Check if chat already exists
  let chat = await Chat.findOne({
    listingId,
    buyerId,
    sellerId
  });

  if (!chat) {
    // Create new chat
    chat = await Chat.create({
      listingId,
      buyerId,
      sellerId
    });
  }

  // Populate chat with listing and user details
  chat = await Chat.findById(chat._id)
    .populate("listingId", "title price images")
    .populate("buyerId", "name avatar")
    .populate("sellerId", "name avatar");

  res.status(200).json({
    success: true,
    data: chat
  });
});

// Get all chats for current user
const getUserChats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const chats = await Chat.find({
    $or: [{ buyerId: userId }, { sellerId: userId }]
  })
    .sort({ lastMessageAt: -1 })
    .populate("listingId", "title price images")
    .populate("buyerId", "name avatar")
    .populate("sellerId", "name avatar");

  res.status(200).json({
    success: true,
    data: chats
  });
});

// Get messages for a specific chat
const getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const messages = await Message.find({ chatId })
    .sort({ createdAt: 1 })
    .populate("senderId", "name avatar");

  res.status(200).json({
    success: true,
    data: messages
  });
});

// Mark messages as read
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  await Message.updateMany(
    {
      chatId,
      senderId: { $ne: userId },
      read: false
    },
    { read: true }
  );

  res.status(200).json({
    success: true,
    message: "Messages marked as read"
  });
});

module.exports = {
  getOrCreateChat,
  getUserChats,
  getChatMessages,
  markMessagesAsRead
};