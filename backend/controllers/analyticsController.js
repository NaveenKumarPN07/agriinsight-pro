const AgriData = require('../models/AgriData');

exports.getDashboardStats = async (req, res) => {
  try {
    const { crop, state, yearFrom, yearTo } = req.query;
    const filter = { userId: req.user._id };
    if (crop && crop !== 'all') filter.crop = crop;
    if (state && state !== 'all') filter.state = state;
    if (yearFrom || yearTo) {
      filter.year = {};
      if (yearFrom) filter.year.$gte = parseInt(yearFrom);
      if (yearTo) filter.year.$lte = parseInt(yearTo);
    }

    const [totalRecords, crops, states] = await Promise.all([
      AgriData.countDocuments(filter),
      AgriData.distinct('crop', filter),
      AgriData.distinct('state', filter),
    ]);

    const aggregated = await AgriData.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgYield: { $avg: '$yield' },
          totalProduction: { $sum: '$production' },
          totalArea: { $sum: '$area' },
          avgRainfall: { $avg: '$rainfall' },
          avgPrice: { $avg: '$price' },
          maxYield: { $max: '$yield' },
          minYield: { $min: '$yield' },
        },
      },
    ]);

    const stats = aggregated[0] || {};

    res.json({
      success: true,
      data: {
        totalRecords,
        totalCrops: crops.length,
        totalStates: states.length,
        avgYield: Math.round(stats.avgYield || 0),
        totalProduction: Math.round(stats.totalProduction || 0),
        totalArea: Math.round(stats.totalArea || 0),
        avgRainfall: Math.round(stats.avgRainfall || 0),
        avgPrice: Math.round(stats.avgPrice || 0),
        maxYield: Math.round(stats.maxYield || 0),
        minYield: Math.round(stats.minYield || 0),
        crops,
        states,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
};

exports.getYieldTrend = async (req, res) => {
  try {
    const { crop, state, yearFrom, yearTo } = req.query;
    const filter = { userId: req.user._id };
    if (crop && crop !== 'all') filter.crop = crop;
    if (state && state !== 'all') filter.state = state;
    if (yearFrom || yearTo) {
      filter.year = {};
      if (yearFrom) filter.year.$gte = parseInt(yearFrom);
      if (yearTo) filter.year.$lte = parseInt(yearTo);
    }

    const data = await AgriData.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { year: '$year', crop: '$crop' },
          avgYield: { $avg: '$yield' },
          avgRainfall: { $avg: '$rainfall' },
          avgPrice: { $avg: '$price' },
          totalProduction: { $sum: '$production' },
          totalArea: { $sum: '$area' },
        },
      },
      { $sort: { '_id.year': 1 } },
    ]);

    // Group by year
    const byYear = {};
    data.forEach(d => {
      const yr = d._id.year;
      if (!byYear[yr]) byYear[yr] = { year: yr, yields: {}, rainfall: 0, production: 0, price: 0, count: 0 };
      byYear[yr].yields[d._id.crop] = Math.round(d.avgYield);
      byYear[yr].rainfall = Math.round(d.avgRainfall);
      byYear[yr].production += d.totalProduction;
      byYear[yr].price = Math.round(d.avgPrice);
      byYear[yr].count++;
    });

    res.json({ success: true, data: Object.values(byYear).sort((a, b) => a.year - b.year) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch yield trend.' });
  }
};

