const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Helper function to generate username from email
const generateUsername = async (email) => {
  let baseUsername = email.split('@')[0];
  let username = baseUsername;
  let counter = 1;
  
  while (true) {
    const existingUser = await User.findOne({ username });
    if (!existingUser) {
      return username;
    }
    username = `${baseUsername}${counter}`;
    counter++;
  }
};

exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, password, username: providedUsername } = req.body;

    // Check if user exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists'
      });
    }

    // Generate username if not provided
    const username = providedUsername || await generateUsername(email);

    // Create new user
    const user = new User({
      username,
      fullName,
      email,
      password
    });

    await user.save();

    const token = generateToken(user);

    user.lastLogin = Date.now();
    await user.save();

    res.status(201).json({
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: error.message || 'Server error during signup'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const token = generateToken(user);

    user.lastLogin = Date.now();
    await user.save();

    res.json({
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: error.message || 'Server error during login'
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    res.json(user.toSafeObject());
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Server error while fetching user'
    });
  }
}; 