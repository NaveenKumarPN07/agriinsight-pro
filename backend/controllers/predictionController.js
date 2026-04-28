const AgriData = require('../models/AgriData');
const Prediction = require('../models/Prediction');
const Alert = require('../models/Alert');

// Simple Linear Regression
const linearRegression = (xArr, yArr) => {
  const n = xArr.length;
  if (n < 2) return { slope: 0, intercept: yArr[0] || 0, r2: 0 };

  const sumX = xArr.reduce((a, b) => a + b, 0);
  const sumY = yArr.reduce((a, b) => a + b, 0);
  const sumXY = xArr.reduce((sum, x, i) => sum + x * yArr[i], 0);
  const sumX2 = xArr.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const yMean = sumY / n;
  const ssTot = yArr.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssRes = xArr.reduce((sum, x, i) => {
    const predicted = slope * x + intercept;
    return sum + Math.pow(yArr[i] - predicted, 2);
  }, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2: Math.max(0, r2) };
};

// Exponential Smoothing for time series
const exponentialSmoothing = (data, alpha = 0.3) => {
  if (data.length === 0) return [];
  const smoothed = [data[0]];
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
};

// RMSE calculation
const calculateRMSE = (actual, predicted) => {
  if (actual.length !== predicted.length || actual.length === 0) return 0;
  const mse = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0) / actual.length;
  return Math.sqrt(mse);
};

exports.predictYield = async (req, res) => {
  try {
    const { crop, state, targetYear } = req.body;

    if (!crop || !state || !targetYear) {
      return res.status(400).json({ error: 'crop, state, and targetYear are required.' });
    }

    const historicalData = await AgriData.find({
      userId: req.user._id,
      crop,
      state,
    }).sort({ year: 1 });

    if (historicalData.length < 3) {
      return res.status(400).json({ error: 'Insufficient historical data. Need at least 3 years of data.' });
    }

    const years = historicalData.map(d => d.year);
    const yields = historicalData.map(d => d.yield);
    const rainfalls = historicalData.map(d => d.rainfall);

    // Linear regression on year vs yield
    const { slope, intercept, r2 } = linearRegression(years, yields);

    const target = parseInt(targetYear);
    const predictedYield = slope * target + intercept;

    // Generate forecast series
    const lastYear = Math.max(...years);
    const forecastYears = [];
    for (let y = lastYear + 1; y <= target; y++) {
      forecastYears.push(y);
    }

    const forecastData = forecastYears.map(y => ({
      year: y,
      predictedYield: Math.round(slope * y + intercept),
      isForcast: true,
    }));

    // Calculate confidence based on R² and data points
    const confidence = Math.round(r2 * 70 + Math.min(historicalData.length / 10 * 30, 30));

    // Predictions vs actual for RMSE
    const predictedActual = years.map(y => slope * y + intercept);
    const rmse = calculateRMSE(yields, predictedActual);

    const prediction = await Prediction.create({
      userId: req.user._id,
      type: 'yield',
      crop,
      state,
      targetYear: target,
      predictedValue: Math.round(predictedYield),
      confidence,
      algorithm: 'linear_regression',
      features: ['year', 'rainfall'],
      historicalData: historicalData.map(d => ({ year: d.year, yield: d.yield, rainfall: d.rainfall })),
      forecastData,
      rmse: Math.round(rmse * 100) / 100,
      r2Score: Math.round(r2 * 1000) / 1000,
    });

    // Create alert if significant change predicted
    const avgHistoricalYield = yields.reduce((a, b) => a + b, 0) / yields.length;
    const changePct = ((predictedYield - avgHistoricalYield) / avgHistoricalYield) * 100;

    if (Math.abs(changePct) > 15) {
      await Alert.create({
        userId: req.user._id,
        type: 'yield_prediction',
        title: `Yield ${changePct > 0 ? 'Increase' : 'Decrease'} Predicted for ${crop}`,
        message: `${crop} yield in ${state} is predicted to ${changePct > 0 ? 'increase' : 'decrease'} by ${Math.abs(changePct).toFixed(1)}% in ${targetYear}. Predicted yield: ${Math.round(predictedYield)} kg/ha`,
        severity: Math.abs(changePct) > 30 ? 'high' : 'medium',
        crop,
        state,
        currentValue: Math.round(avgHistoricalYield),
        threshold: Math.round(predictedYield),
        metadata: { changePct, targetYear, r2Score: r2 },
      });

      // Emit socket event
      if (global.io) {
        global.io.emit('alert:new', {
          userId: req.user._id.toString(),
          type: 'yield_prediction',
          message: `New yield prediction alert for ${crop} in ${state}`,
        });
      }
    }

    res.json({
      success: true,
      prediction: {
        ...prediction.toObject(),
        changePct: Math.round(changePct * 10) / 10,
        trend: slope > 0 ? 'increasing' : 'decreasing',
      },
    });
  } catch (error) {
    console.error('Yield prediction error:', error);
    res.status(500).json({ error: 'Failed to generate yield prediction.' });
  }
};

