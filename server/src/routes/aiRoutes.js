const express = require("express");
const { authenticate } = require("../middleware/auth");
const { estimatePrice, grokConfigured } = require("../services/aiService");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/config", (req, res) => {
  res.json({ grokConfigured: grokConfigured() });
});

router.post("/estimate-price", authenticate, asyncHandler(async (req, res) => {
  const result = await estimatePrice(req.body);
  res.json(result);
}));

module.exports = router;
