import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agri_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('agri_token');
      localStorage.removeItem('agri_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
};

// Analytics
export const analyticsAPI = {
  getDashboardStats: (params) => api.get('/analytics/stats', { params }),
  getYieldTrend: (params) => api.get('/analytics/yield-trend', { params }),
  getCropComparison: (params) => api.get('/analytics/crop-comparison', { params }),
  getStateHeatmap: (params) => api.get('/analytics/state-heatmap', { params }),
  getPriceTrend: (params) => api.get('/analytics/price-trend', { params }),
  getSeasonalAnalysis: (params) => api.get('/analytics/seasonal', { params }),
  getFilterOptions: () => api.get('/analytics/filters'),
  getRainfallAnalysis: (params) => api.get('/analytics/rainfall', { params }),
};

// Predictions
export const predictionsAPI = {
  predictYield: (data) => api.post('/predictions/yield', data),
  predictPrice: (data) => api.post('/predictions/price', data),
  getHistory: (params) => api.get('/predictions/history', { params }),
  getMultivariate: (params) => api.get('/predictions/multivariate', { params }),
};

// Upload
export const uploadAPI = {
  uploadFile: (formData, onProgress) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    }),
  getRecords: (params) => api.get('/upload/records', { params }),
  deleteRecords: (ids) => api.delete('/upload/records', { data: { ids } }),
};

// Data
export const dataAPI = {
  getData: (params) => api.get('/data', { params }),
  deleteRecord: (id) => api.delete(`/data/${id}`),
};

// Alerts
export const alertsAPI = {
  getAlerts: (params) => api.get('/alerts', { params }),
  markAsRead: (ids) => api.put('/alerts/read', { ids }),
  deleteAlerts: (ids) => api.delete('/alerts', { data: { ids } }),
  createAlert: (data) => api.post('/alerts', data),
  sendEmail: (alertId) => api.post(`/alerts/${alertId}/email`),
};

// Weather
export const weatherAPI = {
  getAllStates: () => api.get('/weather'),
  getByState: (state) => api.get(`/weather/${encodeURIComponent(state)}`),
};

export default api;
