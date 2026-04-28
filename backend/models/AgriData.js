const mongoose = require('mongoose');

const agriDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  crop: { type: String, required: true, index: true },
  state: { type: String, required: true, index: true },
  district: { type: String, default: '' },
  year: { type: Number, required: true, index: true },
  season: { type: String, enum: ['Kharif', 'Rabi', 'Zaid', 'Whole Year', 'Summer', 'Winter'], default: 'Kharif' },
  area: { type: Number, default: 0 },       // in hectares
  production: { type: Number, default: 0 }, // in tonnes
  yield: { type: Number, default: 0 },      // kg/hectare
  rainfall: { type: Number, default: 0 },   // mm
  temperature: { type: Number, default: 0 }, // celsius
  price: { type: Number, default: 0 },      // INR per quintal
  fertilizer: { type: Number, default: 0 }, // kg/hectare
  pesticide: { type: Number, default: 0 },  // kg/hectare
  irrigated: { type: Boolean, default: false },
  soilType: { type: String, default: '' },
  sourceFile: { type: String, default: 'manual' },
  isVerified: { type: Boolean, default: true },
}, { timestamps: true });

agriDataSchema.index({ crop: 1, state: 1, year: 1 });
agriDataSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AgriData', agriDataSchema);
