import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { FilterProvider } from './contexts/FilterContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PredictionsPage from './pages/PredictionsPage';
import GeoPage from './pages/GeoPage';
import UploadPage from './pages/UploadPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#050d1a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #1e3a5f', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#7da0c4', fontFamily: 'Space Grotesk' }}>Loading AgriInsight Pro...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <FilterProvider>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#0f1f38', color: '#e8f4fd', border: '1px solid #1e3a5f', fontFamily: 'Space Grotesk' },
                success: { iconTheme: { primary: '#22c55e', secondary: '#050d1a' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#050d1a' } },
              }}
            />
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="predictions" element={<PredictionsPage />} />
                <Route path="geo" element={<GeoPage />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </FilterProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
