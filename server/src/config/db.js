const mongoose = require("mongoose");
const { env } = require("./env");

async function connectDB() {
  mongoose.set("strictQuery", true);

  const connection = await mongoose.connect(env.mongoUri);
  console.log(`MongoDB connected: ${connection.connection.host}`);
}

module.exports = connectDB;
module.exports.connectDB = connectDB;

