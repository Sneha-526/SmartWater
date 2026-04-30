import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar';
import DeliveryMap, { fetchRoute } from '../../components/DeliveryMap';
import { StatusBadge } from '../../components/OrderCard';
import api from '../../utils/api';
import { formatCurrency, formatDate, playNotificationSound } from '../../utils/helpers';

const STATUS_FLOW = {
  accepted: ['on_the_way', 'rejected'],
  on_the_way: ['delivered'],
};

const STATUS_LABELS = {
  on_the_way: '🚚 On The Way',
  delivered: '📦 Delivered',
  rejected: '❌ Reject',
};

// Simple hook to track screen width
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const VendorOrderCard = ({ order, onAccept, onUpdateStatus, accepting }) => {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    const deliveryLat = order.delivery_lat;
    const deliveryLng = order.delivery_lng;
    if (next && deliveryLat && !routeInfo && order.status !== 'pending') {
      if (!navigator.geolocation) { setRouteInfo(false); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchRoute(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            { lat: deliveryLat, lng: deliveryLng }
          ).then((r) => setRouteInfo(r || false));
        },
        () => setRouteInfo(false),
        { timeout: 8000, maximumAge: 60000 }
      );
    }
  };

  const handleStatus = async (newStatus) => {
    setUpdatingStatus(newStatus);
    await onUpdateStatus(order.id, newStatus);
    setUpdatingStatus(null);
  };

  const nextStatuses = STATUS_FLOW[order.status] || [];
  const isNew = order.status === 'pending';
  const isMyOrder = order.vendor_id && !isNew;

  return (
    <div className="vendor-order-card" style={{ cursor: 'pointer' }}>
      {isNew && <div className="new-order-pulse" />}

      <div onClick={handleExpand}>
        <div className="order-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-white)', marginBottom: '0.1rem' }}>
              Order #{order.id?.toString().slice(-8).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {formatDate(order.created_at)}
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Customer info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.6rem 0', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
          <span>👤</span>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {order.user?.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {order.user?.phone || order.user?.email}
            </div>
          </div>
        </div>

        {/* Address */}
        <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
          <span style={{ flexShrink: 0 }}>📍</span>
          <span style={{ lineHeight: 1.4, wordBreak: 'break-word' }}>{order.delivery_address}</span>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {(order.order_items || []).map((item, i) => (
            <span key={item.id || i} style={{
              padding: '0.2rem 0.6rem',
              background: 'rgba(0,210,255,0.1)',
              border: '1px solid rgba(0,210,255,0.2)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              color: 'var(--primary)',
              fontWeight: 600,
            }}>
              {item.quantity}× {item.product_name} ({item.size})
            </span>
          ))}
        </div>

        {/* Amount + Payment */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '1.1rem', fontWeight: 800,
            background: 'var(--gradient-accent)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {formatCurrency(Number(order.total_amount || 0))}
          </span>
          <span style={{
            fontSize: '0.78rem', padding: '0.2rem 0.6rem',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 'var(--radius-full)', color: 'var(--status-pending)', fontWeight: 600,
          }}>
            {order.payment_mode?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          {/* Item breakdown */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Order Breakdown
            </h4>
            {(order.order_items || []).map((item, i) => (
              <div key={item.id || i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', flex: 1, marginRight: '0.5rem' }}>
                  {item.quantity}× {item.product_name} ({item.size}) @ ₹{item.price_per_unit}
                </span>
                <span>₹{item.subtotal}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontWeight: 700, fontSize: '0.95rem' }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent)' }}>{formatCurrency(Number(order.total_amount || 0))}</span>
            </div>
          </div>

          {/* Map */}
          {order.delivery_lat && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                Delivery Location
              </h4>
              <DeliveryMap
                position={{ lat: order.delivery_lat, lng: order.delivery_lng }}
                readonly
                height={isMobile ? 160 : 200}
                popupText={order.delivery_address}
              />
              {isMyOrder && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                  marginTop: '0.6rem', padding: '0.6rem 0.9rem',
                  background: 'rgba(0,210,255,0.06)', border: '1px solid rgba(0,210,255,0.18)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  {routeInfo ? (
                    <>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        📏 <strong style={{ color: 'var(--primary)' }}>{routeInfo.distance} km</strong>
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        ⏱ <strong style={{ color: 'var(--accent)' }}>{routeInfo.duration} min</strong>
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {routeInfo === false ? '📍 Location unavailable' : '📍 Calculating route...'}
                    </span>
                  )}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}&travelmode=driving`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-directions"
                    style={{ marginLeft: 'auto' }}
                    onClick={(e) => {
                      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                      if (isMobileDevice) {
                        e.preventDefault();
                        const dest = `${order.delivery_lat},${order.delivery_lng}`;
                        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                          window.location.href = `maps://maps.apple.com/?daddr=${dest}&dirflg=d`;
                        } else {
                          window.location.href = `geo:${dest}?q=${dest}(Delivery+Location)`;
                        }
                        setTimeout(() => {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
                        }, 800);
                      }
                    }}
                  >
                    🧭 Directions
                  </a>
                </div>
              )}
            </div>
          )}

          {order.notes && (
            <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              📝 {order.notes}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isNew && (
              <>
                <button
                  className="btn btn-success"
                  style={{ flex: 1, minWidth: '120px', justifyContent: 'center' }}
                  disabled={accepting === order.id}
                  onClick={() => onAccept(order.id)}
                >
                  {accepting === order.id ? <><span className="spinner spinner-sm" /> Accepting...</> : '✅ Accept'}
                </button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1, minWidth: '100px', justifyContent: 'center' }}
                  disabled={accepting === order.id}
                  onClick={async () => {
                    setUpdatingStatus('rejecting');
                    try {
                      await api.put(`/orders/${order.id}/reject`);
                      toast.success('Order rejected.');
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed.');
                    }
                    setUpdatingStatus(null);
                  }}
                >
                  {updatingStatus === 'rejecting' ? <span className="spinner spinner-sm" /> : '❌ Reject'}
                </button>
              </>
            )}
            {isMyOrder && nextStatuses.map((ns) => (
              <button
                key={ns}
                className={ns === 'rejected' ? 'btn btn-danger' : 'btn btn-success'}
                style={{ flex: 1, minWidth: '120px', justifyContent: 'center' }}
                disabled={!!updatingStatus}
                onClick={() => handleStatus(ns)}
              >
                {updatingStatus === ns ? <><span className="spinner spinner-sm" /> Updating...</> : STATUS_LABELS[ns]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── AI Insights Panel ───────────────────────────────────────────────────────
const AIInsightsPanel = () => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/predict/demand');
        if (data.success) setPrediction(data.prediction);
        else setError('Failed to load insights.');
      } catch (err) {
        setError(err.response?.data?.message || 'Prediction unavailable.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading AI insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '2rem' }}>⚠️</span>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
      </div>
    );
  }

  if (!prediction) return null;

  const { summary, peakHours, peakDay, topCategories, topSizes, recommendation, aiInsight, next24HoursDemand } = prediction;

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📊</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{summary.totalOrdersAnalyzed}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Orders Analyzed (30d)</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>💰</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>₹{summary.avgOrderValue}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Avg Order Value</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{summary.trendPositive ? '📈' : '📉'}</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: summary.trendPositive ? 'var(--status-delivered)' : '#ef4444' }}>{summary.trend}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Week Trend</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📅</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{peakDay.day}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Peak Day ({peakDay.orders} orders)</div>
        </div>
      </div>

      {/* Recommendation Badge */}
      <div className="card" style={{
        padding: '1rem 1.25rem',
        background: recommendation.shouldOrderNow
          ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.12))'
          : 'linear-gradient(135deg, rgba(0,210,255,0.08), rgba(59,130,246,0.08))',
        border: `1px solid ${recommendation.shouldOrderNow ? 'rgba(239,68,68,0.25)' : 'rgba(0,210,255,0.2)'}`,
      }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          {recommendation.message}
        </div>
        {recommendation.nextPeakHour && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Next peak: <strong style={{ color: 'var(--primary)' }}>{recommendation.nextPeakHour.label}</strong>
          </div>
        )}
      </div>

      {/* Peak Hours */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1rem' }}>
          ⏰ Peak Hours
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {peakHours.map((h) => (
            <div key={h.hour} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, minWidth: '55px', color: 'var(--text-secondary)' }}>{h.label}</span>
              <div style={{ flex: 1, height: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${h.confidence}%`,
                  height: '100%',
                  background: 'var(--gradient-primary)',
                  borderRadius: '10px',
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, minWidth: '38px', textAlign: 'right' }}>{h.confidence}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Categories & Sizes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            📦 Top Categories
          </h4>
          {topCategories.map((c) => (
            <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.85rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{c.category}</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{c.count}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            📏 Top Sizes
          </h4>
          {topSizes.map((s) => (
            <div key={s.size} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.85rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{s.size}</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 24-Hour Demand Heatmap */}
      {next24HoursDemand && next24HoursDemand.length > 0 && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            📈 Next 24-Hour Demand Forecast
          </h4>
          <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '80px' }}>
            {next24HoursDemand.map((d, i) => (
              <div key={i} style={{
                flex: 1,
                height: `${Math.max(4, d.relativeScore)}%`,
                background: d.relativeScore > 70
                  ? 'var(--gradient-primary)'
                  : d.relativeScore > 40
                    ? 'rgba(0,210,255,0.4)'
                    : 'rgba(0,210,255,0.15)',
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.5s ease',
                position: 'relative',
              }} title={`${d.label}: ${d.relativeScore}%`} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Now</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+12h</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+24h</span>
          </div>
        </div>
      )}

      {/* Gemini AI Insights */}
      {aiInsight && (
        <div className="card" style={{
          padding: '1.25rem',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(0,210,255,0.06))',
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1rem' }}>🤖</span> AI-Powered Insights
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {aiInsight.insights?.map((insight, i) => (
              <li key={i} style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}>
                💡 {insight}
              </li>
            ))}
          </ul>
          {aiInsight.recommendation && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.6rem 0.75rem',
              background: 'rgba(0,210,255,0.08)',
              border: '1px solid rgba(0,210,255,0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              color: 'var(--primary)',
              fontWeight: 600,
            }}>
              🎯 {aiInsight.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const VendorDashboard = () => {
  const { user } = useAuth();
  const { on, off, emit } = useSocket();
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState('new');
  const locationWatchRef = useRef(null);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/vendor');
      if (data.success) setOrders(data.orders);
    } catch {
      toast.error('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // Live location tracking: emit vendor position for on_the_way orders
  useEffect(() => {
    const onTheWayOrders = orders.filter(
      (o) => o.vendor_id && user?.id && o.vendor_id === user.id && o.status === 'on_the_way'
    );

    if (onTheWayOrders.length > 0 && navigator.geolocation) {
      // Start watching position
      if (!locationWatchRef.current) {
        locationWatchRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            onTheWayOrders.forEach((order) => {
              emit('vendor:location', {
                orderId: order.id,
                userId: order.user_id,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            });
          },
          () => { /* GPS error, silently ignore */ },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
      }
    } else {
      // No on_the_way orders, stop watching
      if (locationWatchRef.current) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
    }

    return () => {
      if (locationWatchRef.current) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
    };
  }, [orders, user?.id, emit]);

  useEffect(() => {
    const handleNewOrder = (order) => {
      setOrders((prev) => {
        if (prev.find((o) => o.id === order.id)) return prev;
        playNotificationSound();
        toast('🔔 New order received!', { icon: '💧', style: { fontWeight: 700 } });
        return [order, ...prev];
      });
    };
    const handleUnavailable = ({ orderId }) => {
      setOrders((prev) => prev.filter((o) => {
        if (o.id === orderId && o.status === 'pending' && !o.vendor_id) return false;
        return true;
      }));
    };
    const handleStatusUpdate = (order) => {
      // Handle cancelled orders from customers
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      if (order.status === 'cancelled') {
        playNotificationSound();
        toast.error('🚫 Customer cancelled an order.');
      }
    };
    on('newOrder', handleNewOrder);
    on('orderUnavailable', handleUnavailable);
    on('orderStatusUpdate', handleStatusUpdate);
    return () => {
      off('newOrder', handleNewOrder);
      off('orderUnavailable', handleUnavailable);
      off('orderStatusUpdate', handleStatusUpdate);
    };
  }, [on, off]);

  const handleAccept = async (orderId) => {
    setAccepting(orderId);
    try {
      const { data } = await api.put(`/orders/${orderId}/accept`);
      if (data.success) {
        if (data.order) {
          setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        } else {
          await fetchOrders();
        }
        toast.success('✅ Order accepted!');
        setActiveTab('active');
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 409) {
        // Order was already accepted (by another vendor or race condition)
        toast('This order was already taken.', { icon: '⚠️' });
      } else {
        toast.error(msg || 'Failed to accept order.');
      }
      // Always refresh orders so UI stays in sync with backend
      await fetchOrders();
    } finally {
      setAccepting(null);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      if (data.success) {
        if (data.order) {
          setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        } else {
          await fetchOrders();
        }
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
      await fetchOrders();
    }
  };

  const handleToggleAvailability = async () => {
    try {
      const { data } = await api.put('/vendors/availability', { isAvailable: !isAvailable });
      setIsAvailable(data.is_available);
      toast.success(data.is_available ? '✅ You are now available' : '⏸️ Availability turned off');
    } catch {
      toast.error('Failed to update availability.');
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending' && !o.vendor_id);
  const myActiveOrders = orders.filter((o) => o.vendor_id && user?.id && o.vendor_id === user.id && ['accepted', 'on_the_way'].includes(o.status));
  const completedOrders = orders.filter((o) => o.vendor_id && user?.id && o.vendor_id === user.id && ['delivered', 'rejected', 'cancelled'].includes(o.status));

  const tabs = [
    { key: 'new', label: isMobile ? '🔔 New' : '🔔 New Orders', count: pendingOrders.length, data: pendingOrders },
    { key: 'active', label: isMobile ? '🚚 Active' : '🚚 Active', count: myActiveOrders.length, data: myActiveOrders },
    { key: 'done', label: isMobile ? '📦 Done' : '📦 Completed', count: completedOrders.length, data: completedOrders },
    { key: 'insights', label: isMobile ? '📊 AI' : '📊 AI Insights', count: 0, data: [] },
  ];

  const currentTab = tabs.find((t) => t.key === activeTab);

  if (loading) {
    return (
      <div className="dashboard">
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-content">

        {/* Header */}
        <div className="card animate-fadeInUp" style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(0,71,171,0.12) 100%)',
          marginBottom: '1.5rem',
          padding: isMobile ? '1rem' : '1.5rem 2rem',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: '0.75rem',
          }}>
            <div>
              <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.4rem' }}>Vendor Dashboard 🏪</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
                {user?.name} · {pendingOrders.length} new order{pendingOrders.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="toggle-container">
              <span className="toggle-label" style={{ color: isAvailable ? 'var(--status-delivered)' : 'var(--text-muted)', fontWeight: 600, fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
                {isAvailable ? '🟢 Available' : '🔴 Offline'}
              </span>
              <label className="toggle" id="availability-toggle">
                <input type="checkbox" checked={isAvailable} onChange={handleToggleAvailability} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: isMobile ? '0.6rem' : '1rem',
          marginBottom: '1.5rem',
        }}>
          {[
            { label: 'Pending', value: pendingOrders.length, icon: '⏳', color: 'var(--status-pending)' },
            { label: 'Active', value: myActiveOrders.length, icon: '🚚', color: 'var(--status-on-the-way)' },
            { label: 'Delivered', value: completedOrders.filter(o => o.status === 'delivered').length, icon: '📦', color: 'var(--status-delivered)' },
            {
              label: 'Revenue',
              value: formatCurrency(completedOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total_amount || 0), 0)),
              icon: '💰',
              color: 'var(--accent)',
            },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: isMobile ? '0.75rem' : '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
              <div style={{ fontSize: isMobile ? '1rem' : '1.3rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs — fixed overflow */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          marginBottom: '1.25rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              id={`vendor-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className="btn btn-sm"
              style={{
                flex: 1,
                minWidth: isMobile ? '70px' : 'auto',
                whiteSpace: 'nowrap',
                background: activeTab === tab.key ? 'var(--gradient-primary)' : 'transparent',
                color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                boxShadow: activeTab === tab.key ? '0 2px 12px rgba(0,210,255,0.3)' : 'none',
                transition: 'var(--transition)',
                fontSize: isMobile ? '0.78rem' : '0.85rem',
                padding: isMobile ? '0.4rem 0.5rem' : '0.5rem 1rem',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  marginLeft: '0.3rem',
                  padding: '0.05rem 0.4rem',
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'rgba(0,210,255,0.15)',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* AI Insights Tab Content */}
        {activeTab === 'insights' ? (
          <AIInsightsPanel />
        ) : (
          <>
            {/* Order Feed */}
            {currentTab?.data.length === 0 ? (
              <div className="empty-state card">
                <span className="empty-icon">{activeTab === 'new' ? '📭' : activeTab === 'active' ? '🚚' : '📦'}</span>
                <div className="empty-title">
                  {activeTab === 'new' ? 'No new orders' : activeTab === 'active' ? 'No active deliveries' : 'No completed orders'}
                </div>
                <div className="empty-desc">
                  {activeTab === 'new'
                    ? isAvailable ? 'New orders will appear here in real-time' : 'Turn on availability to receive orders'
                    : activeTab === 'active' ? 'Accept orders to start delivering'
                      : 'Completed orders will show here'}
                </div>
              </div>
            ) : (
              <div className="orders-feed">
                {currentTab.data.map((order) => (
                  <VendorOrderCard
                    key={order.id}
                    order={order}
                    onAccept={handleAccept}
                    onUpdateStatus={handleUpdateStatus}
                    accepting={accepting}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;