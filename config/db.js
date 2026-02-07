const mongoose = require("mongoose");
const dotenv = require("dotenv");
const logger = require("../utils/logger");
const profiler = require("../utils/profiler");

// Load environment variables from .env
dotenv.config();

async function connectDB() {
  profiler.mark("connectDB_total");
  let uri = process.env.DB_CONNECTION;
  const dbName = process.env.DB_NAME;

  if (!uri) {
    logger.warn("DB_CONNECTION is not set; skipping MongoDB connection.");
    return;
  }

  // Remove appName from URI if present (it can cause issues)
  // We'll use the base connection string instead
  uri = uri.split("?")[0]; // Remove query parameters

  try {
    profiler.mark("connectDB_mongoose_connect");
    await mongoose.connect(uri, {
      dbName,
    });
    profiler.measure("connectDB_mongoose_connect");
    logger.info(`MongoDB connected${dbName ? ` to database "${dbName}"` : ""}`);
    profiler.measure("connectDB_total");
  } catch (err) {
    profiler.measure("connectDB_total");
    logger.error("MongoDB connection error", { message: err.message });
  }
}

module.exports = connectDB;
