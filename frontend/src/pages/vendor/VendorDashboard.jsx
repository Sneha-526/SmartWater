import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar';
import DeliveryMap from '../../components/DeliveryMap';
import { StatusBadge } from '../../components/OrderCard';
import api from '../../utils/api';
import { formatCurrency, formatDate, playNotificationSound } from '../../utils/helpers';

const STATUS_FLOW = {
  accepted: ['on_the_way', 'rejected'],
  on_the_way: ['delivered'],
};

const STATUS_LABELS = {
  on_the_way: '🚚 Mark On The Way',
  delivered: '📦 Mark Delivered',
  rejected: '❌ Reject Order',
};

const VendorOrderCard = ({ order, onAccept, onUpdateStatus, accepting }) => {
  const [expanded, setExpanded] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const handleStatus = async (newStatus) => {
    setUpdatingStatus(newStatus);
    await onUpdateStatus(order._id, newStatus);
    setUpdatingStatus(null);
  };

  const nextStatuses = STATUS_FLOW[order.status] || [];
  const isNew = order.status === 'pending';
  const isMyOrder = order.vendorId && !isNew;

  return (
    <div className="vendor-order-card" style={{ cursor: 'pointer' }}>
      {isNew && <div className="new-order-pulse" />}

      <div onClick={() => setExpanded(!expanded)}>
        <div className="order-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-white)', marginBottom: '0.1rem' }}>
              Order #{order._id?.slice(-8).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {formatDate(order.createdAt)}
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Customer info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.6rem 0', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
          <span>👤</span>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {order.userId?.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {order.userId?.phone || order.userId?.email}
            </div>
          </div>
        </div>

        {/* Address */}
        <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
          <span>📍</span>
          <span style={{ lineHeight: 1.4 }}>{order.deliveryAddress}</span>
        </div>

        {/* Jars */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {order.jars?.map((jar, i) => (
            <span key={i} style={{
              padding: '0.2rem 0.6rem',
              background: 'rgba(0,210,255,0.1)',
              border: '1px solid rgba(0,210,255,0.2)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              color: 'var(--primary)',
              fontWeight: 600,
            }}>
              {jar.quantity}× {jar.size}
            </span>
          ))}
        </div>

        {/* Amount + Payment */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            background: 'var(--gradient-accent)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {formatCurrency(order.totalAmount)}
          </span>
          <span style={{
            fontSize: '0.78rem',
            padding: '0.2rem 0.6rem',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--status-pending)',
            fontWeight: 600,
          }}>
            {order.paymentMode?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>

          {/* Jar price breakdown */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Order Breakdown
            </h4>
            {order.jars?.map((jar, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                padding: '0.3rem 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {jar.quantity}× {jar.size} jar @ ₹{jar.pricePerUnit}
                </span>
                <span>₹{jar.subtotal}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontWeight: 700, fontSize: '0.95rem' }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent)' }}>₹{order.totalAmount}</span>
            </div>
          </div>

          {/* Map preview */}
          {order.deliveryLocation && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                Delivery Location
              </h4>
              <DeliveryMap
                position={order.deliveryLocation}
                readonly
                height={200}
                popupText={order.deliveryAddress}
              />
            </div>
          )}

          {order.notes && (
            <div style={{
              padding: '0.5rem 0.75rem',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
            }}>
              📝 {order.notes}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isNew && (
              <>
                <button
                  id={`accept-order-${order._id.slice(-6)}`}
                  className="btn btn-success"
                  disabled={accepting === order._id}
                  onClick={() => onAccept(order._id)}
                >
                  {accepting === order._id ? (
                    <><span className="spinner spinner-sm" /> Accepting...</>
                  ) : (
                    '✅ Accept Order'
                  )}
                </button>
                <button
                  id={`reject-order-${order._id.slice(-6)}`}
                  className="btn btn-danger"
                  disabled={accepting === order._id}
                  onClick={async () => {
                    setUpdatingStatus('rejecting');
                    try {
                      await api.put(`/orders/${order._id}/reject`);
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
                id={`status-${ns}-${order._id.slice(-6)}`}
                className={ns === 'rejected' ? 'btn btn-danger' : 'btn btn-success'}
                disabled={!!updatingStatus}
                onClick={() => handleStatus(ns)}
              >
                {updatingStatus === ns ? (
                  <><span className="spinner spinner-sm" /> Updating...</>
                ) : (
                  STATUS_LABELS[ns]
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const VendorDashboard = () => {
  const { user } = useAuth();
  const { on, off } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'active' | 'done'

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

  useEffect(() => {
    fetchOrders();
  }, []);

  // Socket.IO realtime
  useEffect(() => {
    const handleNewOrder = (order) => {
      setOrders((prev) => {
        if (prev.find((o) => o._id === order._id)) return prev;
        playNotificationSound();
        toast('🔔 New order received!', {
          icon: '💧',
          style: { fontWeight: 700 },
        });
        return [order, ...prev];
      });
    };

    const handleUnavailable = ({ orderId }) => {
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId && o.status === 'pending'
            ? { ...o, status: 'accepted', vendorId: { name: 'Another Vendor' } }
            : o
        )
      );
    };

    on('newOrder', handleNewOrder);
    on('orderUnavailable', handleUnavailable);

    return () => {
      off('newOrder', handleNewOrder);
      off('orderUnavailable', handleUnavailable);
    };
  }, [on, off]);

  const handleAccept = async (orderId) => {
    setAccepting(orderId);
    try {
      const { data } = await api.put(`/orders/${orderId}/accept`);
      if (data.success) {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
        toast.success('✅ Order accepted! Get ready for delivery.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept order.');
    } finally {
      setAccepting(null);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      if (data.success) {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleToggleAvailability = async () => {
    try {
      const { data } = await api.put('/vendors/availability', { isAvailable: !isAvailable });
      setIsAvailable(data.is_available); // ✅ snake_case from backend
      toast.success(data.is_available ? '✅ You are now available' : '⏸️ Availability turned off');
    } catch {
      toast.error('Failed to update availability.');
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending' && !o.vendorId);
  const myActiveOrders = orders.filter((o) => o.vendorId?._id === user?.id && ['accepted', 'on_the_way'].includes(o.status));
  const completedOrders = orders.filter((o) => o.vendorId?._id === user?.id && ['delivered', 'rejected'].includes(o.status));

  const tabs = [
    { key: 'new', label: '🔔 New Orders', count: pendingOrders.length, data: pendingOrders },
    { key: 'active', label: '🚚 Active', count: myActiveOrders.length, data: myActiveOrders },
    { key: 'done', label: '📦 Completed', count: completedOrders.length, data: completedOrders },
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
          padding: '1.5rem 2rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem' }}>Vendor Dashboard 🏪</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                {user?.name} · {pendingOrders.length} new order{pendingOrders.length !== 1 ? 's' : ''} waiting
              </p>
            </div>
            <div className="toggle-container">
              <span className="toggle-label" style={{ color: isAvailable ? 'var(--status-delivered)' : 'var(--text-muted)', fontWeight: 600 }}>
                {isAvailable ? '🟢 Available' : '🔴 Offline'}
              </span>
              <label className="toggle" id="availability-toggle">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={handleToggleAvailability}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {[
            { label: 'Pending', value: pendingOrders.length, icon: '⏳', color: 'var(--status-pending)' },
            { label: 'Active', value: myActiveOrders.length, icon: '🚚', color: 'var(--status-on-the-way)' },
            { label: 'Delivered', value: completedOrders.filter(o => o.status === 'delivered').length, icon: '📦', color: 'var(--status-delivered)' },
            {
              label: 'Revenue',
              value: formatCurrency(completedOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.totalAmount, 0)),
              icon: '💰',
              color: 'var(--accent)',
            },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{stat.icon}</div>
              <div style={{ fontSize: stat.value > 999 ? '1.05rem' : '1.3rem', fontWeight: 800, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.4rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              id={`vendor-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className="btn btn-sm"
              style={{
                flex: 1,
                background: activeTab === tab.key ? 'var(--gradient-primary)' : 'transparent',
                color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                boxShadow: activeTab === tab.key ? '0 2px 12px rgba(0,210,255,0.3)' : 'none',
                transition: 'var(--transition)',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  marginLeft: '0.35rem',
                  padding: '0.05rem 0.5rem',
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'rgba(0,210,255,0.15)',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

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
                key={order._id}
                order={order}
                onAccept={handleAccept}
                onUpdateStatus={handleUpdateStatus}
                accepting={accepting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
