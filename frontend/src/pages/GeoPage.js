import React, { useState, useEffect, useRef } from 'react';
import { analyticsAPI, weatherAPI } from '../services/api';
import toast from 'react-hot-toast';

// India state coordinates for markers
const STATE_COORDS = {
  'Punjab': [31.1471, 75.3412], 'Haryana': [29.0588, 76.0856],
  'Uttar Pradesh': [26.8467, 80.9462], 'Maharashtra': [19.7515, 75.7139],
  'Karnataka': [15.3173, 75.7139], 'Tamil Nadu': [11.1271, 78.6569],
  'Andhra Pradesh': [15.9129, 79.7400], 'Madhya Pradesh': [22.9734, 78.6569],
  'Rajasthan': [27.0238, 74.2179], 'Gujarat': [22.2587, 71.1924],
  'West Bengal': [22.9868, 87.8550], 'Bihar': [25.0961, 85.3131],
  'Odisha': [20.9517, 85.0985], 'Assam': [26.2006, 92.9376],
  'Kerala': [10.8505, 76.2711], 'Telangana': [18.1124, 79.0193],
  'Chhattisgarh': [21.2787, 81.8661], 'Jharkhand': [23.6102, 85.2799],
  'Himachal Pradesh': [31.1048, 77.1734],
};

