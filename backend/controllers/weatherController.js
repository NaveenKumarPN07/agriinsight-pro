const axios = require('axios');

const STATE_COORDINATES = {
  'Andhra Pradesh': { lat: 15.9129, lon: 79.7400 },
  'Arunachal Pradesh': { lat: 28.2180, lon: 94.7278 },
  'Assam': { lat: 26.2006, lon: 92.9376 },
  'Bihar': { lat: 25.0961, lon: 85.3131 },
  'Chhattisgarh': { lat: 21.2787, lon: 81.8661 },
  'Goa': { lat: 15.2993, lon: 74.1240 },
  'Gujarat': { lat: 22.2587, lon: 71.1924 },
  'Haryana': { lat: 29.0588, lon: 76.0856 },
  'Himachal Pradesh': { lat: 31.1048, lon: 77.1734 },
  'Jharkhand': { lat: 23.6102, lon: 85.2799 },
  'Karnataka': { lat: 15.3173, lon: 75.7139 },
  'Kerala': { lat: 10.8505, lon: 76.2711 },
  'Madhya Pradesh': { lat: 22.9734, lon: 78.6569 },
  'Maharashtra': { lat: 19.7515, lon: 75.7139 },
  'Manipur': { lat: 24.6637, lon: 93.9063 },
  'Meghalaya': { lat: 25.4670, lon: 91.3662 },
  'Mizoram': { lat: 23.1645, lon: 92.9376 },
  'Nagaland': { lat: 26.1584, lon: 94.5624 },
  'Odisha': { lat: 20.9517, lon: 85.0985 },
  'Punjab': { lat: 31.1471, lon: 75.3412 },
  'Rajasthan': { lat: 27.0238, lon: 74.2179 },
  'Sikkim': { lat: 27.5330, lon: 88.5122 },
  'Tamil Nadu': { lat: 11.1271, lon: 78.6569 },
  'Telangana': { lat: 18.1124, lon: 79.0193 },
  'Tripura': { lat: 23.9408, lon: 91.9882 },
  'Uttar Pradesh': { lat: 26.8467, lon: 80.9462 },
  'Uttarakhand': { lat: 30.0668, lon: 79.0193 },
  'West Bengal': { lat: 22.9868, lon: 87.8550 },
};

exports.getWeatherByState = async (req, res) => {
  try {
    const { state } = req.params;
    const coords = STATE_COORDINATES[state];

    if (!coords) {
      return res.status(404).json({ error: `State "${state}" not found.` });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey || apiKey === 'your_openweather_api_key') {
      // Return mock data if no API key
      return res.json({
        success: true,
        state,
        weather: generateMockWeather(state),
        source: 'mock',
      });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`,
      { timeout: 5000 }
    );

    const data = response.data;
    res.json({
      success: true,
      state,
      weather: {
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        windSpeed: data.wind.speed,
        rainfall: data.rain ? data.rain['1h'] || 0 : 0,
        visibility: data.visibility / 1000,
        pressure: data.main.pressure,
        coordinates: coords,
      },
      source: 'openweathermap',
    });
  } catch (error) {
    console.error('Weather API error:', error.message);
    // Fallback to mock
    res.json({
      success: true,
      state: req.params.state,
      weather: generateMockWeather(req.params.state),
      source: 'mock_fallback',
    });
  }
};

exports.getAllStatesWeather = async (req, res) => {
  try {
    const statesData = Object.keys(STATE_COORDINATES).map(state => ({
      state,
      weather: generateMockWeather(state),
      coordinates: STATE_COORDINATES[state],
    }));

    res.json({ success: true, data: statesData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather data.' });
  }
};

function generateMockWeather(state) {
  const seed = state.charCodeAt(0) + state.charCodeAt(1);
  const baseTemp = 20 + (seed % 20);
  return {
    temperature: baseTemp,
    feelsLike: baseTemp - 2,
    humidity: 40 + (seed % 50),
    description: ['partly cloudy', 'sunny', 'overcast', 'light rain'][seed % 4],
    icon: ['02d', '01d', '04d', '10d'][seed % 4],
    windSpeed: 5 + (seed % 20),
    rainfall: seed % 10 > 7 ? seed % 30 : 0,
    visibility: 8 + (seed % 4),
    pressure: 1000 + (seed % 20),
  };
}
