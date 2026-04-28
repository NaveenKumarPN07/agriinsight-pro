import React, { useState, useEffect } from 'react';
import { predictionsAPI, analyticsAPI } from '../services/api';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
          {p.name?.includes('Price') ? ' ₹' : ' kg/ha'}
        </p>
      ))}
    </div>
  );
};

const ConfidenceMeter = ({ value }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Prediction Confidence</span>
      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: value > 70 ? '#22c55e' : value > 50 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>{value}%</span>
    </div>
    <div className="progress-bar" style={{ height: 8 }}>
      <div className="progress-fill" style={{ width: `${value}%`, background: value > 70 ? 'linear-gradient(90deg, #22c55e, #06b6d4)' : value > 50 ? 'linear-gradient(90deg, #f59e0b, #f97316)' : '#ef4444' }} />
    </div>
  </div>
);

export default function PredictionsPage() {
  const [activeType, setActiveType] = useState('yield');
  const [form, setForm] = useState({ crop: '', state: '', targetYear: new Date().getFullYear() + 1, periods: 3 });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [options, setOptions] = useState({ crops: [], states: [] });
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getFilterOptions().then(r => setOptions(r.data)).catch(() => {});
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const res = await predictionsAPI.getHistory();
      setHistory(res.data || []);
    } catch {}
    finally { setHistLoading(false); }
  };

  const handlePredict = async () => {
    if (!form.crop || !form.state) { toast.error('Please select a crop and state'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = activeType === 'yield'
        ? await predictionsAPI.predictYield({ crop: form.crop, state: form.state, targetYear: form.targetYear })
        : await predictionsAPI.predictPrice({ crop: form.crop, state: form.state, targetYear: form.targetYear, periods: form.periods });
      setResult(res.prediction);
      toast.success('Prediction generated successfully!');
      loadHistory();
    } catch (err) {
      toast.error(err.error || 'Prediction failed. Ensure you have enough historical data.');
    } finally {
      setLoading(false);
    }
  };

  // Build chart data combining historical + forecast
  const buildChartData = () => {
    if (!result) return [];
    const hist = (result.historicalData || []).map(d => ({
      year: d.year,
      actual: activeType === 'yield' ? d.yield : d.price,
      type: 'historical',
    }));
    const fore = (result.forecastData || []).map(d => ({
      year: d.year,
      predicted: activeType === 'yield' ? d.predictedYield : d.predictedPrice,
      upper: d.upperBound,
      lower: d.lowerBound,
      type: 'forecast',
    }));
    return [...hist, ...fore];
  };

  const chartData = buildChartData();
  const lastHistYear = result?.historicalData?.slice(-1)?.[0]?.year;

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
          AI <span className="gradient-text">Predictions</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Machine learning forecasts for crop yield and market prices</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Control Panel */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>PREDICTION ENGINE</h3>

            {/* Type toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {['yield', 'price'].map(t => (
                <button key={t} onClick={() => { setActiveType(t); setResult(null); }} style={{
                  padding: '10px', borderRadius: 8, border: `1px solid ${activeType === t ? 'var(--accent-green)' : 'var(--border)'}`,
                  background: activeType === t ? 'rgba(34,197,94,0.1)' : 'transparent',
                  color: activeType === t ? 'var(--accent-green)' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 13, fontWeight: activeType === t ? 600 : 400,
                  fontFamily: 'var(--font-body)',
                }}>
                  {t === 'yield' ? '🌾 Yield' : '💰 Price'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Crop *</label>
                <select className="input" value={form.crop} onChange={e => setForm(p => ({ ...p, crop: e.target.value }))}>
                  <option value="">Select crop...</option>
                  {options.crops.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>State *</label>
                <select className="input" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}>
                  <option value="">Select state...</option>
                  {options.states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Target Year</label>
                <input className="input" type="number" value={form.targetYear} min={2024} max={2035}
                  onChange={e => setForm(p => ({ ...p, targetYear: parseInt(e.target.value) }))} />
              </div>
              {activeType === 'price' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Forecast Periods</label>
                  <input className="input" type="number" value={form.periods} min={1} max={10}
                    onChange={e => setForm(p => ({ ...p, periods: parseInt(e.target.value) }))} />
                </div>
              )}
            </div>

            {/* Algorithm info */}
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(59,130,246,0.06)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)' }}>
              <p style={{ fontSize: 11, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
                {activeType === 'yield' ? '⚡ Algorithm: Linear Regression' : '⚡ Algorithm: Exp. Smoothing + Regression'}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {activeType === 'yield' ? 'Uses year + rainfall as features' : 'Time-series with confidence bands'}
              </p>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '12px' }}
              onClick={handlePredict} disabled={loading}>
              {loading ? '🔄 Generating...' : `◎ Generate ${activeType === 'yield' ? 'Yield' : 'Price'} Forecast`}
            </button>
          </div>

          {/* Result card */}
          {result && (
            <div className="card animate-fade-in" style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
              <h3 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>PREDICTION RESULT</h3>
              <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-green)', marginBottom: 4 }}>
                {activeType === 'price' ? '₹' : ''}{result.predictedValue?.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                {activeType === 'yield' ? 'kg/hectare' : '₹/quintal'} in {result.targetYear}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span className={`badge ${result.changePct >= 0 ? 'badge-green' : 'badge-red'}`}>
                  {result.changePct >= 0 ? '↑' : '↓'} {Math.abs(result.changePct || 0)}%
                </span>
                <span className="badge badge-blue">{result.trend}</span>
              </div>

              <ConfidenceMeter value={result.confidence} />

              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'R² Score', value: result.r2Score },
                  { label: 'RMSE', value: result.rmse },
                ].map(m => (
                  <div key={m.label} style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: 2 }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart + History */}
        <div>
          {result && chartData.length > 0 && (
            <div className="card animate-fade-in" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>Forecast Visualization</h3>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>● Historical</span>
                  <span style={{ color: 'var(--accent-green)' }}>⬤ Forecast</span>
                </div>
              </div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                    <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {lastHistYear && <ReferenceLine x={lastHistYear} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: 'Now', fill: 'var(--text-muted)', fontSize: 10 }} />}
                    {result.forecastData?.[0]?.upperBound && (
                      <Area type="monotone" dataKey="upper" name="Upper Bound" stroke="transparent" fill="url(#bandGrad)" legendType="none" />
                    )}
                    <Area type="monotone" dataKey="actual" name={activeType === 'yield' ? 'Actual Yield' : 'Actual Price'} stroke="#3b82f6" fill="none" strokeWidth={2} dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="predicted" name={activeType === 'yield' ? 'Predicted Yield' : 'Predicted Price'} stroke="#22c55e" fill="url(#forecastGrad)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: '#22c55e' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Prediction History */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>PREDICTION HISTORY</h3>
            {histLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 50, borderRadius: 8 }} />)}
              </div>
            ) : history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                No predictions yet. Run your first forecast above!
              </p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Type</th><th>Crop</th><th>State</th><th>Year</th><th>Value</th><th>Confidence</th><th>Date</th></tr></thead>
                  <tbody>
                    {history.slice(0, 15).map(p => (
                      <tr key={p._id}>
                        <td><span className={`badge ${p.type === 'yield' ? 'badge-green' : 'badge-amber'}`}>{p.type}</span></td>
                        <td>{p.crop}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.state}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{p.targetYear}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                          {p.type === 'price' ? '₹' : ''}{p.predictedValue?.toLocaleString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 40, height: 4, background: 'var(--bg-input)', borderRadius: 2 }}>
                              <div style={{ width: `${p.confidence}%`, height: '100%', background: p.confidence > 70 ? '#22c55e' : '#f59e0b', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{p.confidence}%</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
