const express = require("express");
const { authenticate } = require("../middleware/auth");
const { estimatePrice } = require("../services/aiService");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
const grokKeyPrefix = process.env.GROK_API_KEY?.trim()?.slice(0, 8) || "missing";
console.log("Grok key prefix:", grokKeyPrefix);
const key = process.env.GROK_API_KEY?.trim();
console.log("Grok key starts with:", key?.slice(0, 6));

router.get("/config", (req, res) => {
  const apiKey = process.env.GROK_API_KEY?.trim() || "";
  const grokConfigured = Boolean(apiKey && apiKey.startsWith("xai-"));
  res.json({
    grokConfigured,
    message: grokConfigured || !apiKey ? "" : "Grok API key invalid. Key must start with xai-. Get correct key from console.x.ai"
  });
});

router.post("/estimate-price", authenticate, asyncHandler(async (req, res) => {
  const key = process.env.GROK_API_KEY?.trim();
  if (!key?.startsWith("xai-")) {
    return res.status(503).json({ message: "Grok API key invalid. Key must start with xai-. Get correct key from console.x.ai" });
  }
  const result = await estimatePrice(req.body);
  res.json(result);
}));

module.exports = router;
