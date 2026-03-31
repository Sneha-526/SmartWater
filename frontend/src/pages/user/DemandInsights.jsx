import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
  },
};

const CATEGORY_COLORS = {
  regular: '#00d2ff', sparkling: '#7ee8fa', black: '#a78bfa',
  mineral: '#4ade80', flavored: '#f97316', hydrogen: '#c084fc', alkaline: '#38bdf8',
};

const DemandInsights = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: res } = await api.get('/predict/demand');
        if (res.success) setData(res.prediction);
      } catch { toast.error('Failed to load insights.'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="dashboard"><Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner spinner-lg" /></div>
      </div>
    );
  }

  const p = data;

  const peakHoursChart = {
    labels: p?.next24HoursDemand?.map(h => h.label) || [],
    datasets: [{
      data: p?.next24HoursDemand?.map(h => h.relativeScore) || [],
      backgroundColor: p?.next24HoursDemand?.map(h => h.relativeScore > 70 ? 'rgba(0,210,255,0.7)' : h.relativeScore > 40 ? 'rgba(0,210,255,0.4)' : 'rgba(0,210,255,0.15)') || [],
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const categoryChart = {
    labels: p?.topCategories?.map(c => c.category) || [],
    datasets: [{
      data: p?.topCategories?.map(c => c.count) || [],
      backgroundColor: p?.topCategories?.map(c => CATEGORY_COLORS[c.category] || '#00d2ff') || [],
      borderWidth: 0,
    }],
  };

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/user" className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem' }}>← Dashboard</Link>
          <h2>Demand Insights 🤖</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            AI-powered analysis of {p?.summary?.totalOrdersAnalyzed || 0} orders
          </p>
        </div>

        {/* Recommendation Banner */}
        <div className="recommendation-banner" style={{ marginBottom: '1.25rem' }}>
          <div className="rec-icon">{p?.recommendation?.shouldOrderNow ? '🔥' : '📅'}</div>
          <div className="rec-text">
            <h3>{p?.recommendation?.shouldOrderNow ? 'High Demand Right Now!' : 'Smart Timing Suggestion'}</h3>
            <p>{p?.recommendation?.message}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Orders Analyzed', value: p?.summary?.totalOrdersAnalyzed || 0, icon: '📊', color: 'var(--primary)' },
            { label: 'Avg Order', value: `₹${p?.summary?.avgOrderValue || 0}`, icon: '💰', color: 'var(--accent)' },
            { label: 'Trend', value: p?.summary?.trend || '—', icon: p?.summary?.trendPositive ? '📈' : '📉', color: p?.summary?.trendPositive ? 'var(--status-delivered)' : 'var(--status-rejected)' },
            { label: 'Peak Day', value: p?.peakDay?.day?.slice(0, 3) || '—', icon: '📅', color: 'var(--status-on-the-way)' },
          ].map(s => (
            <div key={s.label} className="stat-card-neu">
              <div style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="insights-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="chart-card">
            <h4>📊 24-Hour Demand Forecast</h4>
            <div style={{ height: 200 }}>
              <Bar data={peakHoursChart} options={chartDefaults} />
            </div>
          </div>
          <div className="chart-card">
            <h4>🥧 Top Categories</h4>
            <div style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
              <Doughnut data={categoryChart} options={{ ...chartDefaults, scales: undefined, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 } } } }} />
            </div>
          </div>
        </div>

        {/* Peak Hours Cards */}
        <div className="card-gradient-border" style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>⏰ Peak Ordering Hours</h4>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {p?.peakHours?.map((h, i) => (
              <div key={i} className="stat-card-neu" style={{ flex: '1 1 120px', minWidth: 120 }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)' }}>{h.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.orders} orders · {h.confidence}% confidence</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gemini AI Insights */}
        {p?.aiInsight && (
          <div className="card-gradient-border" style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              ✨ AI-Powered Insights (Gemini)
            </h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {p.aiInsight.insights?.map((insight, i) => (
                <div key={i} style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,210,255,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  💡 {insight}
                </div>
              ))}
              {p.aiInsight.recommendation && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,245,160,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,245,160,0.2)', fontSize: '0.88rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.25rem' }}>
                  🎯 {p.aiInsight.recommendation}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Sizes */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>📏 Popular Sizes</h4>
          {p?.topSizes?.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-white)', minWidth: 50 }}>{s.size}</span>
              <div style={{ flex: 1, height: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(s.count / (p.topSizes[0]?.count || 1)) * 100}%`, background: 'var(--gradient-primary)', borderRadius: 4, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: 40, textAlign: 'right' }}>{s.count}</span>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Last updated: {p?.generatedAt ? new Date(p.generatedAt).toLocaleString() : '—'}
        </p>
      </div>
    </div>
  );
};

export default DemandInsights;
