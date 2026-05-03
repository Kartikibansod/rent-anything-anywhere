const app = require("../server/src/app");
const { connectDB } = require("../server/src/config/db");

let dbReady;

module.exports = async function handler(req, res) {
  if (req.url === "/health" || req.url === "/api/health" || req.url === "/api/auth/config") {
    return app(req, res);
  }

  try {
    if (!dbReady) {
      dbReady = connectDB();
    }
    await dbReady;
  } catch (error) {
    dbReady = undefined;
    return res.status(503).json({ message: "Database connection failed" });
  }

  return app(req, res);
};
