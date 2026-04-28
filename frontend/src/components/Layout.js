import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { alertsAPI } from '../services/api';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { path: '/analytics', icon: '◈', label: 'Analytics' },
  { path: '/predictions', icon: '◎', label: 'AI Predictions' },
  { path: '/geo', icon: '⊕', label: 'Geo Insights' },
  { path: '/upload', icon: '⊛', label: 'Data Upload' },
  { path: '/alerts', icon: '◉', label: 'Alerts' },
  { path: '/reports', icon: '▣', label: 'Reports' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  useEffect(() => {
    alertsAPI.getAlerts({ isRead: false, limit: 1 })
      .then(res => setUnreadCount(res.unreadCount || 0))
      .catch(() => {});
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 240, minWidth: collapsed ? 64 : 240,
        background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', transition: 'width 0.25s ease',
        overflow: 'hidden', zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, minWidth: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#000',
          }}>🌾</div>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>AgriInsight</div>
              <div style={{ fontSize: 10, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>PRO</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 10, marginBottom: 2,
              color: isActive ? '#000' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-green)' : 'transparent',
              textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
              transition: 'all 0.2s', whiteSpace: 'nowrap', overflow: 'hidden',
              position: 'relative',
            })}>
              {({ isActive }) => (
                <>
                  <span style={{ fontSize: 18, minWidth: 20, textAlign: 'center' }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                  {item.label === 'Alerts' && unreadCount > 0 && !collapsed && (
                    <span style={{
                      marginLeft: 'auto', background: 'var(--accent-red)', color: '#fff',
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                      minWidth: 18, textAlign: 'center', fontFamily: 'var(--font-mono)',
                    }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          {/* Socket status */}
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? 'var(--accent-green)' : 'var(--accent-red)', boxShadow: `0 0 6px ${connected ? 'var(--accent-green)' : 'var(--accent-red)'}` }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{connected ? 'Live' : 'Offline'}</span>
            </div>
          )}

          {/* User */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(!showUserMenu)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, background: 'transparent',
              border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
            }}>
              <div style={{
                width: 30, height: 30, minWidth: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#000',
              }}>{user?.name?.[0]?.toUpperCase()}</div>
              {!collapsed && (
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user?.role}</div>
                </div>
              )}
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute', bottom: '110%', left: 0, right: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 8, zIndex: 200,
              }}>
                <NavLink to="/profile" onClick={() => setShowUserMenu(false)} style={{ display: 'block', padding: '8px 12px', color: 'var(--text-primary)', textDecoration: 'none', borderRadius: 6, fontSize: 13 }}>
                  👤 Profile Settings
                </NavLink>
                <button onClick={logout} style={{ width: '100%', padding: '8px 12px', color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 6, fontSize: 13 }}>
                  ⎋ Logout
                </button>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <button onClick={() => setCollapsed(!collapsed)} style={{
            width: '100%', padding: '8px 12px', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, textAlign: 'center',
            marginTop: 4,
          }}>
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
