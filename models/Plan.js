const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Weekly Access", "Monthly Pro"
  durationDays: { type: Number, required: true }, // 7, 30
  durationLabel: { type: String, required: true }, // e.g., "1 Week", "1 Month"
  price: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  features: [{ type: String }],
  maxReqsPerDay: { type: Number, default: 1 },
  allowAutolike: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Plan', PlanSchema);