export default function GeoPage() {
  const [stateData, setStateData] = useState([]);
  const [weatherData, setWeatherData] = useState([]);
  const [metric, setMetric] = useState('yield');
  const [selectedState, setSelectedState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    fetchData();
    loadLeaflet();
  }, []);

  const loadLeaflet = () => {
    if (window.L) { setMapLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [heatRes, weatherRes] = await Promise.all([
        analyticsAPI.getStateHeatmap({}),
        weatherAPI.getAllStates(),
      ]);
      setStateData(heatRes.data || []);
      setWeatherData(weatherRes.data || []);
    } catch {
      toast.error('Failed to load geo data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || leafletMap.current) return;
    const L = window.L;

    leafletMap.current = L.map(mapRef.current, {
      center: [22, 80], zoom: 5,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(leafletMap.current);

    markersLayer.current = L.layerGroup().addTo(leafletMap.current);
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !leafletMap.current || stateData.length === 0) return;
    const L = window.L;
    markersLayer.current.clearLayers();

    const values = stateData.map(d => d[metric] || 0);
    const max = Math.max(...values) || 1;
    const min = Math.min(...values) || 0;

    stateData.forEach(state => {
      const coords = STATE_COORDS[state.state];
      if (!coords) return;
      const val = state[metric] || 0;
      const norm = (val - min) / (max - min);
      const size = 12 + norm * 28;
      const r = Math.round(norm * 220);
      const g = Math.round((1 - norm) * 220);
      const color = `rgb(${r}, ${g}, 60)`;

      const weatherEntry = weatherData.find(w => w.state === state.state);
      const weather = weatherEntry?.weather;

      const marker = L.circleMarker(coords, {
        radius: size, fillColor: color, color: 'rgba(255,255,255,0.3)',
        weight: 1, fillOpacity: 0.8,
      });

      marker.bindPopup(`
        <div style="min-width:200px;font-family:'Space Grotesk',sans-serif;">
          <h3 style="margin:0 0 8px;font-size:15px;color:#e8f4fd;">${state.state}</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
            <div style="background:rgba(34,197,94,0.1);padding:6px 8px;border-radius:6px;">
              <div style="font-size:10px;color:#7da0c4;">YIELD</div>
              <div style="font-size:14px;font-weight:700;color:#22c55e;">${state.yield?.toLocaleString()} kg/ha</div>
            </div>
            <div style="background:rgba(245,158,11,0.1);padding:6px 8px;border-radius:6px;">
              <div style="font-size:10px;color:#7da0c4;">PRICE</div>
              <div style="font-size:14px;font-weight:700;color:#f59e0b;">₹${state.price?.toLocaleString()}</div>
            </div>
            <div style="background:rgba(6,182,212,0.1);padding:6px 8px;border-radius:6px;">
              <div style="font-size:10px;color:#7da0c4;">RAINFALL</div>
              <div style="font-size:14px;font-weight:700;color:#06b6d4;">${state.rainfall} mm</div>
            </div>
            <div style="background:rgba(168,85,247,0.1);padding:6px 8px;border-radius:6px;">
              <div style="font-size:10px;color:#7da0c4;">PRODUCTION</div>
              <div style="font-size:14px;font-weight:700;color:#a855f7;">${Math.round((state.production||0)/1000)}K T</div>
            </div>
          </div>
          ${weather ? `
            <div style="background:rgba(30,58,95,0.5);padding:8px;border-radius:6px;font-size:12px;color:#7da0c4;">
              🌡️ ${weather.temperature}°C &nbsp; 💧 ${weather.humidity}% &nbsp; 💨 ${weather.windSpeed} m/s
            </div>
          ` : ''}
        </div>
      `, { maxWidth: 260 });

      marker.on('click', () => setSelectedState(state));
      marker.addTo(markersLayer.current);
    });
  }, [stateData, weatherData, metric, mapLoaded]);

  const sortedStates = [...stateData].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
  const maxVal = sortedStates[0]?.[metric] || 1;

  const METRICS = [
    { key: 'yield', label: 'Crop Yield', unit: 'kg/ha', color: '#22c55e' },
    { key: 'price', label: 'Market Price', unit: '₹/q', color: '#f59e0b' },
    { key: 'rainfall', label: 'Rainfall', unit: 'mm', color: '#3b82f6' },
    { key: 'production', label: 'Production', unit: 'T', color: '#a855f7' },
  ];

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            Geo <span className="gradient-text">Intelligence</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Interactive India map with state-level agricultural metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {METRICS.map(m => (
            <button key={m.key} onClick={() => setMetric(m.key)} style={{
              padding: '8px 16px', borderRadius: 8,
              border: `1px solid ${metric === m.key ? m.color : 'var(--border)'}`,
              background: metric === m.key ? `${m.color}15` : 'transparent',
              color: metric === m.key ? m.color : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
              fontFamily: 'var(--font-body)',
            }}>{m.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,22,40,0.8)', zIndex: 10, borderRadius: 'var(--radius)' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent-green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                Loading map data...
              </div>
            </div>
          )}
          <div ref={mapRef} style={{ height: 520, width: '100%' }} />
          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
            background: 'rgba(10,22,40,0.9)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', fontSize: 11,
          }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              {METRICS.find(m => m.key === metric)?.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgb(0,220,60)' }}>Low</span>
              <div style={{ width: 80, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, rgb(0,220,60), rgb(255,140,60), rgb(220,0,60))' }} />
              <span style={{ color: 'rgb(220,0,60)' }}>High</span>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Selected state detail */}
          {selectedState && (
            <div className="card animate-fade-in" style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{selectedState.state}</h3>
                <button onClick={() => setSelectedState(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
              {[
                { label: 'Avg Yield', value: `${selectedState.yield?.toLocaleString()} kg/ha`, color: '#22c55e' },
                { label: 'Market Price', value: `₹${selectedState.price?.toLocaleString()}/q`, color: '#f59e0b' },
                { label: 'Rainfall', value: `${selectedState.rainfall} mm`, color: '#3b82f6' },
                { label: 'Production', value: `${Math.round((selectedState.production||0)/1000)}K T`, color: '#a855f7' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(30,58,95,0.3)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* State rankings */}
          <div className="card" style={{ flex: 1, overflow: 'hidden' }}>
            <h3 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              STATE RANKINGS — {METRICS.find(m => m.key === metric)?.label}
            </h3>
            <div style={{ overflow: 'auto', maxHeight: 400 }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />)}
                </div>
              ) : (
                sortedStates.map((s, i) => {
                  const pct = Math.round(((s[metric] || 0) / maxVal) * 100);
                  const activeMetric = METRICS.find(m => m.key === metric);
                  return (
                    <div key={s.state} onClick={() => setSelectedState(s)} style={{
                      padding: '10px 0', borderBottom: '1px solid rgba(30,58,95,0.3)',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 18 }}>#{i + 1}</span>
                          <span style={{ fontSize: 12 }}>{s.state}</span>
                        </div>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: activeMetric?.color }}>
                          {metric === 'price' ? '₹' : ''}{(s[metric] || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="progress-bar" style={{ marginLeft: 26 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: activeMetric?.color }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
