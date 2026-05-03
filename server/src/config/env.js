const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5001,
  serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5001}`,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  // ✅ FIXED: No local fallback
  mongoUri: process.env.MONGO_URI,

  jwtSecret: process.env.JWT_SECRET || "dev_rent_anything_anywhere_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM
  },

  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phone: process.env.TWILIO_PHONE
  },

  turn: {
    url: process.env.TURN_SERVER_URL,
    username: process.env.TURN_SERVER_USERNAME,
    credential: process.env.TURN_SERVER_CREDENTIAL
  }
};

function smtpConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function assertRequiredEnv() {
  const missing = [];
  if (!env.mongoUri) missing.push("MONGO_URI");
  if (!env.jwtSecret) missing.push("JWT_SECRET");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

module.exports = env;
module.exports.env = env;
module.exports.assertRequiredEnv = assertRequiredEnv;
module.exports.PORT = env.port;
module.exports.smtpConfigured = smtpConfigured;

module.exports.hasUsableGoogleCredentials = function hasUsableGoogleCredentials() {
  const clientId = String(env.google.clientId || "").trim();
  const clientSecret = String(env.google.clientSecret || "").trim();

  return Boolean(
    clientId &&
    clientSecret &&
    !clientId.includes("*") &&
    !clientSecret.includes("*") &&
    !clientId.includes("your_") &&
    !clientSecret.includes("your_")
  );
};
