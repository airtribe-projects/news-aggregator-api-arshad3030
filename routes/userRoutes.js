const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  getPreferences,
  updatePreferences,
  deleteAccount,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");

// Auth routes (public)
router.post("/signup", signup);
router.post("/login", login);

// Preferences routes (protected - authenticated users only)
router.get("/preferences", authMiddleware, getPreferences);
router.put("/preferences", authMiddleware, updatePreferences);

// Account deletion (protected - user can only delete their own account)
router.delete("/account", authMiddleware, deleteAccount);

module.exports = router;
