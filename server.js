const path = require('path');
// Strictly resolve .env from local backend directory path to prevent global resolve issues
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const connectDB = require('./config/db');
const { seedDB } = require('./services/seeder');
const { initAutolikeScheduler } = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect DB first and execute configurations seeder
connectDB()
  .then(async () => {
    console.log('Successfully connected to MongoDB Database.');
    // Trigger seeder on boot to configure keys and base plans
    await seedDB();
    // Initialize Autolike scheduler for automated daily queues
    initAutolikeScheduler();
  })
  .catch(err => {
    console.error('CRITICAL DATABASE ERROR:', err);
  });

// Setup Production-Ready Dynamic CORS Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://www.bhuwanhex.qzz.io',
  'https://bhuwanhex.qzz.io',
  'https://bhuwanhex.qzz.io',
  'https://api.bhuwanhex.qzz.io'
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.replace(/\/$/, ""));
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl, postman, mobile apps, or same-origin)
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.trim().replace(/\/$/, "");
    if (allowedOrigins.indexOf(cleanOrigin) !== -1) {
      return callback(null, true);
    }
    
    // Dynamically match any subdomains of hybridkodr.in or nexxlokesh.in
    const domainPattern = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)*(hybridkodr\.in|nexxlokesh\.in)(:\d+)?$/;
    if (domainPattern.test(cleanOrigin)) {
      return callback(null, true);
    }
    
    return callback(new Error(`CORS blocked request from origin: ${origin}`), false);
  },
  credentials: true
}));

// Express parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session support required for Passport strategies
app.use(session({
  secret: process.env.JWT_SECRET || 'aimguard_session_secret_passphrase',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 5 * 60 * 1000 // 5 minutes max session validity
  }
}));

// Initialize Passport authentication strategists
app.use(passport.initialize());
app.use(passport.session());

// Safety check to ensure MongoDB stays connected
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Mounting Routing endpoints
app.use('/api/auth', require('./routes/auth'));
app.use('/api/like', require('./routes/like')); // Mounted like route (replacing /api/uid)
app.use('/api/payment', require('./routes/payment'));
app.use('/api/data', require('./routes/data'));
app.use('/api/admin', require('./routes/admin'));

// Health checking and root
app.get('/', (req, res) => {
  res.send('BHUWANHEX Like Bot Licensing and API Server Operational.');
});

// Boot listening
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  Bhuwan hex Unified API is actively running on Port: ${PORT}`);
  console.log(`🛡️  Local Endpoint: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
