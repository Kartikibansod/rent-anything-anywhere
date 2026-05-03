import { io } from "socket.io-client";
import { APP_BASE_URL, api } from "./api.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || APP_BASE_URL;

let socket = null;

export const initSocket = async () => {
  if (socket) {
    return socket;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  socket = io(SOCKET_URL, {
    auth: {
      token
    },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on("connect", () => {
    if (import.meta.env.DEV) console.log("Socket connected:", socket.id);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
  });

  socket.on("disconnect", (reason) => {
    if (import.meta.env.DEV) console.log("Socket disconnected:", reason);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket not initialized. Call initSocket() first.");
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const closeSocket = disconnectSocket;

// Join user's personal room
export const joinUserRoom = (userId) => {
  const socketInstance = getSocket();
  socketInstance.emit("join-room", userId);
};

// Join a chat room
export const joinChatRoom = (conversationId) => {
  const socketInstance = getSocket();
  socketInstance.emit("join-chat", { conversationId });
};
export const leaveChatRoom = (conversationId) => {
  const socketInstance = getSocket();
  socketInstance.emit("leave-chat", { conversationId });
};

export const sendMessage = ({ receiverId, message, listingId, conversationId }) => {
  const socketInstance = getSocket();
  socketInstance.emit("send-message", { receiverId, message, listingId, conversationId });
};

// Mark messages as read
export const markMessagesAsRead = (chatId, userId) => {
  const socketInstance = getSocket();
  socketInstance.emit("messages-read", { chatId, userId });
};

// Send typing indicator
export const sendTypingIndicator = (chatId, userId, isTyping) => {
  const socketInstance = getSocket();
  socketInstance.emit("typing", { chatId, userId, isTyping });
};

// Get or create chat for a listing
export const getOrCreateChat = async ({ listingId, sellerId }) => {
  return { listingId, sellerId };
};

// Get all chats for current user
export const getChats = async () => {
  const { data } = await api.get("/messages");
  return data.conversations || [];
};

export const getChatMessages = async (chatId) => {
  const { data } = await api.get(`/messages/${chatId}`);
  return data.messages || [];
};

export default {
  initSocket,
  getSocket,
  closeSocket,
  disconnectSocket,
  joinUserRoom,
  joinChatRoom,
  leaveChatRoom,
  sendMessage,
  markMessagesAsRead,
  sendTypingIndicator,
  getOrCreateChat,
  getChats,
  getChatMessages
};
