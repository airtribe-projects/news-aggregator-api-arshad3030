/**
 * Simple logging utility for the application
 * Provides consistent logging across all modules
 */

const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

const ENV = process.env.NODE_ENV || "development";
const DEBUG_MODE = ENV === "development";

/**
 * Format log message with timestamp and level
 * Safely serializes data with circular reference handling and type validation
 */
function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();

  // Type validation and coercion for message
  if (typeof message !== "string") {
    try {
      message = String(message);
    } catch {
      message = "[Invalid Message Type]";
    }
  }

  let dataStr = "";

  // Type validation for data
  if (data !== null && data !== undefined) {
    // Only process objects; convert primitives to string
    if (typeof data === "object") {
      try {
        // Use a Set to track circular references
        const seen = new Set();
        const sanitized = JSON.stringify(data, (key, value) => {
          // Handle circular references
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
              return "[Circular]";
            }
            seen.add(value);
          }
          return value;
        });
        dataStr = ` | ${sanitized}`;
      } catch (err) {
        // Fallback if serialization fails
        dataStr = ` | [Serialization Error: ${err.message}]`;
      }
    } else if (typeof data === "string") {
      // If data is already a string, use it directly
      dataStr = ` | ${data}`;
    } else {
      // For primitives (number, boolean, etc.), convert to string
      try {
        dataStr = ` | ${String(data)}`;
      } catch {
        dataStr = " | [Unable to serialize data]";
      }
    }
  }

  return `[${timestamp}] [${level}] ${message}${dataStr}`;
}

/**
 * Error logging - always logged
 */
function error(message, data = null) {
  console.error(formatLog(LOG_LEVELS.ERROR, message, data));
}

/**
 * Warning logging - always logged
 */
function warn(message, data = null) {
  console.warn(formatLog(LOG_LEVELS.WARN, message, data));
}

/**
 * Info logging - for important application events
 */
function info(message, data = null) {
  console.log(formatLog(LOG_LEVELS.INFO, message, data));
}

/**
 * Debug logging - only in development mode
 */
function debug(message, data = null) {
  if (DEBUG_MODE) {
    console.log(formatLog(LOG_LEVELS.DEBUG, message, data));
  }
}

module.exports = {
  error,
  warn,
  info,
  debug,
};
