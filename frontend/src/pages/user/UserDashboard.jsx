import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar';
import OrderCard from '../../components/OrderCard';
import OrderTimeline from '../../components/OrderTimeline';
import DeliveryMap from '../../components/DeliveryMap';
import api from '../../utils/api';
import { playNotificationSound, formatCurrency } from '../../utils/helpers';

const UserDashboard = () => {
  const { user } = useAuth();
  const { on, off } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/user');
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

  // Socket.IO realtime listeners
  useEffect(() => {
    const handleAccepted = (order) => {
      setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
      playNotificationSound();
      toast.success(`🚛 Your order was accepted by ${order.vendorId?.name || 'a vendor'}!`);
    };

    const handleStatusUpdate = (order) => {
      setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
      const msgs = {
        on_the_way: '🚚 Your order is on the way!',
        delivered: '📦 Order delivered! Enjoy your water.',
        rejected: '❌ Your order was rejected.',
      };
      const msg = msgs[order.status];
      if (msg) {
        playNotificationSound();
        if (order.status === 'delivered') toast.success(msg);
        else if (order.status === 'rejected') toast.error(msg);
        else toast(msg, { icon: '🔔' });
      }
    };

    on('orderAccepted', handleAccepted);
    on('orderStatusUpdate', handleStatusUpdate);

    return () => {
      off('orderAccepted', handleAccepted);
      off('orderStatusUpdate', handleStatusUpdate);
    };
  }, [on, off]);

  const activeOrders = orders.filter((o) => !['delivered', 'rejected'].includes(o.status));
  const pastOrders = orders.filter((o) => ['delivered', 'rejected'].includes(o.status));

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

        {/* Welcome Banner */}
        <div className="card animate-fadeInUp" style={{
          background: 'linear-gradient(135deg, rgba(0,210,255,0.1) 0%, rgba(0,71,171,0.15) 100%)',
          marginBottom: '1.5rem',
          padding: '1.5rem 2rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                Welcome back, {user?.name?.split(' ')[0]}! 👋
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {activeOrders.length > 0
                  ? `You have ${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}`
                  : 'Ready to order fresh water?'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/user/order" className="btn btn-primary btn-glow" id="place-order-btn">
                🛒 Place Order
              </Link>
              <Link to="/user/history" className="btn btn-secondary" id="order-history-btn">
                📋 History
              </Link>
              <Link to="/user/insights" className="btn btn-ghost" id="demand-insights-btn">
                🤖 AI Insights
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {[
            { label: 'Total Orders', value: orders.length, icon: '📦', color: 'var(--primary)' },
            { label: 'Active', value: activeOrders.length, icon: '⚡', color: 'var(--status-accepted)' },
            { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, icon: '✅', color: 'var(--status-delivered)' },
            {
              label: 'Total Spent',
              value: formatCurrency(orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.totalAmount, 0)),
              icon: '💰',
              color: 'var(--accent)',
            },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{stat.icon}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Active Orders */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="section-title">
            <div className="title-icon">⚡</div>
            Active Orders
            {activeOrders.length > 0 && (
              <span style={{
                marginLeft: '0.5rem',
                padding: '0.15rem 0.6rem',
                background: 'rgba(0,210,255,0.15)',
                border: '1px solid rgba(0,210,255,0.3)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                color: 'var(--primary)',
                fontWeight: 700,
              }}>
                {activeOrders.length}
              </span>
            )}
          </div>

          {activeOrders.length === 0 ? (
            <div className="empty-state card">
              <span className="empty-icon">📋</span>
              <div className="empty-title">No active orders</div>
              <div className="empty-desc">Place an order to get fresh water delivered</div>
              <Link to="/user/order" className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
                🛒 Order Now
              </Link>
            </div>
          ) : (
            activeOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                expanded={expandedId === order._id}
                onToggle={() => setExpandedId(expandedId === order._id ? null : order._id)}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Timeline */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Order Progress
                    </h4>
                    <OrderTimeline order={order} />
                  </div>

                  {/* Jar breakdown + Vendor */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Order Details
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
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}>
                      <span>Total</span>
                      <span style={{ color: 'var(--accent)' }}>₹{order.totalAmount}</span>
                    </div>

                    {/* Vendor info after acceptance */}
                    {order.vendorId && (
                      <div className="vendor-info-card">
                        <div className="vendor-avatar">🏪</div>
                        <div className="vendor-info-details">
                          <h4>{order.vendorId.name}</h4>
                          <p>📞 {order.vendorId.phone}</p>
                          {order.vendorId.rating && (
                            <p>⭐ {order.vendorId.rating}/5</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mini map */}
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Delivery Location
                  </h4>
                  <DeliveryMap
                    position={order.deliveryLocation}
                    readonly
                    height={160}
                    popupText={order.deliveryAddress}
                  />
                </div>
              </OrderCard>
            ))
          )}
        </div>

        {/* Recent Past Orders */}
        {pastOrders.length > 0 && (
          <div>
            <div className="section-title" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="title-icon">📋</div>
                Recent History
              </div>
              <Link to="/user/history" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
                View all →
              </Link>
            </div>

            {pastOrders.slice(0, 3).map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
