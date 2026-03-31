import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const Navbar = ({ title }) => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to={user?.role === 'vendor' ? '/vendor' : '/user'} className="navbar-brand">
          <span className="brand-icon">💧</span>
          SmartAqua
        </Link>

        <div className="navbar-actions">
          {/* Connection indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.75rem',
            background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
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
            }} />
            {isConnected ? 'Live' : 'Offline'}
          </div>

          {user && (
            <div className="navbar-user">
              <span>👤</span>
              <strong>{user.name?.split(' ')[0]}</strong>
              <span style={{
                padding: '0.15rem 0.5rem',
                background: user.role === 'vendor'
                  ? 'rgba(139, 92, 246, 0.2)'
                  : 'rgba(0, 210, 255, 0.1)',
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
      </div>
    </nav>
  );
};

export default Navbar;
