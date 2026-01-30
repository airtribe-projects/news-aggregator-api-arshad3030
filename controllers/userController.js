const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// POST /users/signup
async function signup(req, res) {
  const { name, email, password, preferences } = req.body || {};

  console.log('Signup request received:', { name, email, preferences: preferences || [] });

  if (!name || !email || !password) {
    console.log('Signup validation failed: Missing required fields');
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  try {
    // Check if user already exists
    console.log('Checking if user already exists with email:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Signup failed: User already exists with email:', email);
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    console.log('Hashing password for user:', email);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Create new user in MongoDB
    const newUser = new User({
      username: name, // Map 'name' from request to 'username' in model
      email,
      password: hashedPassword,
      preferences: Array.isArray(preferences) ? preferences : [],
    });

    console.log('Creating new user in MongoDB:', { username: name, email, preferences: newUser.preferences });
    await newUser.save();
    console.log('User registered successfully in MongoDB. User ID:', newUser._id);

    return res.status(200).json({ message: 'User created successfully' });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error (unique constraint violation)
      console.log('Signup failed: Duplicate email detected:', email);
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /users/login
async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    // Find user in MongoDB
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({ token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /users/preferences
async function getPreferences(req, res) {
  // authMiddleware will have attached req.user with email
  try {
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ preferences: user.preferences || [] });
  } catch (err) {
    console.error('Get preferences error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /users/preferences
async function updatePreferences(req, res) {
  const { preferences } = req.body || {};

  if (!Array.isArray(preferences)) {
    return res.status(400).json({ error: 'preferences must be an array' });
  }

  try {
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.preferences = preferences;
    await user.save();

    return res.status(200).json({ preferences: user.preferences });
  } catch (err) {
    console.error('Update preferences error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  signup,
  login,
  getPreferences,
  updatePreferences,
};