exports.getCropComparison = async (req, res) => {
  try {
    const { state, year } = req.query;
    const filter = { userId: req.user._id };
    if (state && state !== 'all') filter.state = state;
    if (year) filter.year = parseInt(year);

    const data = await AgriData.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$crop',
          avgYield: { $avg: '$yield' },
          avgRainfall: { $avg: '$rainfall' },
          avgPrice: { $avg: '$price' },
          totalProduction: { $sum: '$production' },
          totalArea: { $sum: '$area' },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgYield: -1 } },
    ]);

    res.json({
      success: true,
      data: data.map(d => ({
        crop: d._id,
        avgYield: Math.round(d.avgYield),
        avgRainfall: Math.round(d.avgRainfall),
        avgPrice: Math.round(d.avgPrice),
        totalProduction: Math.round(d.totalProduction),
        totalArea: Math.round(d.totalArea),
        records: d.count,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch crop comparison.' });
  }
};

exports.getStateHeatmap = async (req, res) => {
  try {
    const { crop, year, metric } = req.query;
    const filter = { userId: req.user._id };
    if (crop && crop !== 'all') filter.crop = crop;
    if (year) filter.year = parseInt(year);

    const data = await AgriData.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$state',
          avgYield: { $avg: '$yield' },
          avgRainfall: { $avg: '$rainfall' },
          avgPrice: { $avg: '$price' },
          totalProduction: { $sum: '$production' },
        },
      },
    ]);

    res.json({
      success: true,
      data: data.map(d => ({
        state: d._id,
        yield: Math.round(d.avgYield),
        rainfall: Math.round(d.avgRainfall),
        price: Math.round(d.avgPrice),
        production: Math.round(d.totalProduction),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch state heatmap data.' });
  }
};

exports.getPriceTrend = async (req, res) => {
  try {
    const { crop, state } = req.query;
    const filter = { userId: req.user._id };
    if (crop && crop !== 'all') filter.crop = crop;
    if (state && state !== 'all') filter.state = state;

    const data = await AgriData.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { year: '$year', crop: '$crop' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      { $sort: { '_id.year': 1 } },
    ]);

    res.json({
      success: true,
      data: data.map(d => ({
        year: d._id.year,
        crop: d._id.crop,
        avgPrice: Math.round(d.avgPrice),
        minPrice: Math.round(d.minPrice),
        maxPrice: Math.round(d.maxPrice),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price trend.' });
  }
};

exports.getSeasonalAnalysis = async (req, res) => {
  try {
    const { crop, state } = req.query;
    const filter = { userId: req.user._id };
    if (crop && crop !== 'all') filter.crop = crop;
    if (state && state !== 'all') filter.state = state;

    const data = await AgriData.aggregate([
      { $match: { ...filter, season: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$season',
          avgYield: { $avg: '$yield' },
          avgRainfall: { $avg: '$rainfall' },
          avgPrice: { $avg: '$price' },
          totalProduction: { $sum: '$production' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: data.map(d => ({
        season: d._id,
        avgYield: Math.round(d.avgYield),
        avgRainfall: Math.round(d.avgRainfall),
        avgPrice: Math.round(d.avgPrice),
        totalProduction: Math.round(d.totalProduction),
        count: d.count,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch seasonal analysis.' });
  }
};

exports.getFilterOptions = async (req, res) => {
  try {
    const [crops, states, years, seasons] = await Promise.all([
      AgriData.distinct('crop', { userId: req.user._id }),
      AgriData.distinct('state', { userId: req.user._id }),
      AgriData.distinct('year', { userId: req.user._id }),
      AgriData.distinct('season', { userId: req.user._id }),
    ]);

    res.json({
      success: true,
      data: {
        crops: crops.sort(),
        states: states.sort(),
        years: years.sort((a, b) => a - b),
        seasons: seasons.filter(Boolean),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch filter options.' });
  }
};

exports.getRainfallAnalysis = async (req, res) => {
  try {
    const { state, crop } = req.query;
    const filter = { userId: req.user._id };
    if (state && state !== 'all') filter.state = state;
    if (crop && crop !== 'all') filter.crop = crop;

    const data = await AgriData.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { year: '$year', state: '$state' },
          avgRainfall: { $avg: '$rainfall' },
          avgYield: { $avg: '$yield' },
        },
      },
      { $sort: { '_id.year': 1 } },
    ]);

    res.json({
      success: true,
      data: data.map(d => ({
        year: d._id.year,
        state: d._id.state,
        rainfall: Math.round(d.avgRainfall),
        yield: Math.round(d.avgYield),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rainfall analysis.' });
  }
};
