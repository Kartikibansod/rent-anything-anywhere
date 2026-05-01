const { v2: cloudinary } = require("cloudinary");
const { env } = require("./env");

cloudinary.config({
  cloud_name: String(env.cloudinary.cloudName || "").trim(),
  api_key: String(env.cloudinary.apiKey || "").trim(),
  api_secret: String(env.cloudinary.apiSecret || "").trim()
});

module.exports = cloudinary;
module.exports.cloudinary = cloudinary;
