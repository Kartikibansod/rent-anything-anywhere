const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    lastMessage: {
      type: String,
      default: ""
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index to prevent duplicate chats for same listing between same users
chatSchema.index({ listingId: 1, buyerId: 1, sellerId: 1 }, { unique: true });

// Virtual for messages
chatSchema.virtual("messages", {
  ref: "Message",
  localField: "_id",
  foreignField: "chatId"
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = { Chat };