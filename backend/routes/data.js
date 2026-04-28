// routes/data.js
const express = require('express');
const router = express.Router();
const AgriData = require('../models/AgriData');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { crop, state, year, season, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user._id };
    if (crop && crop !== 'all') filter.crop = { $regex: crop, $options: 'i' };
    if (state && state !== 'all') filter.state = { $regex: state, $options: 'i' };
    if (year) filter.year = parseInt(year);
    if (season) filter.season = season;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      AgriData.find(filter).sort({ year: -1, crop: 1 }).skip(skip).limit(parseInt(limit)),
      AgriData.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await AgriData.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete record.' });
  }
});

module.exports = router;
