import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import OrderCard from '../../components/OrderCard';
import OrderTimeline from '../../components/OrderTimeline';
import DeliveryMap from '../../components/DeliveryMap';
import api from '../../utils/api';
import { STATUS_CONFIG } from '../../utils/helpers';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/user');
      if (data.success) setOrders(data.orders);
    } catch {
      toast.error('Failed to load order history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const statusFilters = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: '⏳ Pending' },
    { key: 'accepted', label: '✅ Accepted' },
    { key: 'on_the_way', label: '🚚 On the Way' },
    { key: 'delivered', label: '📦 Delivered' },
    { key: 'rejected', label: '❌ Rejected' },
  ];

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
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/user" className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
            ← Dashboard
          </Link>
          <h2>Order History 📋</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''} total
          </p>
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.5rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}>
          {statusFilters.map((f) => (
            <button
              key={f.key}
              id={`filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className="btn btn-sm"
              style={{
                background: filter === f.key ? 'var(--gradient-primary)' : 'transparent',
                color: filter === f.key ? 'white' : 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: filter === f.key ? '0 2px 12px rgba(0,210,255,0.3)' : 'none',
                border: 'none',
                transition: 'var(--transition)',
              }}
            >
              {f.label}
              {f.key !== 'all' && orders.filter(o => o.status === f.key).length > 0 && (
                <span style={{
                  marginLeft: '0.35rem',
                  padding: '0.05rem 0.4rem',
                  background: filter === f.key ? 'rgba(255,255,255,0.25)' : 'rgba(0,210,255,0.15)',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                }}>
                  {orders.filter(o => o.status === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div className="empty-state card">
            <span className="empty-icon">📭</span>
            <div className="empty-title">No orders found</div>
            <div className="empty-desc">
              {filter === 'all' ? 'Place your first order to see it here' : `No ${filter} orders`}
            </div>
            {filter === 'all' && (
              <Link to="/user/order" className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
                🛒 Place Order
              </Link>
            )}
          </div>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              expanded={expandedId === order._id}
              onToggle={() => setExpandedId(expandedId === order._id ? null : order._id)}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                    Order Progress
                  </h4>
                  <OrderTimeline order={order} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                    Jar Breakdown
                  </h4>
                  {order.jars?.map((jar, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.35rem 0',
                      fontSize: '0.85rem',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <span>{jar.quantity}× {jar.size} jar</span>
                      <span style={{ color: 'var(--primary)' }}>₹{jar.subtotal}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 700 }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--accent)' }}>₹{order.totalAmount}</span>
                  </div>

                  {order.vendorId && (
                    <div className="vendor-info-card" style={{ marginTop: '0.5rem' }}>
                      <div className="vendor-avatar">🏪</div>
                      <div className="vendor-info-details">
                        <h4>{order.vendorId.name}</h4>
                        <p>📞 {order.vendorId.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                  Delivery Location
                </h4>
                <DeliveryMap
                  position={order.deliveryLocation}
                  readonly
                  height={150}
                  popupText={order.deliveryAddress}
                />
              </div>
            </OrderCard>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
