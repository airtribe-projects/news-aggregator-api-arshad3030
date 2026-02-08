const User = require("../models/User");
const logger = require("../utils/logger");
const profiler = require("../utils/profiler");
const {
  handleServerError,
  handleUserNotFound,
  handleValidationError,
} = require("../utils/errorHandler");

/**
 * GET /admin/users
 * Admin only - Get list of all users with their roles
 */
async function getAllUsers(req, res) {
  profiler.mark("getAllUsers_total");
  try {
    profiler.mark("getAllUsers_query");
    const users = await User.find(
      {},
      { password: 0 }, // Exclude password from response
    );
    profiler.measure("getAllUsers_query");

    logger.info("Admin retrieved all users", {
      admin: req.user.email,
      userCount: users.length,
    });

    profiler.measure("getAllUsers_total");
    return res.status(200).json({
      message: "Users retrieved successfully",
      userCount: users.length,
      users: users.map((u) => ({
        id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    return handleServerError(res, err, {
      operation: "Get all users",
      email: req.user.email,
    });
  }
}

/**
 * PUT /admin/users/:email/role
 * Admin only - Change user's role
 */
async function updateUserRole(req, res) {
  profiler.mark("updateUserRole_total");
  const { email } = req.params;
  const { role } = req.body;

  // Validation
  if (!role || !["user", "admin"].includes(role)) {
    return handleValidationError(res, 'Role must be either "user" or "admin"');
  }

  try {
    // Prevent admin from changing their own role to user
    if (req.user.email === email && role === "user") {
      return res.status(400).json({
        error: "Invalid operation",
        message: "Admin cannot demote themselves",
      });
    }

    profiler.mark("updateUserRole_query");
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role },
      { new: true },
    );
    profiler.measure("updateUserRole_query");

    if (!user) {
      return handleUserNotFound(res);
    }

    logger.info("Admin updated user role", {
      admin: req.user.email,
      targetUser: email,
      newRole: role,
    });

    profiler.measure("updateUserRole_total");
    return res.status(200).json({
      message: "User role updated successfully",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return handleServerError(res, err, {
      operation: "Update user role",
      admin: req.user.email,
      targetEmail: email,
    });
  }
}

/**
 * DELETE /admin/users/:email
 * Admin only - Delete a user account
 */
async function deleteUserAsAdmin(req, res) {
  profiler.mark("deleteUserAsAdmin_total");
  const { email } = req.params;

  // Prevent admin from deleting themselves
  if (req.user.email === email) {
    return res.status(400).json({
      error: "Invalid operation",
      message: "Admin cannot delete their own account",
    });
  }

  try {
    profiler.mark("deleteUserAsAdmin_query");
    const user = await User.findOneAndDelete({ email: email.toLowerCase() });
    profiler.measure("deleteUserAsAdmin_query");

    if (!user) {
      return handleUserNotFound(res);
    }

    logger.info("Admin deleted user account", {
      admin: req.user.email,
      deletedUser: email,
      deletedUserRole: user.role,
    });

    profiler.measure("deleteUserAsAdmin_total");
    return res.status(200).json({
      message: "User deleted successfully",
      deletedUser: {
        email: user.email,
        username: user.username,
      },
    });
  } catch (err) {
    return handleServerError(res, err, {
      operation: "Delete user",
      admin: req.user.email,
      targetEmail: email,
    });
  }
}

/**
 * GET /admin/stats
 * Admin only - Get application statistics
 */
async function getAdminStats(req, res) {
  profiler.mark("getAdminStats_total");
  try {
    profiler.mark("getAdminStats_query");
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: "admin" });
    const userCount = await User.countDocuments({ role: "user" });
    profiler.measure("getAdminStats_query");

    logger.info("Admin retrieved statistics", { admin: req.user.email });

    profiler.measure("getAdminStats_total");
    return res.status(200).json({
      message: "Statistics retrieved successfully",
      stats: {
        totalUsers,
        adminCount,
        userCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleServerError(res, err, {
      operation: "Get admin stats",
      email: req.user.email,
    });
  }
}

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUserAsAdmin,
  getAdminStats,
};
