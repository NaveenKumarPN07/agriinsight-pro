import React, { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '../services/api';
import { useFilters } from '../contexts/FilterContext';
import { useSocket } from '../contexts/SocketContext';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const StatCard = ({ label, value, sub, icon, color = '#22c55e', trend, loading }) => (
  <div className="stat-card" style={{ minHeight: 110 }}>
    {loading ? (
      <>
        <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 28, width: '80%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 10, width: '50%' }} />
      </>
    ) : (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
          <span style={{ fontSize: 20 }}>{icon}</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color, marginBottom: 4 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {trend !== undefined && (
            <span style={{ color: trend >= 0 ? '#22c55e' : '#ef4444', marginRight: 6 }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub}
        </div>
      </>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value?.toLocaleString()}</strong></p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { filters } = useFilters();
  const { socket } = useSocket();
  const [stats, setStats] = useState(null);
  const [yieldData, setYieldData] = useState([]);
  const [cropData, setCropData] = useState([]);
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveUpdate, setLiveUpdate] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ crops: [], states: [] });
  const [localFilters, setLocalFilters] = useState({ crop: 'all', state: 'all' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        crop: localFilters.crop !== 'all' ? localFilters.crop : undefined,
        state: localFilters.state !== 'all' ? localFilters.state : undefined,
        yearFrom: filters.yearFrom,
        yearTo: filters.yearTo,
      };

      const [statsRes, yieldRes, cropRes, priceRes, filterRes] = await Promise.all([
        analyticsAPI.getDashboardStats(params),
        analyticsAPI.getYieldTrend(params),
        analyticsAPI.getCropComparison(params),
        analyticsAPI.getPriceTrend(params),
        analyticsAPI.getFilterOptions(),
      ]);

      setStats(statsRes.data);
      setYieldData(yieldRes.data || []);
      setCropData((cropRes.data || []).slice(0, 8));
      setFilterOptions(filterRes.data || { crops: [], states: [] });

      // Process price data into per-crop series
      const priceMap = {};
      (priceRes.data || []).forEach(d => {
        if (!priceMap[d.year]) priceMap[d.year] = { year: d.year };
        priceMap[d.year][d.crop] = d.avgPrice;
      });
      setPriceData(Object.values(priceMap).sort((a, b) => a.year - b.year));
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [localFilters, filters.yearFrom, filters.yearTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => setLiveUpdate(data);
    socket.on('dashboard:update', handler);
    socket.on('data:uploaded', () => { toast.success('New data uploaded!'); fetchAll(); });
    return () => { socket.off('dashboard:update', handler); socket.off('data:uploaded'); };
  }, [socket, fetchAll]);

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4', '#ef4444', '#f97316', '#ec4899'];

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            Agricultural <span className="gradient-text">Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {stats ? `${stats.totalRecords.toLocaleString()} records across ${stats.totalStates} states` : 'Loading data...'}
            {liveUpdate && <span style={{ color: 'var(--accent-green)', marginLeft: 8, fontSize: 11 }}>● Live</span>}
          </p>
        </div>

        {/* Quick filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 150 }} value={localFilters.crop}
            onChange={e => setLocalFilters(p => ({ ...p, crop: e.target.value }))}>
            <option value="all">All Crops</option>
            {filterOptions.crops.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" style={{ width: 150 }} value={localFilters.state}
            onChange={e => setLocalFilters(p => ({ ...p, state: e.target.value }))}>
            <option value="all">All States</option>
            {filterOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={fetchAll}>↻ Refresh</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Total Records" value={stats?.totalRecords} icon="📊" loading={loading} sub="data points" />
        <StatCard label="Avg Yield" value={stats?.avgYield} icon="🌾" loading={loading} sub="kg/hectare" color="#3b82f6" trend={2.3} />
        <StatCard label="Avg Rainfall" value={stats?.avgRainfall} icon="🌧️" loading={loading} sub="mm annual" color="#06b6d4" />
        <StatCard label="Avg Price" value={stats ? `₹${stats.avgPrice}` : null} icon="💰" loading={loading} sub="per quintal" color="#f59e0b" trend={5.1} />
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        <StatCard label="Total Crops" value={stats?.totalCrops} icon="🌿" loading={loading} sub="varieties tracked" color="#a855f7" />
        <StatCard label="States Covered" value={stats?.totalStates} icon="🗺️" loading={loading} sub="across India" color="#f97316" />
        <StatCard label="Production" value={stats ? Math.round(stats.totalProduction / 1000) : null} icon="🏭" loading={loading} sub="thousand tonnes" color="#22c55e" />
        <StatCard label="Max Yield" value={stats?.maxYield} icon="⬆️" loading={loading} sub="kg/hectare peak" color="#ec4899" />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Yield trend */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Yield & Rainfall Trend</h3>
            <span className="badge badge-green">Annual</span>
          </div>
          <div style={{ height: 260 }}>
            {loading ? <div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /> : (
              <ResponsiveContainer>
                <AreaChart data={yieldData}>
                  <defs>
                    <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                  <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke="#06b6d4" fill="url(#rainGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="production" name="Production (T)" stroke="#22c55e" fill="url(#yieldGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Crop comparison donut-style */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Top Crops by Yield</h3>
          {loading ? <div className="skeleton" style={{ height: 260, borderRadius: 8 }} /> : (
            <div>
              {cropData.slice(0, 6).map((c, i) => {
                const max = cropData[0]?.avgYield || 1;
                const pct = Math.round((c.avgYield / max) * 100);
                return (
                  <div key={c.crop} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.crop}</span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: COLORS[i] }}>{c.avgYield.toLocaleString()} kg/ha</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Bar chart crop comparison */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Crop Production vs Area</h3>
          <div style={{ height: 260 }}>
            {loading ? <div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /> : (
              <ResponsiveContainer>
                <BarChart data={cropData.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                  <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="crop" stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgPrice" name="Avg Price (₹)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Price trend line */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Market Price Trends</h3>
          <div style={{ height: 260 }}>
            {loading ? <div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /> : (
              <ResponsiveContainer>
                <LineChart data={priceData.slice(-8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                  <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {['Rice', 'Wheat', 'Cotton', 'Soybean'].map((crop, i) => (
                    <Line key={crop} type="monotone" dataKey={crop} stroke={COLORS[i]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
