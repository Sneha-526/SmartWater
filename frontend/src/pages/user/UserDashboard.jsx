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
  const [cancellingId, setCancellingId] = useState(null);
  const [vendorLocations, setVendorLocations] = useState({}); // { orderId: { lat, lng } }

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
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      playNotificationSound();
      toast.success(`🚛 Your order was accepted by ${order.vendor?.name || 'a vendor'}!`);
    };

    const handleStatusUpdate = (order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      const msgs = {
        on_the_way: '🚚 Your order is on the way!',
        delivered: '📦 Order delivered! Enjoy your water.',
        rejected: '❌ Your order was rejected.',
        cancelled: '🚫 Your order was cancelled.',
      };
      const msg = msgs[order.status];
      if (msg) {
        playNotificationSound();
        if (order.status === 'delivered') toast.success(msg);
        else if (order.status === 'rejected' || order.status === 'cancelled') toast.error(msg);
        else toast(msg, { icon: '🔔' });
      }
    };

    // Live vendor location tracking
    const handleVendorLocation = (data) => {
      // data = { orderId, lat, lng }
      if (data && data.orderId && data.lat && data.lng) {
        setVendorLocations((prev) => ({
          ...prev,
          [data.orderId]: { lat: data.lat, lng: data.lng },
        }));
      }
    };

    on('orderAccepted', handleAccepted);
    on('orderStatusUpdate', handleStatusUpdate);
    on('vendorLocation', handleVendorLocation);

    return () => {
      off('orderAccepted', handleAccepted);
      off('orderStatusUpdate', handleStatusUpdate);
      off('vendorLocation', handleVendorLocation);
    };
  }, [on, off]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancellingId(orderId);
    try {
      const { data } = await api.put(`/orders/${orderId}/cancel`);
      if (data.success) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        toast.success('Order cancelled successfully.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const activeOrders = orders.filter((o) => !['delivered', 'rejected', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter((o) => ['delivered', 'rejected', 'cancelled'].includes(o.status));

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
              value: formatCurrency(orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + Number(o.total_amount || 0), 0)),
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
                key={order.id}
                order={order}
                expanded={expandedId === order.id}
                onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
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
                    {(order.order_items || []).map((item, i) => (
                      <div key={item.id || i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.35rem 0',
                        fontSize: '0.85rem',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}>
                        <span>{item.quantity}× {item.product_name} ({item.size})</span>
                        <span style={{ color: 'var(--primary)' }}>₹{item.subtotal}</span>
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
                      <span style={{ color: 'var(--accent)' }}>{formatCurrency(Number(order.total_amount || 0))}</span>
                    </div>

                    {/* Vendor info after acceptance */}
                    {order.vendor && (
                      <div className="vendor-info-card">
                        <div className="vendor-avatar">🏪</div>
                        <div className="vendor-info-details">
                          <h4>{order.vendor.name}</h4>
                          <p>📞 {order.vendor.phone}</p>
                          {order.vendor.rating && (
                            <p>⭐ {order.vendor.rating}/5</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Map — show live vendor location for on_the_way orders */}
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {order.status === 'on_the_way' ? '🚚 Live Delivery Tracking' : 'Delivery Location'}
                  </h4>
                  <DeliveryMap
                    position={order.delivery_lat ? { lat: order.delivery_lat, lng: order.delivery_lng } : null}
                    vendorPosition={
                      order.status === 'on_the_way' && vendorLocations[order.id]
                        ? vendorLocations[order.id]
                        : order.vendor && order.status === 'on_the_way'
                          ? { lat: order.vendor.lat, lng: order.vendor.lng }
                          : null
                    }
                    readonly
                    height={order.status === 'on_the_way' ? 240 : 160}
                    popupText={order.delivery_address}
                    showRoute={order.status === 'on_the_way'}
                    orderStatus={order.status}
                  />
                  {order.status === 'on_the_way' && vendorLocations[order.id] && (
                    <p style={{
                      fontSize: '0.78rem',
                      color: 'var(--status-on-the-way)',
                      marginTop: '0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}>
                      <span className="spinner spinner-sm" style={{ width: '12px', height: '12px' }} />
                      Vendor location updating live...
                    </p>
                  )}

                  {/* Track Delivery Person button — always shown for on_the_way orders */}
                  {order.status === 'on_the_way' && (() => {
                    // Priority: live socket location > vendor stored lat/lng > delivery destination
                    const livePos = vendorLocations[order.id];
                    const vendorPos = order.vendor?.lat ? { lat: order.vendor.lat, lng: order.vendor.lng } : null;
                    const deliveryPos = order.delivery_lat ? { lat: order.delivery_lat, lng: order.delivery_lng } : null;
                    const trackPos = livePos || vendorPos || deliveryPos;

                    const statusLabel = livePos
                      ? '🟢 Live location available'
                      : vendorPos
                        ? '🔵 Last known vendor location'
                        : '📦 Showing delivery destination';

                    // Build Maps URL or show waiting state
                    const dest = trackPos ? `${trackPos.lat},${trackPos.lng}` : null;
                    const mapsUrl = dest
                      ? `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`
                      : null;

                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginTop: '0.75rem',
                        padding: '0.6rem 0.9rem',
                        background: 'rgba(139,92,246,0.08)',
                        border: '1px solid rgba(139,92,246,0.25)',
                        borderRadius: 'var(--radius-md)',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: 1, minWidth: '140px' }}>
                          {statusLabel}
                        </span>
                        {mapsUrl ? (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-directions"
                            onClick={(e) => {
                              const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                              if (isMobileDevice) {
                                e.preventDefault();
                                if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                                  window.location.href = `maps://maps.apple.com/?daddr=${dest}&dirflg=d`;
                                } else {
                                  window.location.href = `geo:${dest}?q=${dest}(Delivery+Person)`;
                                }
                                setTimeout(() => { window.open(mapsUrl, '_blank'); }, 800);
                              }
                            }}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            📍 Track Delivery Person
                          </a>
                        ) : (
                          <span style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            padding: '0.35rem 0.75rem',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}>
                            <span className="spinner spinner-sm" style={{ width: '10px', height: '10px' }} />
                            Waiting for vendor location...
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Cancel button — only for pending and accepted */}
                {['pending', 'accepted'].includes(order.status) && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      id={`cancel-order-${order.id}`}
                      className="btn btn-danger"
                      style={{ width: '100%', justifyContent: 'center' }}
                      disabled={cancellingId === order.id}
                      onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                    >
                      {cancellingId === order.id
                        ? <><span className="spinner spinner-sm" /> Cancelling...</>
                        : '🚫 Cancel Order'}
                    </button>
                  </div>
                )}
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
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
