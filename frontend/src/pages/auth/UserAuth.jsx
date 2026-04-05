import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const UserAuth = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', address: '', phone: '',
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const { loginWithEmail, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail({
          email: form.email,
          password: form.password,
          role: 'user',
        });
        toast.success(`Welcome back! 👋`);
        navigate('/user');

      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          address: form.address,
          role: 'user',
        });
        toast.success(`Account created! Welcome, ${form.name}! 🎉`);
        navigate('/user');
      }

    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page">
      {/* BG bubbles */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(0,210,255,${0.03 + i * 0.01}) 0%, transparent 70%)`,
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            left: `${(i * 17) % 100}%`,
            top: `${(i * 23) % 100}%`,
            transform: 'translate(-50%, -50%)',
            animation: `float ${4 + i}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }} />
        ))}
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">💧</span>
          <h1>SmartAqua</h1>
          <p>Customer Portal</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
            id="login-tab"
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
            id="register-tab"
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                id="user-name"
                className="form-input"
                name="name"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="user-email"
              className="form-input"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="user-password"
              className="form-input"
              name="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  id="user-phone"
                  className="form-input"
                  name="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Default Address (Optional)</label>
                <input
                  id="user-address"
                  className="form-input"
                  name="address"
                  type="text"
                  placeholder="123 Main St, Mumbai"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <button
            id="user-auth-submit"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <><span className="spinner spinner-sm" /> {mode === 'login' ? 'Signing In...' : 'Creating Account...'}</>
            ) : (
              mode === 'login' ? '🚀 Sign In' : '✨ Create Account'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Are you a supplier?
          </p>
          <Link to="/login/vendor" className="btn btn-ghost btn-sm" id="switch-to-vendor">
            🏪 Vendor Login →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserAuth;
