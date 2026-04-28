const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getYieldTrend, getCropComparison,
  getStateHeatmap, getPriceTrend, getSeasonalAnalysis,
  getFilterOptions, getRainfallAnalysis
} = require('../controllers/analyticsController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/stats', getDashboardStats);
router.get('/yield-trend', getYieldTrend);
router.get('/crop-comparison', getCropComparison);
router.get('/state-heatmap', getStateHeatmap);
router.get('/price-trend', getPriceTrend);
router.get('/seasonal', getSeasonalAnalysis);
router.get('/filters', getFilterOptions);
router.get('/rainfall', getRainfallAnalysis);

module.exports = router;
