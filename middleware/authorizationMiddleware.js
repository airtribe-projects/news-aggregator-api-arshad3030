const User = require("../models/User");
const logger = require("../utils/logger");

/**
 * Authorization middleware factory
 * Returns a middleware function that checks if user has required role(s)
 * Must be used AFTER authMiddleware (requires req.user to be set)
 *
 * @param {string|string[]} requiredRoles - Role(s) required to access endpoint
 * @returns {function} Express middleware function
 *
 * Usage:
 * router.delete('/users/:id', authMiddleware, authorize('admin'), deleteUser);
 * router.get('/admin/stats', authMiddleware, authorize(['admin']), getStats);
 */
function authorize(requiredRoles) {
  // Normalize requiredRoles to array
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return async (req, res, next) => {
    try {
      // req.user should be set by authMiddleware
      if (!req.user || !req.user.email) {
        logger.warn("Authorization failed: User not authenticated", {
          path: req.path,
        });
        return res.status(401).json({
          error: "Authentication required",
          message: "Please log in first",
        });
      }

      // Fetch user from database to get current role
      const user = await User.findOne({ email: req.user.email });

      if (!user) {
        logger.warn("Authorization failed: User not found in database", {
          email: req.user.email,
          path: req.path,
        });
        return res.status(401).json({
          error: "User not found",
          message: "Your account may have been deleted",
        });
      }

      // Check if user's role is in allowed roles
      if (!roles.includes(user.role)) {
        logger.warn("Authorization denied - insufficient permissions", {
          email: user.email,
          userRole: user.role,
          requiredRoles: roles,
          path: req.path,
        });

        return res.status(403).json({
          error: "Forbidden",
          message: `You need one of these roles to access this: ${roles.join(", ")}`,
        });
      }

      // Attach user role to request for use in controller
      req.user.role = user.role;

      logger.debug("Authorization successful", {
        email: user.email,
        role: user.role,
        requiredRoles: roles,
      });

      next();
    } catch (err) {
      logger.error("Authorization middleware error", {
        email: req.user?.email,
        error: err.message,
      });

      return res.status(500).json({
        error: "Internal server error",
        message: "Authorization check failed",
      });
    }
  };
}

/**
 * Check if user has admin role
 * Shorter alias for authorize('admin')
 */
function adminOnly(req, res, next) {
  authorize("admin")(req, res, next);
}

module.exports = {
  authorize,
  adminOnly,
};
