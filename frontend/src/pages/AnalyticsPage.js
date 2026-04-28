import React, { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '../services/api';
import { ScatterChart, Scatter, BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      {label && <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4', '#ef4444', '#f97316', '#ec4899', '#84cc16', '#14b8a6'];

export default function AnalyticsPage() {
  const [filters, setFilters] = useState({ crop: 'all', state: 'all', yearFrom: 2019, yearTo: 2024 });
  const [filterOptions, setFilterOptions] = useState({ crops: [], states: [], years: [] });
  const [activeTab, setActiveTab] = useState('yield');
  const [yieldData, setYieldData] = useState([]);
  const [cropData, setCropData] = useState([]);
  const [stateData, setStateData] = useState([]);
  const [seasonData, setSeasonData] = useState([]);
  const [rainfallData, setRainfallData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOptions = useCallback(async () => {
    try {
      const res = await analyticsAPI.getFilterOptions();
      setFilterOptions(res.data);
    } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = {
      crop: filters.crop !== 'all' ? filters.crop : undefined,
      state: filters.state !== 'all' ? filters.state : undefined,
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
    };
    try {
      const [yieldRes, cropRes, heatmapRes, seasonRes, rainRes] = await Promise.all([
        analyticsAPI.getYieldTrend(params),
        analyticsAPI.getCropComparison(params),
        analyticsAPI.getStateHeatmap(params),
        analyticsAPI.getSeasonalAnalysis(params),
        analyticsAPI.getRainfallAnalysis(params),
      ]);
      setYieldData(yieldRes.data || []);
      setCropData(cropRes.data || []);
      setStateData(heatmapRes.data || []);
      setSeasonData(seasonRes.data || []);
      setRainfallData(rainRes.data || []);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const TABS = [
    { id: 'yield', label: 'Yield Analysis' },
    { id: 'price', label: 'Price Trends' },
    { id: 'crop', label: 'Crop Comparison' },
    { id: 'seasonal', label: 'Seasonal' },
    { id: 'rainfall', label: 'Rainfall' },
  ];

  // Scatter data: rainfall vs yield
  const scatterData = rainfallData.map(d => ({ x: d.rainfall, y: d.yield, state: d.state }));

  // Radar data for seasonal
  const radarData = seasonData.map(s => ({
    subject: s.season,
    yield: Math.round(s.avgYield / 100),
    price: Math.round(s.avgPrice / 100),
    rainfall: Math.round(s.avgRainfall / 10),
  }));

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
          Deep <span className="gradient-text">Analytics</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Multi-variable analysis with drill-down capabilities</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>FILTERS:</span>
          <select className="input" style={{ width: 140 }} value={filters.crop} onChange={e => setFilters(p => ({ ...p, crop: e.target.value }))}>
            <option value="all">All Crops</option>
            {filterOptions.crops.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" style={{ width: 140 }} value={filters.state} onChange={e => setFilters(p => ({ ...p, state: e.target.value }))}>
            <option value="all">All States</option>
            {filterOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Year:</label>
            <input className="input" type="number" style={{ width: 80 }} value={filters.yearFrom}
              onChange={e => setFilters(p => ({ ...p, yearFrom: parseInt(e.target.value) }))} />
            <span style={{ color: 'var(--text-muted)' }}>—</span>
            <input className="input" type="number" style={{ width: 80 }} value={filters.yearTo}
              onChange={e => setFilters(p => ({ ...p, yearTo: parseInt(e.target.value) }))} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={fetchData}>Apply</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ crop: 'all', state: 'all', yearFrom: 2019, yearTo: 2024 })}>Reset</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
            color: activeTab === tab.id ? 'var(--accent-green)' : 'var(--text-muted)',
            fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
            borderBottom: activeTab === tab.id ? '2px solid var(--accent-green)' : '2px solid transparent',
            transition: 'all 0.2s', fontFamily: 'var(--font-body)',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'yield' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>YIELD TREND OVER TIME</h3>
            <div style={{ height: 280 }}>
              {loading ? <div className="skeleton" style={{ height: '100%' }} /> : (
                <ResponsiveContainer>
                  <LineChart data={yieldData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                    <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="price" name="Avg Price (₹)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>RAINFALL vs YIELD CORRELATION</h3>
            <div style={{ height: 280 }}>
              {loading ? <div className="skeleton" style={{ height: '100%' }} /> : (
                <ResponsiveContainer>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                    <XAxis dataKey="x" name="Rainfall" stroke="var(--text-muted)" tick={{ fontSize: 10 }} label={{ value: 'Rainfall (mm)', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 11, offset: -5 }} />
                    <YAxis dataKey="y" name="Yield" stroke="var(--text-muted)" tick={{ fontSize: 10 }} label={{ value: 'Yield (kg/ha)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                    <Scatter data={scatterData.slice(0, 100)} fill="#22c55e" opacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* State comparison */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>STATE-WISE PERFORMANCE</h3>
            <div style={{ height: 280 }}>
              {loading ? <div className="skeleton" style={{ height: '100%' }} /> : (
                <ResponsiveContainer>
                  <BarChart data={stateData.sort((a, b) => b.yield - a.yield).slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                    <XAxis dataKey="state" stroke="var(--text-muted)" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="yield" name="Avg Yield (kg/ha)" fill="#22c55e" radius={[4, 4, 0, 0]}>
                      {stateData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'crop' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>CROP PERFORMANCE MATRIX</h3>
            <div style={{ height: 320 }}>
              {loading ? <div className="skeleton" style={{ height: '100%' }} /> : (
                <ResponsiveContainer>
                  <BarChart data={cropData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                    <XAxis dataKey="crop" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="avgYield" name="Avg Yield (kg/ha)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgPrice" name="Avg Price (₹)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgRainfall" name="Avg Rainfall (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>DETAILED CROP METRICS</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Crop</th><th>Avg Yield (kg/ha)</th><th>Avg Price (₹/q)</th>
                    <th>Avg Rainfall (mm)</th><th>Total Production (T)</th><th>Records</th>
                  </tr>
                </thead>
                <tbody>
                  {cropData.map((c, i) => (
                    <tr key={c.crop}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                        <strong>{c.crop}</strong>
                      </div></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{c.avgYield.toLocaleString()}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{c.avgPrice.toLocaleString()}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{c.avgRainfall.toLocaleString()}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{c.totalProduction.toLocaleString()}</td>
                      <td><span className="badge badge-blue">{c.records}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seasonal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>SEASONAL RADAR ANALYSIS</h3>
            <div style={{ height: 320 }}>
              {loading ? <div className="skeleton" style={{ height: '100%' }} /> : (
                <ResponsiveContainer>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Radar name="Yield Index" dataKey="yield" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                    <Radar name="Price Index" dataKey="price" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                    <Radar name="Rainfall Index" dataKey="rainfall" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>SEASON COMPARISON</h3>
            <div style={{ height: 320 }}>
              {loading ? <div className="skeleton" style={{ height: '100%' }} /> : (
                <ResponsiveContainer>
                  <BarChart data={seasonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                    <XAxis dataKey="season" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="avgYield" name="Avg Yield" fill="#22c55e" radius={[4,4,0,0]} />
                    <Bar dataKey="avgRainfall" name="Avg Rainfall" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rainfall' && (
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>RAINFALL ANALYSIS BY STATE & YEAR</h3>
          <div style={{ height: 360 }}>
            {loading ? <div className="skeleton" style={{ height: '100%' }} /> : (
              <ResponsiveContainer>
                <LineChart data={rainfallData.slice(0, 50)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                  <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="yield" name="Yield (kg/ha)" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {activeTab === 'price' && (
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>PRICE TREND BY STATE</h3>
          <div style={{ height: 360 }}>
            {loading ? <div className="skeleton" style={{ height: '100%' }} /> : (
              <ResponsiveContainer>
                <BarChart data={stateData.sort((a, b) => b.price - a.price).slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                  <XAxis dataKey="state" stroke="var(--text-muted)" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="price" name="Avg Price (₹/q)" radius={[4,4,0,0]}>
                    {stateData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
