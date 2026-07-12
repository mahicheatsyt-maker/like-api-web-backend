const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

const registerUser = async (req, res) => {
  const { name, email, password, provider } = req.body;

  try {
    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let hashedPassword = password;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      provider: provider || 'local',
      hwidResetsLeft: 2 // Set default self-resets to 2
    });

    if (user) {
      // Send Welcome Email asynchronously
      sendWelcomeEmail(user.email, user.name);

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
        hwid: user.hwid || '',
        hwidResetsLeft: user.hwidResetsLeft ?? 2,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).populate('subscription.plan');

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
        subscription: user.subscription,
        uid: user.uid,
        hwid: user.hwid || '',
        hwidResetsLeft: user.hwidResetsLeft ?? 2,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};
