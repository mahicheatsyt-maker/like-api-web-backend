const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/emailService');
const connectDB = require('../config/db');

// Serialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize
passport.deserializeUser(async (id, done) => {
  try {
    await connectDB(); // Ensure DB is connected
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ================= GOOGLE Strategy =================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      await connectDB();

      const email = profile.emails?.[0]?.value;
      const name = profile.displayName;

      if (!email) {
        return done(new Error('No email found in Google account'), null);
      }

      let user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        if (user.provider === 'local') {
          user.provider = 'google';
          user.providerId = profile.id;
          await user.save();
        }
        return done(null, user);
      }

      user = await User.create({
        name,
        email: email.toLowerCase(),
        password: 'oauth_no_password_' + Date.now(),
        provider: 'google',
        providerId: profile.id,
        hwidResetsLeft: 2
      });

      await sendWelcomeEmail(user.email, user.name);

      return done(null, user);

    } catch (err) {
      console.error("Google Auth Strategy Error:", err);
      return done(err, null);
    }
  }));
}

// ================= DISCORD Strategy =================
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      await connectDB();

      const email = profile.email;
      const name = profile.username || profile.global_name || 'Discord User';

      if (!email) {
        return done(
          new Error('No email found on Discord account. Verify your email.'),
          null
        );
      }

      let user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        if (user.provider === 'local') {
          user.provider = 'discord';
          user.providerId = profile.id;
          await user.save();
        }
        return done(null, user);
      }

      user = await User.create({
        name,
        email: email.toLowerCase(),
        password: 'oauth_no_password_' + Date.now(),
        provider: 'discord',
        providerId: profile.id,
        hwidResetsLeft: 2
      });

      await sendWelcomeEmail(user.email, user.name);

      return done(null, user);

    } catch (err) {
      console.error("Discord Auth Strategy Error:", err);
      return done(err, null);
    }
  }));
}

module.exports = passport;
