const cors = require("cors");
const express = require("express");
let mongoSanitize;
try {
  mongoSanitize = require("express-mongo-sanitize");
} catch {
  mongoSanitize = null;
}
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");
const passport = require("./config/passport");
const { env } = require("./config/env");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const adminRoutes = require("./routes/adminRoutes");
const authRouter = require("./routes/auth");
const bookingRoutes = require("./routes/bookingRoutes");
const listingRoutes = require("./routes/listingRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

function getAllowedOrigins() {
  const origins = new Set();
  if (env.clientUrl) origins.add(env.clientUrl);
  if (env.nodeEnv !== "production") {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
    origins.add("http://localhost:5174");
    origins.add("http://127.0.0.1:5174");
  }
  return origins;
}

function isLocalDevOrigin(origin = "") {
  if (env.nodeEnv === "production") return false;
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

function isAllowedOrigin(origin) {
  return !origin || getAllowedOrigins().has(origin) || isLocalDevOrigin(origin);
}

// Blocks Mongo operator injection in body/query/params while preserving normal values.
function sanitizeMongo(value) {
  if (!value || typeof value !== "object") return value;
  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }
    sanitizeMongo(value[key]);
  }
  return value;
}

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  }));
  app.use(passport.initialize());
  app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));
  if (mongoSanitize) app.use(mongoSanitize());
  app.use((req, res, next) => {
    sanitizeMongo(req.body);
    sanitizeMongo(req.query);
    sanitizeMongo(req.params);
    next();
  });
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  app.get("/health", (req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/listings", listingRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api", paymentRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

const app = createApp();

module.exports = app;
module.exports.createApp = createApp;
module.exports.isAllowedOrigin = isAllowedOrigin;
