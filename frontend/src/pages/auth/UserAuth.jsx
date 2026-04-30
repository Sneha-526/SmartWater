import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const UserAuth = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'otp' | 'forgot'
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', address: '', phone: '',
  });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpEmail, setOtpEmail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [forgotEmail, setForgotEmail] = useState('');
  const otpRefs = useRef([]);

  const navigate = useNavigate();
  const { loginWithEmail, register, verifyOtp, resendOtp, loginWithGoogle, handleGoogleCallback } = useAuth();

  // Handle Google OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
      handleGoogleCallback('user').then((data) => {
        if (data?.success) {
          toast.success('Signed in with Google! 🎉');
          navigate('/user');
        }
      }).catch((err) => toast.error(err.message));
    }
  }, []);

  // OTP countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...otpDigits];
    pasted.split('').forEach((ch, i) => { newDigits[i] = ch; });
    setOtpDigits(newDigits);
    if (pasted.length > 0) {
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

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

      } else if (mode === 'register') {
        const result = await register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          address: form.address,
          role: 'user',
        });

        if (result.requiresOtp) {
          setOtpEmail(form.email);
          setMode('otp');
          setCountdown(60);
          toast.success('OTP sent to your email! 📧');
        } else {
          toast.success(`Account created! Welcome, ${form.name}! 🎉`);
          navigate('/user');
        }

      } else if (mode === 'otp') {
        const otp = otpDigits.join('');
        if (otp.length < 6) {
          toast.error('Please enter the complete 6-digit OTP.');
          setLoading(false);
          return;
        }

        await verifyOtp({ email: otpEmail, otp, role: 'user' });
        toast.success('Email verified! Welcome! 🎉');
        navigate('/user');

      } else if (mode === 'forgot') {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${API_URL}/users/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        toast.success('Password reset link sent to your email! 📧');
        setMode('login');
      }

    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    try {
      await resendOtp({ email: otpEmail, role: 'user' });
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      toast.success('New OTP sent! 📧');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle('user');
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed.');
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

        {/* ── OTP Verification Screen ── */}
        {mode === 'otp' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📧</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Verify Your Email</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                We sent a 6-digit code to <strong style={{ color: 'var(--primary)' }}>{otpEmail}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="otp-input-group" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="otp-input"
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || otpDigits.join('').length < 6}
                style={{ marginTop: '1rem' }}
              >
                {loading ? <><span className="spinner spinner-sm" /> Verifying...</> : '✅ Verify & Continue'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleResendOtp}
                disabled={countdown > 0}
                style={{ color: countdown > 0 ? 'var(--text-muted)' : 'var(--primary)' }}
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : '🔄 Resend OTP'}
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setMode('register'); setOtpDigits(['', '', '', '', '', '']); }}>
                ← Back to Sign Up
              </button>
            </div>
          </>
        )}

        {/* ── Forgot Password Screen ── */}
        {mode === 'forgot' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Forgot Password?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="john@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? <><span className="spinner spinner-sm" /> Sending...</> : '📧 Send Reset Link'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setMode('login')}>
                ← Back to Sign In
              </button>
            </div>
          </>
        )}

        {/* ── Login / Register Screen ── */}
        {(mode === 'login' || mode === 'register') && (
          <>
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

              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: '-0.25rem', marginBottom: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => setMode('forgot')}
                    style={{ fontSize: '0.82rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>
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

            {/* Divider */}
            <div className="auth-divider">
              <span>or</span>
            </div>

            {/* Google Sign-In */}
            <button
              className="btn btn-google btn-full"
              onClick={handleGoogleLogin}
              disabled={loading}
              id="google-signin-btn"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: '0.5rem', flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Are you a supplier?
              </p>
              <Link to="/login/vendor" className="btn btn-ghost btn-sm" id="switch-to-vendor">
                🏪 Vendor Login →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserAuth;
