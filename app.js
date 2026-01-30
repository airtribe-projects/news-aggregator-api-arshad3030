const express = require("express");
const dotenv = require("dotenv");
const logger = require("./utils/logger");
const requestLogger = require("./middleware/requestLogger");

// Load environment variables from .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const userRoutes = require("./routes/userRoutes");
const newsRoutes = require("./routes/newsRoutes");
const connectDB = require("./config/db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware - logs all incoming requests and responses
app.use(requestLogger);

// Route mounting
app.use("/users", userRoutes);
app.use("/news", newsRoutes);

// Only start the server when this file is run directly, not when required by tests
if (require.main === module) {
  // Connect to MongoDB
  connectDB();

  app.listen(port, (err) => {
    if (err) {
      logger.error("Server startup failed", { error: err.message });
      return process.exit(1);
    }
    logger.info(`Server is listening on port ${port}`);
  });
}

module.exports = app;
