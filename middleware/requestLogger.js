/**
 * Request logging middleware
 * Logs incoming requests and outgoing responses for debugging and monitoring
 */

const logger = require("../utils/logger");

/**
 * Middleware to log HTTP requests and responses
 * Tracks request duration, method, path, status code, and response size
 */
function requestLogger(req, res, next) {
  // Start timer
  const startTime = Date.now();

  // Store original send method to intercept response
  const originalSend = res.send;

  // Override send method to capture response details
  res.send = function (data) {
    // Calculate response time
    const duration = Date.now() - startTime;

    // Get response size in bytes
    const size = Buffer.byteLength(JSON.stringify(data) || "");

    // Determine log level based on status code
    const statusCode = res.statusCode;
    let logLevel = "info";
    if (statusCode >= 500) {
      logLevel = "error";
    } else if (statusCode >= 400) {
      logLevel = "warn";
    }

    // Log request details
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: statusCode,
      duration: `${duration}ms`,
      size: `${size}B`,
      userAgent: req.get("user-agent"),
      ip: req.ip || req.connection.remoteAddress,
      email: req.user?.email || "anonymous",
    };

    // Log based on level
    if (logLevel === "error") {
      logger.error(`${req.method} ${req.path}`, logData);
    } else if (logLevel === "warn") {
      logger.warn(`${req.method} ${req.path}`, logData);
    } else {
      logger.info(`${req.method} ${req.path}`, logData);
    }

    // Call original send
    return originalSend.call(this, data);
  };

  // Continue to next middleware
  next();
}

module.exports = requestLogger;
