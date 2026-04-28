import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', organization: user?.organization || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await authAPI.updateProfile(profileForm);
      updateUser(res.user);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
    finally { setProfileLoading(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setPwLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.error || 'Failed to change password'); }
    finally { setPwLoading(false); }
  };

  const STATS = [
    { label: 'Role', value: user?.role, color: '#22c55e' },
    { label: 'Member Since', value: new Date(user?.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }), color: '#3b82f6' },
    { label: 'Last Login', value: user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A', color: '#f59e0b' },
    { label: 'Organization', value: user?.organization || 'Not set', color: '#a855f7' },
  ];

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.4s ease', maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
          Profile <span className="gradient-text">Settings</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Manage your account and preferences</p>
      </div>

      {/* Avatar & Stats */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 700, color: '#000', flexShrink: 0,
        }}>{user?.name?.[0]?.toUpperCase()}</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{user?.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Profile form */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>ACCOUNT INFORMATION</h3>
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>FULL NAME</label>
              <input className="input" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>EMAIL ADDRESS</label>
              <input className="input" value={user?.email} disabled style={{ opacity: 0.5 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>ORGANIZATION</label>
              <input className="input" value={profileForm.organization} onChange={e => setProfileForm(p => ({ ...p, organization: e.target.value }))} placeholder="Your organization..." />
            </div>
            <button type="submit" className="btn btn-primary" disabled={profileLoading} style={{ justifyContent: 'center' }}>
              {profileLoading ? '⏳ Saving...' : '✓ Save Changes'}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>CHANGE PASSWORD</h3>
          <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'currentPassword', label: 'CURRENT PASSWORD' },
              { key: 'newPassword', label: 'NEW PASSWORD' },
              { key: 'confirmPassword', label: 'CONFIRM PASSWORD' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{f.label}</label>
                <input className="input" type="password" value={pwForm[f.key]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder="••••••••" required />
              </div>
            ))}
            <button type="submit" className="btn btn-secondary" disabled={pwLoading} style={{ justifyContent: 'center' }}>
              {pwLoading ? '⏳ Changing...' : '🔒 Change Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Platform info */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>PLATFORM INFORMATION</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Platform', value: 'AgriInsight Pro v1.0' },
            { label: 'Stack', value: 'React + Node.js + MongoDB' },
            { label: 'ML Engine', value: 'Linear Regression + Exp. Smoothing' },
            { label: 'Maps', value: 'Leaflet.js + OpenStreetMap' },
            { label: 'Charts', value: 'Recharts + Chart.js' },
            { label: 'Realtime', value: 'Socket.IO' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
