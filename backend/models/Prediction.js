const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['yield', 'price', 'rainfall'], required: true },
  crop: { type: String, required: true },
  state: { type: String, required: true },
  targetYear: { type: Number, required: true },
  predictedValue: { type: Number, required: true },
  confidence: { type: Number, min: 0, max: 100, required: true },
  algorithm: { type: String, default: 'linear_regression' },
  features: { type: [String], default: [] },
  historicalData: { type: [mongoose.Schema.Types.Mixed], default: [] },
  forecastData: { type: [mongoose.Schema.Types.Mixed], default: [] },
  accuracy: { type: Number, default: null },
  rmse: { type: Number, default: null },
  r2Score: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Prediction', predictionSchema);
