const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
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
  const { name, email, password, preferences } = req.body || {};

  if (!name || !email || !password) {
    return handleValidationError(res, "name, email and password are required");
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return handleDuplicateEmail(res);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in MongoDB
    const newUser = new User({
      username: name,
      email,
      password: hashedPassword,
      preferences: Array.isArray(preferences) ? preferences : [],
    });

    await newUser.save();
    logger.info("User registered successfully", { email, userId: newUser._id });

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
  const { email, password } = req.body || {};

  if (!email || !password) {
    return handleValidationError(res, "email and password are required");
  }

  try {
    // Find user in MongoDB
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return handleInvalidCredentials(res);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return handleInvalidCredentials(res);
    }

    const token = jwt.sign({ email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });
    logger.info("User logged in successfully", { email });

    return res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    return handleServerError(res, err, { operation: "Login", email });
  }
}

// GET /users/preferences
async function getPreferences(req, res) {
  try {
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return handleUserNotFound(res);
    }

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
  const { preferences } = req.body || {};

  if (!Array.isArray(preferences)) {
    return handleValidationError(res, "preferences must be an array");
  }

  try {
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return handleUserNotFound(res);
    }

    user.preferences = preferences;
    await user.save();
    logger.info("User preferences updated", {
      email: req.user.email,
      preferences,
    });

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

module.exports = {
  signup,
  login,
  getPreferences,
  updatePreferences,
};
