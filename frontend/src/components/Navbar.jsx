import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const Navbar = ({ title }) => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to={user?.role === 'vendor' ? '/vendor' : user ? '/user' : '/'} className="navbar-brand">
          <span className="brand-icon">💧</span>
          SmartAqua
        </Link>

        {/* Desktop actions */}
        <div className="navbar-actions navbar-desktop">
          {/* Connection indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.75rem',
            background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            color: isConnected ? 'var(--status-delivered)' : 'var(--status-rejected)',
            fontWeight: 600,
          }}>
            <span style={{
              width: 7, height: 7,
              borderRadius: '50%',
              background: isConnected ? 'var(--status-delivered)' : 'var(--status-rejected)',
              animation: isConnected ? 'pulse 2s ease-in-out infinite' : 'none',
              flexShrink: 0,
            }} />
            {isConnected ? 'Live' : 'Offline'}
          </div>

          {user && (
            <div className="navbar-user">
              <span>👤</span>
              <strong>{user.name?.split(' ')[0]}</strong>
              <span style={{
                padding: '0.15rem 0.5rem',
                background: user.role === 'vendor' ? 'rgba(139,92,246,0.2)' : 'rgba(0,210,255,0.1)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: user.role === 'vendor' ? '#8b5cf6' : 'var(--primary)',
              }}>
                {user.role}
              </span>
            </div>
          )}

          <button onClick={handleLogout} className="btn btn-secondary btn-sm" id="logout-btn">
            Sign Out
          </button>
        </div>

        {/* Mobile: connection dot + hamburger */}
        <div className="navbar-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Small connection dot only */}
          <span style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: isConnected ? 'var(--status-delivered)' : 'var(--status-rejected)',
            animation: isConnected ? 'pulse 2s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }} />

          {/* Hamburger button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '0.4rem 0.6rem',
              fontSize: '1.1rem',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{
          background: 'rgba(6,13,26,0.97)',
          backdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'var(--bg-glass)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}>
              <span>👤</span>
              <strong style={{ color: 'var(--primary)' }}>{user.name?.split(' ')[0]}</strong>
              <span style={{
                padding: '0.15rem 0.5rem',
                background: user.role === 'vendor' ? 'rgba(139,92,246,0.2)' : 'rgba(0,210,255,0.1)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                color: user.role === 'vendor' ? '#8b5cf6' : 'var(--primary)',
              }}>
                {user.role}
              </span>
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.75rem',
                color: isConnected ? 'var(--status-delivered)' : 'var(--status-rejected)',
                fontWeight: 600,
              }}>
                {isConnected ? '🟢 Live' : '🔴 Offline'}
              </span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;