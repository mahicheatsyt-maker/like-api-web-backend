const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  provider: { type: String, default: 'local' }, // 'local', 'google', 'discord'
  providerId: { type: String, default: '' },
  role: { type: String, default: 'user' }, // 'user', 'admin'
  subscription: {
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    status: { type: String, default: 'inactive', enum: ['active', 'inactive', 'expired'] },
    expiry: { type: Date }
  },
  freeTrial: {
    approved: { type: Boolean, default: false },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null }
  },
  autolike: {
    enabled: { type: Boolean, default: false },
    uid: { type: String, default: '' },
    region: { type: String, default: '' },
    nickname: { type: String, default: '' },
    lastSentAt: { type: Date, default: null }
  },
  dailyRequestsUsed: { type: Number, default: 0 },
  lastRequestDate: { type: String, default: '' }, // YYYY-MM-DD format to track resets daily
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  reseller: { type: String, default: 'Aimguard' }
}, { timestamps: true });

// Optimization Indexes for VPS speeds
UserSchema.index({ 'subscription.status': 1, 'autolike.enabled': 1 });

// Ensure password is excluded when returning user JSON to the front-end
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema);
