const express = require('express');
const router = express.Router();
const { predictYield, predictPrice, getPredictionHistory, getMultivariateAnalysis } = require('../controllers/predictionController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.post('/yield', predictYield);
router.post('/price', predictPrice);
router.get('/history', getPredictionHistory);
router.get('/multivariate', getMultivariateAnalysis);

module.exports = router;
