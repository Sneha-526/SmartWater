import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const VendorAuth = () => {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', address: '',
  });

  const { loginWithEmail, register: registerUser } = useAuth(); // ✅ correct functions
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        // ✅ Use loginWithEmail with role: 'vendor'
        await loginWithEmail({
          email: form.email,
          password: form.password,
          role: 'vendor',
        });
        toast.success(`Welcome back! 🏪`);
        navigate('/vendor');
      } else {
        // ✅ Use registerUser with role: 'vendor'
        await registerUser({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          address: form.address,
          role: 'vendor',
        });
        toast.success(`Vendor account created! Welcome, ${form.name}! 🎉`);
        navigate('/vendor');
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Purple tinted BG bubbles for vendor */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(139,92,246,${0.03 + i * 0.01}) 0%, transparent 70%)`,
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            left: `${(i * 19 + 5) % 100}%`,
            top: `${(i * 29 + 5) % 100}%`,
            transform: 'translate(-50%, -50%)',
            animation: `float ${4 + i}s ease-in-out infinite`,
            animationDelay: `${i * 0.7}s`,
          }} />
        ))}
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🏪</span>
          <h1 style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            SmartAqua
          </h1>
          <p>Vendor Portal</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
            id="vendor-login-tab"
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
            id="vendor-register-tab"
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input
                id="vendor-name"
                className="form-input"
                name="name"
                type="text"
                placeholder="AquaFlow Water Suppliers"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="vendor-email"
              className="form-input"
              name="email"
              type="email"
              placeholder="vendor@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                id="vendor-phone"
                className="form-input"
                name="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="vendor-password"
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
            <div className="form-group">
              <label className="form-label">Business Address</label>
              <input
                id="vendor-address"
                className="form-input"
                name="address"
                type="text"
                placeholder="Shop 42, Water Colony, Mumbai"
                value={form.address}
                onChange={handleChange}
              />
            </div>
          )}

          <button
            id="vendor-auth-submit"
            type="submit"
            className="btn btn-full btn-lg"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
              border: 'none',
            }}
          >
            {loading ? (
              <><span className="spinner spinner-sm" /> {mode === 'login' ? 'Signing In...' : 'Registering...'}</>
            ) : (
              mode === 'login' ? '🚀 Sign In as Vendor' : '🏪 Register as Vendor'
            )}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Looking to order water?
          </p>
          <Link to="/login/user" className="btn btn-ghost btn-sm" id="switch-to-user">
            💧 Customer Login →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorAuth;