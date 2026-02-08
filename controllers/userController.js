const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
const profiler = require("../utils/profiler");
const {
  handleServerError,
  handleDuplicateEmail,
  handleUserNotFound,
  handleInvalidCredentials,
  handleValidationError,
} = require("../utils/errorHandler");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// POST /users/signup
async function signup(req, res) {
  profiler.mark("signup_total");
  const { name, email, password, preferences } = req.body || {};

  if (!name || !email || !password) {
    return handleValidationError(res, "name, email and password are required");
  }

  try {
    // Check if user already exists
    profiler.mark("signup_findOne_existing");
    const existingUser = await User.findOne({ email });
    profiler.measure("signup_findOne_existing");
    if (existingUser) {
      return handleDuplicateEmail(res);
    }

    // Hash password
    profiler.mark("signup_bcrypt_hash");
    const hashedPassword = await bcrypt.hash(password, 10);
    profiler.measure("signup_bcrypt_hash");

    // Create new user in MongoDB
    profiler.mark("signup_user_save");
    const newUser = new User({
      username: name,
      email,
      password: hashedPassword,
      preferences: Array.isArray(preferences) ? preferences : [],
    });

    await newUser.save();
    profiler.measure("signup_user_save");
    logger.info("User registered successfully", { email, userId: newUser._id });

    profiler.measure("signup_total");
    return res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    if (err.code === 11000) {
      return handleDuplicateEmail(res);
    }
    return handleServerError(res, err, { operation: "Signup", email });
  }
}

// POST /users/login
async function login(req, res) {
  profiler.mark("login_total");
  const { email, password } = req.body || {};

  if (!email || !password) {
    return handleValidationError(res, "email and password are required");
  }

  try {
    // Find user in MongoDB
    profiler.mark("login_findOne");
    const user = await User.findOne({ email: email.toLowerCase() });
    profiler.measure("login_findOne");

    if (!user) {
      return handleInvalidCredentials(res);
    }

    profiler.mark("login_bcrypt_compare");
    const isMatch = await bcrypt.compare(password, user.password);
    profiler.measure("login_bcrypt_compare");
    if (!isMatch) {
      return handleInvalidCredentials(res);
    }

    profiler.mark("login_jwt_sign");
    const token = jwt.sign({ email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });
    profiler.measure("login_jwt_sign");
    logger.info("User logged in successfully", { email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // true in prod
      sameSite: "lax",
    });

    profiler.measure("login_total");
    res.json({ message: "Login successful" });
  } catch (err) {
    return handleServerError(res, err, { operation: "Login", email });
  }
}

// GET /users/preferences
async function getPreferences(req, res) {
  profiler.mark("getPreferences_total");
  try {
    profiler.mark("getPreferences_findOne");
    const user = await User.findOne({ email: req.user.email });
    profiler.measure("getPreferences_findOne");

    if (!user) {
      return handleUserNotFound(res);
    }

    profiler.measure("getPreferences_total");
    return res.status(200).json({
      message: "Preferences retrieved successfully",
      preferences: user.preferences || [],
    });
  } catch (err) {
    return handleServerError(res, err, {
      operation: "Get preferences",
      email: req.user.email,
    });
  }
}

// PUT /users/preferences
async function updatePreferences(req, res) {
  profiler.mark("updatePreferences_total");
  const { preferences } = req.body || {};

  if (!Array.isArray(preferences)) {
    return handleValidationError(res, "preferences must be an array");
  }

  try {
    profiler.mark("updatePreferences_findOne");
    const user = await User.findOne({ email: req.user.email });
    profiler.measure("updatePreferences_findOne");

    if (!user) {
      return handleUserNotFound(res);
    }

    user.preferences = preferences;
    profiler.mark("updatePreferences_save");
    await user.save();
    profiler.measure("updatePreferences_save");
    logger.info("User preferences updated", {
      email: req.user.email,
      preferences,
    });

    profiler.measure("updatePreferences_total");
    return res.status(200).json({
      message: "Preferences updated successfully",
      preferences: user.preferences,
    });
  } catch (err) {
    return handleServerError(res, err, {
      operation: "Update preferences",
      email: req.user.email,
    });
  }
}

// DELETE /users/account
// User can only delete their own account
async function deleteAccount(req, res) {
  profiler.mark("deleteAccount_total");
  try {
    profiler.mark("deleteAccount_query");
    const user = await User.findOneAndDelete({ email: req.user.email });
    profiler.measure("deleteAccount_query");

    if (!user) {
      return handleUserNotFound(res);
    }

    logger.info("User deleted their account", {
      email: req.user.email,
      role: user.role,
    });

    // Clear token cookie
    res.clearCookie("token");

    profiler.measure("deleteAccount_total");
    return res.status(200).json({
      message: "Your account has been deleted successfully",
    });
  } catch (err) {
    return handleServerError(res, err, {
      operation: "Delete account",
      email: req.user.email,
    });
  }
}

module.exports = {
  signup,
  login,
  getPreferences,
  updatePreferences,
  deleteAccount,
};
