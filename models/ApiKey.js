const mongoose = require('mongoose');

const ApiKeySchema = new mongoose.Schema({
  apiKey: { type: String, required: true, unique: true, trim: true },
  apiSecret: { type: String, required: true, trim: true },
  allowedRequests: { type: Number, default: 0 }, // 0 = unlimited
  requestsUsed: { type: Number, default: 0 },
  expiryDate: { type: Date, required: true }
}, { timestamps: true });

// Indexing for faster key lookup
ApiKeySchema.index({ apiKey: 1, apiSecret: 1 });

module.exports = mongoose.model('ApiKey', ApiKeySchema, 'api_keys');
