const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['price_change', 'yield_prediction', 'weather_alert', 'system', 'custom'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  crop: { type: String, default: null },
  state: { type: String, default: null },
  threshold: { type: Number, default: null },
  currentValue: { type: Number, default: null },
  isRead: { type: Boolean, default: false },
  isEmailSent: { type: Boolean, default: false },
  emailSentAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

alertSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
