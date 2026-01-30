const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();
async function connectDB() {
  let uri = process.env.DB_CONNECTION;
  const dbName = process.env.DB_NAME;

  if (!uri) {
    console.warn('DB_CONNECTION is not set; skipping MongoDB connection.');
    return;
  }

  // Remove appName from URI if present (it can cause issues)
  // We'll use the base connection string instead
  uri = uri.split('?')[0]; // Remove query parameters

  try {
    await mongoose.connect(uri, {
      dbName,
    });
    console.log(`MongoDB connected${dbName ? ` to database "${dbName}"` : ''}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
}

module.exports = connectDB;


