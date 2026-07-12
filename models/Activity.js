const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uid: { type: String, required: true, trim: true },
  nickname: { type: String, default: '' },
  region: { type: String, required: true, default: 'IND' },
  likesBefore: { type: Number, default: 0 },
  likesAdded: { type: Number, default: 0 },
  likesAfter: { type: Number, default: 0 },
  status: { type: String, required: true, enum: ['success', 'limit_reached', 'failed'] },
  message: { type: String, default: '' },
  type: { type: String, required: true, enum: ['manual', 'autolike', 'free_trial'] }
}, { timestamps: true });

// Performance Optimization: Indexes for fast VPS query responses
ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
