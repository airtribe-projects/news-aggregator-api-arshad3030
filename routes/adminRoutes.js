const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  updateUserRole,
  deleteUserAsAdmin,
  getAdminStats,
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorizationMiddleware");

/**
 * Admin routes - All protected with authentication and authorization
 * Requires user to be authenticated AND have admin role
 */

// Get all users
router.get("/users", authMiddleware, authorize("admin"), getAllUsers);

// Update user role
router.put(
  "/users/:email/role",
  authMiddleware,
  authorize("admin"),
  updateUserRole,
);

// Delete user as admin
router.delete(
  "/users/:email",
  authMiddleware,
  authorize("admin"),
  deleteUserAsAdmin,
);

// Get application statistics
router.get("/stats", authMiddleware, authorize("admin"), getAdminStats);

module.exports = router;
