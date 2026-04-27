const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });

const { Chat } = require("../models/Chat");
const { Message } = require("../models/Message");
const { User } = require("../models/User");
const { Listing } = require("../models/Listing");

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Add averageRating and totalReviews to users who don't have it
    const result = await User.updateMany(
      { averageRating: { $exists: false } },
      {
        $set: {
          averageRating: 0,
          totalReviews: 0,
          isStudent: false
        }
      }
    );
    console.log(`Updated ${result.modifiedCount} users with default rating fields`);

    // Find all unique conversations from existing messages and create Chat documents
    const messages = await Message.find({}).populate("senderId");
    
    // Group messages by conversation participants
    const conversations = new Map();
    
    for (const msg of messages) {
      if (!msg.senderId || !msg.listingId) continue;
      
      // Create a unique key for the conversation
      const listingId = msg.listingId.toString();
      const buyerId = msg.buyerId ? msg.buyerId.toString() : null;
      const sellerId = msg.sellerId ? msg.sellerId.toString() : null;
      
      if (!buyerId || !sellerId) continue;
      
      const key = `${listingId}_${buyerId}_${sellerId}`;
      
      if (!conversations.has(key)) {
        conversations.set(key, {
          listingId,
          buyerId,
          sellerId,
          messages: []
        });
      }
      
      conversations.get(key).messages.push(msg);
    }

    console.log(`Found ${conversations.size} unique conversations`);

    // Create Chat documents for each conversation
    let created = 0;
    for (const [key, conv] of conversations) {
      try {
        const existingChat = await Chat.findOne({
          listingId: conv.listingId,
          buyerId: conv.buyerId,
          sellerId: conv.sellerId
        });

        if (existingChat) {
          console.log(`Chat already exists for key: ${key}`);
          continue;
        }

        const lastMessage = conv.messages.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        )[0];

        await Chat.create({
          listingId: conv.listingId,
          buyerId: conv.buyerId,
          sellerId: conv.sellerId,
          lastMessage: lastMessage?.text || "",
          lastMessageAt: lastMessage?.createdAt || new Date()
        });

        created++;
        console.log(`Created chat for listing ${conv.listingId}`);
      } catch (err) {
        if (err.code === 11000) {
          console.log(`Duplicate chat skipped for key: ${key}`);
        } else {
          console.error(`Error creating chat for key ${key}:`, err.message);
        }
      }
    }

    console.log(`Migration complete. Created ${created} new chats.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
};

migrate();