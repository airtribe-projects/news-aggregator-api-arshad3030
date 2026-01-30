/**
 * Centralized error handling utilities
 * Provides consistent error responses and logging across the application
 */

const logger = require("./logger");

/**
 * Handle generic server errors with logging
 * Used in try-catch blocks for database and internal errors
 */
function handleServerError(res, err, context = {}) {
  logger.error(`${context.operation || "Operation"} error`, {
    email: context.email,
    error: err.message,
  });
  return res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong. Please try again later.",
  });
}

/**
 * Handle user not found scenario
 * Consistent 404 response for missing users
 */
function handleUserNotFound(res) {
  return res.status(404).json({
    error: "User not found",
    message: "The requested user does not exist.",
  });
}

/**
 * Handle duplicate email scenario
 * Used during signup when email already exists
 */
function handleDuplicateEmail(res) {
  return res.status(400).json({
    error: "User with this email already exists",
    message: "Please use a different email address or try logging in.",
  });
}

/**
 * Handle invalid credentials scenario
 * Used during login for authentication failures
 */
function handleInvalidCredentials(res) {
  return res.status(401).json({
    error: "Invalid credentials",
    message: "Email or password is incorrect. Please try again.",
  });
}

/**
 * Handle validation errors
 * Generic 400 response for missing or invalid request data
 */
function handleValidationError(res, message) {
  return res.status(400).json({
    error: "Validation error",
    message: message,
  });
}

/**
 * Wrapper for async route handlers with automatic error catching
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  handleServerError,
  handleUserNotFound,
  handleDuplicateEmail,
  handleInvalidCredentials,
  handleValidationError,
  asyncHandler,
};
