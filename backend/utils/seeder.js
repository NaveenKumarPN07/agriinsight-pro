require('dotenv').config();
const mongoose = require('mongoose');
const AgriData = require('../models/AgriData');
const User = require('../models/User');

const CROPS = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Soybean', 'Groundnut', 'Mustard', 'Jowar', 'Bajra'];
const STATES = ['Punjab', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Gujarat', 'West Bengal', 'Bihar'];
const SEASONS = ['Kharif', 'Rabi', 'Zaid'];

const BASE_YIELD = {
  Rice: 2200, Wheat: 3100, Maize: 2600, Cotton: 500,
  Sugarcane: 70000, Soybean: 1200, Groundnut: 1400,
  Mustard: 1100, Jowar: 900, Bajra: 1000,
};
const BASE_PRICE = {
  Rice: 2000, Wheat: 2015, Maize: 1962, Cotton: 6080,
  Sugarcane: 305, Soybean: 4600, Groundnut: 5850,
  Mustard: 5450, Jowar: 2738, Bajra: 2350,
};
const RAINFALL_BY_STATE = {
  'Punjab': 700, 'Haryana': 600, 'Uttar Pradesh': 900, 'Maharashtra': 1100,
  'Karnataka': 1200, 'Tamil Nadu': 1000, 'Andhra Pradesh': 950, 'Madhya Pradesh': 1000,
  'Rajasthan': 400, 'Gujarat': 700, 'West Bengal': 1600, 'Bihar': 1100,
};

const rnd = (base, variance = 0.15) => Math.round(base * (1 + (Math.random() - 0.5) * variance * 2));

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agriinsight');
    console.log('Connected to MongoDB');

    // Create demo user
    let demoUser = await User.findOne({ email: 'demo@agriinsight.pro' });
    if (!demoUser) {
      demoUser = await User.create({
        name: 'Demo Analyst',
        email: 'demo@agriinsight.pro',
        password: 'Demo@123',
        role: 'analyst',
        organization: 'AgriInsight Pro',
      });
      console.log('✅ Demo user created: demo@agriinsight.pro / Demo@123');
    }

    // Clear existing seed data
    await AgriData.deleteMany({ userId: demoUser._id });

    // Generate 10 years of data
    const records = [];
    for (let year = 2014; year <= 2024; year++) {
      for (const state of STATES) {
        for (const crop of CROPS) {
          const season = ['Rice', 'Cotton', 'Maize', 'Bajra', 'Jowar'].includes(crop) ? 'Kharif' : 'Rabi';
          const yearFactor = 1 + (year - 2014) * 0.015; // slight improvement over years
          const area = rnd(50000 + Math.random() * 100000);
          const yieldVal = rnd(BASE_YIELD[crop] * yearFactor);
          const production = Math.round(area * yieldVal / 1000); // in tonnes
          const baseRainfall = RAINFALL_BY_STATE[state];

          records.push({
            userId: demoUser._id,
            crop,
            state,
            district: '',
            year,
            season,
            area,
            production,
            yield: yieldVal,
            rainfall: rnd(baseRainfall, 0.25),
            temperature: rnd(25 + (state === 'Punjab' || state === 'Haryana' ? -3 : 2)),
            price: rnd(BASE_PRICE[crop] * yearFactor, 0.1),
            fertilizer: rnd(150),
            pesticide: rnd(2),
            sourceFile: 'seeder',
          });
        }
      }
    }

    await AgriData.insertMany(records);
    console.log(`✅ Seeded ${records.length} agricultural records`);
    console.log('\n🎉 Database seeded successfully!');
    console.log('Demo credentials: demo@agriinsight.pro / Demo@123');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();
