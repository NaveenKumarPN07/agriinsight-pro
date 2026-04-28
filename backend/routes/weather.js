const express = require('express');
const router = express.Router();
const { getWeatherByState, getAllStatesWeather } = require('../controllers/weatherController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/', getAllStatesWeather);
router.get('/:state', getWeatherByState);

module.exports = router;
