import React, { useState, useEffect } from 'react';
import { alertsAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

const SEVERITY_CONFIG = {
  low: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', icon: 'ℹ' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: '⚠' },
  high: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', icon: '🔔' },
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', icon: '🚨' },
};

const TYPE_LABEL = {
  price_change: 'Price Alert', yield_prediction: 'Yield Forecast',
  weather_alert: 'Weather', system: 'System', custom: 'Custom',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', severity: '', isRead: '' });
  const [selected, setSelected] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newAlert, setNewAlert] = useState({ title: '', message: '', type: 'custom', severity: 'medium', crop: '', state: '' });
  const { socket } = useSocket();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.type) params.type = filter.type;
      if (filter.severity) params.severity = filter.severity;
      if (filter.isRead !== '') params.isRead = filter.isRead;
      const res = await alertsAPI.getAlerts(params);
      setAlerts(res.data || []);
      setUnreadCount(res.unreadCount || 0);
    } catch { toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, [filter]);

  useEffect(() => {
    if (!socket) return;
    socket.on('alert:new', () => { fetchAlerts(); toast('🔔 New alert received!', { icon: '🌾' }); });
    return () => socket.off('alert:new');
  }, [socket]);

  const markRead = async (ids) => {
    await alertsAPI.markAsRead(ids || [...selected]);
    toast.success('Marked as read');
    setSelected(new Set());
    fetchAlerts();
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    await alertsAPI.deleteAlerts([...selected]);
    toast.success(`Deleted ${selected.size} alerts`);
    setSelected(new Set());
    fetchAlerts();
  };

  const sendEmail = async (id) => {
    try {
      await alertsAPI.sendEmail(id);
      toast.success('Email notification sent!');
    } catch { toast.error('Failed to send email'); }
  };

  const createAlert = async (e) => {
    e.preventDefault();
    try {
      await alertsAPI.createAlert(newAlert);
      toast.success('Alert created!');
      setShowCreate(false);
      setNewAlert({ title: '', message: '', type: 'custom', severity: 'medium', crop: '', state: '' });
      fetchAlerts();
    } catch { toast.error('Failed to create alert'); }
  };

  const toggleSelect = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            Alert <span className="gradient-text">Center</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {unreadCount > 0 ? <span style={{ color: 'var(--accent-red)' }}>{unreadCount} unread alerts</span> : 'All caught up!'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {selected.size > 0 && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => markRead()}>✓ Mark Read ({selected.size})</button>
              <button className="btn btn-danger btn-sm" onClick={deleteSelected}>✕ Delete ({selected.size})</button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => markRead([])}>✓ Mark All Read</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Create Alert</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="input" style={{ width: 130 }} value={filter.type} onChange={e => setFilter(p => ({ ...p, type: e.target.value }))}>
            <option value="">All Types</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input" style={{ width: 130 }} value={filter.severity} onChange={e => setFilter(p => ({ ...p, severity: e.target.value }))}>
            <option value="">All Severity</option>
            {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="input" style={{ width: 130 }} value={filter.isRead} onChange={e => setFilter(p => ({ ...p, isRead: e.target.value }))}>
            <option value="">All Status</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => setFilter({ type: '', severity: '', isRead: '' })}>Reset</button>
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 12 }} />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No alerts found</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Alerts are generated automatically from AI predictions and price changes.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
            return (
              <div key={alert._id} style={{
                background: 'var(--bg-card)', border: `1px solid ${selected.has(alert._id) ? 'var(--accent-green)' : alert.isRead ? 'var(--border)' : cfg.border}`,
                borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start',
                opacity: alert.isRead ? 0.75 : 1, transition: 'all 0.2s',
              }}>
                {/* Checkbox */}
                <input type="checkbox" checked={selected.has(alert._id)} onChange={() => toggleSelect(alert._id)}
                  style={{ marginTop: 4, accentColor: 'var(--accent-green)', cursor: 'pointer' }} />

                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: cfg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>{cfg.icon}</div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{alert.title}</span>
                      {!alert.isRead && <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>{alert.message}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {alert.severity}
                    </span>
                    <span className="badge badge-blue">{TYPE_LABEL[alert.type] || alert.type}</span>
                    {alert.crop && <span className="badge badge-green">{alert.crop}</span>}
                    {alert.state && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{alert.state}</span>}
                    {alert.isEmailSent && <span className="badge badge-purple">📧 Sent</span>}

                    {/* Actions */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      {!alert.isRead && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { markRead([alert._id]); }}>
                          ✓ Mark read
                        </button>
                      )}
                      {!alert.isEmailSent && (
                        <button className="btn btn-secondary btn-sm" onClick={() => sendEmail(alert._id)}>
                          📧 Email
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Alert Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 480, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18 }}>Create Custom Alert</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <form onSubmit={createAlert} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>TITLE *</label>
                <input className="input" value={newAlert.title} onChange={e => setNewAlert(p => ({ ...p, title: e.target.value }))} required placeholder="Alert title..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>MESSAGE *</label>
                <textarea className="input" rows={3} value={newAlert.message} onChange={e => setNewAlert(p => ({ ...p, message: e.target.value }))} required placeholder="Alert details..." style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>TYPE</label>
                  <select className="input" value={newAlert.type} onChange={e => setNewAlert(p => ({ ...p, type: e.target.value }))}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>SEVERITY</label>
                  <select className="input" value={newAlert.severity} onChange={e => setNewAlert(p => ({ ...p, severity: e.target.value }))}>
                    {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>CROP (optional)</label>
                  <input className="input" placeholder="e.g. Wheat" value={newAlert.crop} onChange={e => setNewAlert(p => ({ ...p, crop: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>STATE (optional)</label>
                  <input className="input" placeholder="e.g. Punjab" value={newAlert.state} onChange={e => setNewAlert(p => ({ ...p, state: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Create Alert</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
