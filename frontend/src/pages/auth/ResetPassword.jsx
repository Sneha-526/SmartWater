import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(password);
      toast.success('Password reset successfully! 🎉');
      navigate('/login/user');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(0,210,255,${0.03 + i * 0.01}) 0%, transparent 70%)`,
            width: `${200 + i * 120}px`,
            height: `${200 + i * 120}px`,
            left: `${(i * 25) % 100}%`,
            top: `${(i * 30) % 100}%`,
            transform: 'translate(-50%, -50%)',
            animation: `float ${5 + i}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🔐</span>
          <h1>Reset Password</h1>
          <p style={{ color: 'var(--text-muted)' }}>Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? <><span className="spinner spinner-sm" /> Resetting...</> : '🔒 Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
