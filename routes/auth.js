const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Local auth for website
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// Helper: generate JWT and redirect to frontend for OAuth success
const oauthCallback = (req, res) => {
  const user = req.user;
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });

  const userData = encodeURIComponent(JSON.stringify({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    provider: user.provider,
    subscription: user.subscription,
    token
  }));

  const clientURL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  res.redirect(`${clientURL}/oauth/callback?data=${userData}`);
};

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  (req, res, next) => {
    const clientURL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    passport.authenticate('google', { failureRedirect: `${clientURL}/login?error=google_auth_failed`, session: false })(req, res, next);
  },
  oauthCallback
);

// Discord OAuth
router.get('/discord', passport.authenticate('discord', { scope: ['identify', 'email'] }));
router.get('/discord/callback',
  (req, res, next) => {
    const clientURL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    passport.authenticate('discord', { failureRedirect: `${clientURL}/login?error=discord_auth_failed`, session: false })(req, res, next);
  },
  oauthCallback
);

module.exports = router;
