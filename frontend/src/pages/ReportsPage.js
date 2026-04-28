import React, { useState, useRef } from 'react';
import { analyticsAPI } from '../services/api';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [reportConfig, setReportConfig] = useState({
    title: 'Agricultural Analytics Report',
    crop: 'all', state: 'all', yearFrom: 2019, yearTo: 2024,
    includeYield: true, includePrice: true, includeCrop: true, includeRainfall: true,
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = {
        crop: reportConfig.crop !== 'all' ? reportConfig.crop : undefined,
        state: reportConfig.state !== 'all' ? reportConfig.state : undefined,
        yearFrom: reportConfig.yearFrom, yearTo: reportConfig.yearTo,
      };
      const [stats, yield_, crop, price] = await Promise.all([
        analyticsAPI.getDashboardStats(params),
        analyticsAPI.getYieldTrend(params),
        analyticsAPI.getCropComparison(params),
        analyticsAPI.getPriceTrend(params),
      ]);
      setData({ stats: stats.data, yieldData: yield_.data, cropData: crop.data, priceData: price.data });
      toast.success('Report data loaded!');
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#050d1a', scale: 1.5, useCORS: true, logging: false,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgW = 210;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 0;
      const pageH = 297;

      while (y < imgH) {
        const sourceY = (y * canvas.height) / imgH;
        const sourceH = Math.min((pageH * canvas.height) / imgH, canvas.height - sourceY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceH;
        const ctx = pageCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, -sourceY);

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, imgW, Math.min(pageH, imgH - y));
        y += pageH;
      }

      pdf.save(`agriinsight-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully!');
    } catch (e) {
      console.error(e);
      toast.error('PDF export failed. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const priceByYear = {};
  (data?.priceData || []).forEach(d => {
    if (!priceByYear[d.year]) priceByYear[d.year] = { year: d.year };
    priceByYear[d.year][d.crop] = d.avgPrice;
  });
  const priceChartData = Object.values(priceByYear).sort((a, b) => a.year - b.year);

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            Report <span className="gradient-text">Generator</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Generate and export comprehensive analytics reports as PDF</p>
        </div>
        {data && (
          <button className="btn btn-primary" onClick={exportPDF} disabled={generating}>
            {generating ? '⏳ Generating PDF...' : '↓ Export PDF'}
          </button>
        )}
      </div>

      {/* Config */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>REPORT CONFIGURATION</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>REPORT TITLE</label>
            <input className="input" value={reportConfig.title} onChange={e => setReportConfig(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>YEAR FROM</label>
            <input className="input" type="number" value={reportConfig.yearFrom} onChange={e => setReportConfig(p => ({ ...p, yearFrom: parseInt(e.target.value) }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>YEAR TO</label>
            <input className="input" type="number" value={reportConfig.yearTo} onChange={e => setReportConfig(p => ({ ...p, yearTo: parseInt(e.target.value) }))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { key: 'includeYield', label: 'Yield Analysis' },
            { key: 'includePrice', label: 'Price Trends' },
            { key: 'includeCrop', label: 'Crop Comparison' },
            { key: 'includeRainfall', label: 'Rainfall Data' },
          ].map(s => (
            <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={reportConfig[s.key]}
                onChange={e => setReportConfig(p => ({ ...p, [s.key]: e.target.checked }))}
                style={{ accentColor: 'var(--accent-green)', width: 14, height: 14 }} />
              {s.label}
            </label>
          ))}
        </div>
        <button className="btn btn-primary" onClick={generateReport} disabled={loading}>
          {loading ? '⏳ Loading data...' : '◎ Generate Report'}
        </button>
      </div>

      {/* Report Preview */}
      {data && (
        <div ref={reportRef} style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {/* Report Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0a1628 0%, #0f2040 100%)',
            padding: '40px 36px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>🌾</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--accent-green)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>AgriInsight Pro</span>
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>{reportConfig.title}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Period: {reportConfig.yearFrom} – {reportConfig.yearTo}
                  {reportConfig.crop !== 'all' && ` • Crop: ${reportConfig.crop}`}
                  {reportConfig.state !== 'all' && ` • State: ${reportConfig.state}`}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generated on</p>
                <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '32px 36px' }}>
            {/* Summary stats */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, fontFamily: 'var(--font-display)', marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Executive Summary</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                  { label: 'Total Records', value: data.stats?.totalRecords?.toLocaleString(), color: '#22c55e' },
                  { label: 'Avg Yield', value: `${data.stats?.avgYield?.toLocaleString()} kg/ha`, color: '#3b82f6' },
                  { label: 'Avg Price', value: `₹${data.stats?.avgPrice?.toLocaleString()}/q`, color: '#f59e0b' },
                  { label: 'States Covered', value: data.stats?.totalStates, color: '#a855f7' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)', marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Yield Trend */}
            {reportConfig.includeYield && data.yieldData.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 16, fontFamily: 'var(--font-display)', marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Yield & Rainfall Analysis</h2>
                <div className="card">
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer>
                      <AreaChart data={data.yieldData}>
                        <defs>
                          <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                        <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke="#06b6d4" fill="url(#rGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="production" name="Production (T)" stroke="#22c55e" fill="none" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Crop comparison */}
            {reportConfig.includeCrop && data.cropData.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 16, fontFamily: 'var(--font-display)', marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Crop Performance Comparison</h2>
                <div className="card">
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={data.cropData.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                        <XAxis dataKey="crop" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="avgYield" name="Avg Yield (kg/ha)" fill="#22c55e" radius={[4,4,0,0]} />
                        <Bar dataKey="avgPrice" name="Avg Price (₹)" fill="#f59e0b" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Price trends */}
            {reportConfig.includePrice && priceChartData.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 16, fontFamily: 'var(--font-display)', marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Market Price Trends</h2>
                <div className="card">
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer>
                      <LineChart data={priceChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.5)" />
                        <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {['Rice', 'Wheat', 'Cotton', 'Soybean'].map((crop, i) => (
                          <Line key={crop} type="monotone" dataKey={crop} stroke={['#22c55e','#3b82f6','#f59e0b','#a855f7'][i]} strokeWidth={2} dot={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🌾</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--accent-green)', fontWeight: 700 }}>AgriInsight Pro</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confidential — AI-Powered Agricultural Intelligence Platform</p>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Configure and generate your report</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Set your parameters above and click "Generate Report"</p>
        </div>
      )}
    </div>
  );
}
