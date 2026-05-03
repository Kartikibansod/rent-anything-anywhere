const mongoose = require("mongoose");
const { env } = require("./env");

async function connectDB() {
  try {
    mongoose.set("strictQuery", true);

    // 🔍 DEBUG: check what URI is being used
    console.log("MONGO_URI:", env.mongoUri);

    const connection = await mongoose.connect(env.mongoUri);

    console.log("MongoDB Atlas Connected:", connection.connection.host);
  } catch (error) {
    console.error("DB connection error:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
module.exports.connectDB = connectDB;
