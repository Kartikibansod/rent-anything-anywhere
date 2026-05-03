const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");
const setupSocket = require("./socket");
const http = require("http");
const { Server } = require("socket.io");
const { notifyExpiringListings } = require("./services/notificationService");

const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

// Setup socket handlers
setupSocket(io);

// Connect to database and start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io ready`);
    });
    notifyExpiringListings().catch((error) => console.error("Expiry notification check failed:", error.message));
    setInterval(() => {
      notifyExpiringListings().catch((error) => console.error("Expiry notification check failed:", error.message));
    }, 24 * 60 * 60 * 1000);
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

module.exports = { app, io };
