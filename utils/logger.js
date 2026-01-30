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
 */
function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
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
