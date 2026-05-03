const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");
const { PORT, env, assertRequiredEnv } = require("./config/env");
const setupSocket = require("./socket");
const http = require("http");
const { Server } = require("socket.io");
const { notifyExpiringListings } = require("./services/notificationService");

const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || origin === env.clientUrl || env.nodeEnv !== "production") return callback(null, true);
      return callback(new Error("Socket CORS blocked"));
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

// Setup socket handlers
setupSocket(io);

// Connect to database and start server
assertRequiredEnv();
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io ready`);
    });

    notifyExpiringListings().catch((error) =>
      console.error("Expiry notification check failed:", error.message)
    );

    setInterval(() => {
      notifyExpiringListings().catch((error) =>
        console.error("Expiry notification check failed:", error.message)
      );
    }, 24 * 60 * 60 * 1000);
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

module.exports = { app, io };
