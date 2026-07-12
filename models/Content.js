const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, required: true, enum: ['tutorial'] },
  link: { type: String, required: true },
  thumbnail: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Content', ContentSchema);