exports.predictPrice = async (req, res) => {
  try {
    const { crop, state, targetYear, periods } = req.body;

    if (!crop || !state || !targetYear) {
      return res.status(400).json({ error: 'crop, state, and targetYear are required.' });
    }

    const historicalData = await AgriData.find({
      userId: req.user._id,
      crop,
      state,
    }).sort({ year: 1 });

    if (historicalData.length < 3) {
      return res.status(400).json({ error: 'Insufficient historical data.' });
    }

    const years = historicalData.map(d => d.year);
    const prices = historicalData.map(d => d.price);

    // Apply exponential smoothing
    const smoothedPrices = exponentialSmoothing(prices, 0.4);

    // Linear regression on smoothed data
    const { slope, intercept, r2 } = linearRegression(years, smoothedPrices);

    const target = parseInt(targetYear);
    const forecastPeriods = periods || (target - Math.max(...years));
    const lastYear = Math.max(...years);

    const forecastData = [];
    for (let i = 1; i <= forecastPeriods; i++) {
      const yr = lastYear + i;
      const predicted = slope * yr + intercept;
      // Add uncertainty bands
      const uncertainty = (i / forecastPeriods) * 0.15 * predicted;
      forecastData.push({
        year: yr,
        predictedPrice: Math.round(predicted),
        upperBound: Math.round(predicted + uncertainty),
        lowerBound: Math.round(predicted - uncertainty),
        isForecast: true,
      });
    }

    const predictedValue = slope * target + intercept;
    const confidence = Math.round(r2 * 65 + Math.min(historicalData.length / 10 * 35, 35));

    const predictedActual = years.map(y => slope * y + intercept);
    const rmse = calculateRMSE(prices, predictedActual);

    const prediction = await Prediction.create({
      userId: req.user._id,
      type: 'price',
      crop,
      state,
      targetYear: target,
      predictedValue: Math.round(predictedValue),
      confidence,
      algorithm: 'exponential_smoothing_regression',
      features: ['year', 'historical_prices'],
      historicalData: historicalData.map(d => ({ year: d.year, price: d.price })),
      forecastData,
      rmse: Math.round(rmse * 100) / 100,
      r2Score: Math.round(r2 * 1000) / 1000,
    });

    // Alert for significant price change
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const changePct = ((predictedValue - avgPrice) / avgPrice) * 100;

    if (Math.abs(changePct) > 20) {
      await Alert.create({
        userId: req.user._id,
        type: 'price_change',
        title: `Significant Price ${changePct > 0 ? 'Rise' : 'Fall'} Predicted: ${crop}`,
        message: `${crop} price in ${state} predicted to ${changePct > 0 ? 'rise' : 'fall'} by ${Math.abs(changePct).toFixed(1)}% to ₹${Math.round(predictedValue)}/quintal by ${targetYear}`,
        severity: Math.abs(changePct) > 40 ? 'critical' : 'high',
        crop,
        state,
        currentValue: Math.round(avgPrice),
        threshold: Math.round(predictedValue),
      });
    }

    res.json({
      success: true,
      prediction: {
        ...prediction.toObject(),
        changePct: Math.round(changePct * 10) / 10,
        trend: slope > 0 ? 'increasing' : 'decreasing',
        smoothedHistorical: years.map((y, i) => ({ year: y, price: prices[i], smoothed: Math.round(smoothedPrices[i]) })),
      },
    });
  } catch (error) {
    console.error('Price prediction error:', error);
    res.status(500).json({ error: 'Failed to generate price prediction.' });
  }
};

exports.getPredictionHistory = async (req, res) => {
  try {
    const { type, crop, state } = req.query;
    const filter = { userId: req.user._id };
    if (type) filter.type = type;
    if (crop) filter.crop = crop;
    if (state) filter.state = state;

    const predictions = await Prediction.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch predictions.' });
  }
};

exports.getMultivariateAnalysis = async (req, res) => {
  try {
    const { crop, state } = req.query;
    const filter = { userId: req.user._id };
    if (crop && crop !== 'all') filter.crop = crop;
    if (state && state !== 'all') filter.state = state;

    const data = await AgriData.find(filter).sort({ year: 1 });

    if (data.length < 5) {
      return res.status(400).json({ error: 'Insufficient data for multivariate analysis.' });
    }

    // Correlation matrix
    const metrics = ['yield', 'rainfall', 'price', 'temperature', 'area', 'production'];
    const correlations = {};

    metrics.forEach(m1 => {
      correlations[m1] = {};
      metrics.forEach(m2 => {
        const x = data.map(d => d[m1] || 0);
        const y = data.map(d => d[m2] || 0);
        const xMean = x.reduce((a, b) => a + b, 0) / x.length;
        const yMean = y.reduce((a, b) => a + b, 0) / y.length;
        const cov = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0) / x.length;
        const xStd = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0) / x.length);
        const yStd = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0) / y.length);
        correlations[m1][m2] = xStd === 0 || yStd === 0 ? 0 : Math.round((cov / (xStd * yStd)) * 1000) / 1000;
      });
    });

    res.json({ success: true, correlations, metrics, dataPoints: data.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform multivariate analysis.' });
  }
};
