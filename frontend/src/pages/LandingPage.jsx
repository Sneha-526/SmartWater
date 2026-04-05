import React from 'react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ icon, title, desc }) => (
  <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
    <div style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block' }}>{icon}</div>
    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-white)' }}>{title}</h3>
    <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{desc}</p>
  </div>
);

const LandingPage = () => {
  return (
    <div className="page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand">
            <span className="brand-icon">💧</span>
            SmartAqua
          </div>
          <div className="navbar-actions" style={{ gap: '0.5rem' }}>
            <Link to="/login/user" className="btn btn-secondary btn-sm" id="user-login-nav">
              <span className="hide-xs"></span>Customer
            </Link>
            <Link to="/login/vendor" className="btn btn-primary btn-sm" id="vendor-login-nav">
              <span className="hide-xs"></span>Vendor
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" style={{ position: 'relative', zIndex: 1 }}>
        <div className="hero-tagline">
          <span>⚡</span> Real-time water delivery
        </div>
        <h1 className="hero-title">
          Pure Water,<br />
          <span>Delivered Fast</span>
        </h1>
        <p className="hero-subtitle">
          Order 1L, 2L, 10L, or 20L water jars and get them delivered to your doorstep.
          Track your delivery in real-time.
        </p>

        <div className="hero-cta" style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '3rem',
        }}>
          <Link to="/login/user" className="btn btn-primary btn-lg" id="get-started-btn">
            🚀 Order Water Now
          </Link>
          <Link to="/login/vendor" className="btn btn-secondary btn-lg" id="vendor-signup-btn">
            🏪 Become a Vendor
          </Link>
        </div>

        <div className="stats-row">
          {[
            { value: '500+', label: 'Happy Customers' },
            { value: '50+', label: 'Active Vendors' },
            { value: '30min', label: 'Avg Delivery' },
            { value: '4.9★', label: 'Rating' },
          ].map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '4rem 1.5rem', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>Why SmartAqua?</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
            Everything you need for reliable water delivery
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}>
            <FeatureCard icon="📍" title="GPS + Map Selection" desc="Use your GPS location or click on the map to set your precise delivery address." />
            <FeatureCard icon="⚡" title="Real-time Tracking" desc="Get instant notifications as your order moves from accepted to on the way to delivered." />
            <FeatureCard icon="🧊" title="Multiple Jar Sizes" desc="Choose from 1L, 2L, 10L, and 20L jars. Mix and match quantities as you need." />
            <FeatureCard icon="🔒" title="Secure & Reliable" desc="JWT-secured accounts, verified vendors, and guaranteed delivery tracking." />
          </div>
        </div>
      </section>

      {/* Jar Sizes Pricing — FIXED: responsive grid */}
      <section style={{ padding: '2rem 1.5rem 5rem', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>Water Jar Sizes</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
            Transparent pricing, no hidden fees
          </p>
          {/* ✅ Fixed: use auto-fit so it wraps on small screens */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '1rem',
            maxWidth: '700px',
            margin: '0 auto',
          }}>
            {[
              { size: '1L', icon: '🥤', price: '₹10' },
              { size: '2L', icon: '💧', price: '₹18' },
              { size: '10L', icon: '🫙', price: '₹60' },
              { size: '20L', icon: '🛢️', price: '₹100' },
            ].map((jar) => (
              <div key={jar.size} className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{jar.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-white)' }}>{jar.size}</div>
                <div style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  background: 'var(--gradient-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginTop: '0.25rem',
                }}>
                  {jar.price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <div className="navbar-brand" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>
          <span>💧</span> SmartAqua
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          © 2024 SmartAqua. Pure water, delivered smart.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;