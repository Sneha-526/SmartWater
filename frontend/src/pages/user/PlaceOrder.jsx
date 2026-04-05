import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import DeliveryMap from '../../components/DeliveryMap';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { loadRazorpayScript, openRazorpayCheckout } from '../../utils/razorpay';

const CATEGORY_META = {
  regular:   { label: 'Regular',   icon: '💧', color: '#00d2ff' },
  sparkling: { label: 'Sparkling', icon: '🫧', color: '#7ee8fa' },
  black:     { label: 'Black',     icon: '🖤', color: '#a78bfa' },
  mineral:   { label: 'Mineral',   icon: '⛰️', color: '#4ade80' },
  flavored:  { label: 'Flavored',  icon: '🍹', color: '#f97316' },
  hydrogen:  { label: 'Hydrogen',  icon: '⚗️', color: '#c084fc' },
  alkaline:  { label: 'Alkaline',  icon: '💎', color: '#38bdf8' },
};

const PlaceOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('regular');
  const [cart, setCart] = useState({});
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [location, setLocation] = useState(null);
  const [paymentMode, setPaymentMode] = useState('cod');
  const [notes, setNotes] = useState('');

  // Fetch catalog
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/catalog');
        if (data.success) setProducts(data.products);
      } catch { toast.error('Failed to load catalog.'); }
      finally { setCatalogLoading(false); }
    };
    load();
  }, []);

  const categories = [...new Set(products.map(p => p.category))];
  const filtered = products.filter(p => p.category === activeCategory && p.in_stock);

  const updateQty = (productId, delta) => {
    setCart(prev => {
      const qty = Math.max(0, (prev[productId] || 0) + delta);
      if (qty === 0) { const { [productId]: _, ...rest } = prev; return rest; }
      return { ...prev, [productId]: qty };
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(x => x.id === id);
    return p ? { ...p, quantity: qty, subtotal: p.price * qty } : null;
  }).filter(Boolean);

  const total = cartItems.reduce((s, i) => s + i.subtotal, 0);

  const handleMapClick = useCallback((lat, lng) => {
    setLocation({ lat, lng });
    toast('📍 Location pinned!', { icon: '✅' });
  }, []);

  const handleGPS = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported.');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success('📍 GPS acquired!'); setGpsLoading(false); },
      () => { toast.error('GPS failed. Click on the map.'); setGpsLoading(false); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) return toast.error('Enter delivery address.');
    if (!location) return toast.error('Select location on the map.');
    if (cartItems.length === 0) return toast.error('Add at least one product.');

    setLoading(true);
    try {
      const items = cartItems.map(i => ({
        product_id: i.id, name: i.name, category: i.category,
        size: i.size, quantity: i.quantity, price_per_unit: i.price,
      }));

      const { data } = await api.post('/orders', {
        deliveryAddress, deliveryLocation: location, items, paymentMode, notes,
      });

      if (!data.success) throw new Error(data.message);

      if (paymentMode === 'online') {
        // Razorpay flow
        const scriptOk = await loadRazorpayScript();
        if (!scriptOk) { toast.error('Payment gateway failed to load.'); setLoading(false); return; }

        if (!data.order || !data.order.id) {
  toast.error('Order creation failed.');
  setLoading(false);
  return;
}
if (!data.order || !data.order.id) {
  toast.error('Order creation failed. Please try again.');
  setLoading(false);
  return;
}
const { data: payData } = await api.post('/payments/create-order', {
  orderId: data.order.id,
  amount: total,
});
        if (!user) {
          toast.error('Session expired. Please log in again.');
          navigate('/');
          return;
        }
        openRazorpayCheckout({
          keyId: payData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          razorpayOrderId: payData.razorpayOrderId,
          amount: payData.amount,
          currency: payData.currency,
          orderId: data.order.id,
          user,
          onSuccess: async (resp) => {
            try {
              await api.post('/payments/verify', resp);
              toast.success('🎉 Payment successful! Order placed.');
            } catch { toast.success('🎉 Order placed! Payment will be verified.'); }
            navigate('/user');
          },
          onFailure: (msg) => {
            toast.error(msg || 'Payment failed.');
            setLoading(false);
          },
        });
        return;
      }

      toast.success('🎉 Order placed! Vendors notified.');
      navigate('/user');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-content">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          <div style={{ marginBottom: '1.5rem' }}>
            <button onClick={() => navigate('/user')} className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem' }}>← Back</button>
            <h2>Place New Order 🛒</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Choose from 7 premium water categories</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '1.25rem' }}>

              {/* ── Category Tabs ── */}
              <div className="card-gradient-border">
                <div className="section-title"><div className="title-icon">🫙</div> Select Water Products</div>

                {catalogLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner spinner-lg" /></div>
                ) : (
                  <>
                    <div className="category-tabs" style={{ marginBottom: '1rem' }}>
                      {categories.map(cat => {
                        const meta = CATEGORY_META[cat] || { label: cat, icon: '💧' };
                        const count = Object.entries(cart).filter(([id]) => products.find(p => p.id === id)?.category === cat).length;
                        return (
                          <button key={cat} type="button" id={`cat-${cat}`}
                            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}>
                            <span className="tab-emoji">{meta.icon}</span>
                            {meta.label}
                            {count > 0 && <span className="tab-count">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Product Grid */}
                    <div className="product-grid">
                      {filtered.map(p => {
                        const qty = cart[p.id] || 0;
                        return (
                          <div key={p.id} className={`product-card ${qty > 0 ? 'in-cart' : ''}`}>
                            {p.badge && (
                              <div className="product-badge">
                                <span className={`badge-shimmer ${p.badge === 'Premium' || p.badge === 'Luxury' ? 'premium' : p.badge === 'New' ? 'new' : ''}`}>
                                  {p.badge}
                                </span>
                              </div>
                            )}
                            <span className="product-icon">{p.icon}</span>
                            <div className="product-name">{p.name}</div>
                            <div className="product-size">{p.size}</div>
                            <div className="product-price">{formatCurrency(Number(p.price))}</div>
                            {p.health_benefits && <div className="product-health">{p.health_benefits}</div>}
                            <div className="jar-qty-controls" style={{ marginTop: '0.5rem' }}>
                              <button type="button" className="qty-btn" onClick={() => updateQty(p.id, -1)} disabled={qty <= 0}>−</button>
                              <span className="qty-value">{qty}</span>
                              <button type="button" className="qty-btn" onClick={() => updateQty(p.id, 1)}>+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Cart Summary */}
                {total > 0 && (
                  <div className="price-summary" style={{ marginTop: '1rem' }}>
                    {cartItems.map(item => (
                      <div key={item.id} className="price-row">
                        <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}× {item.name} ({item.size})</span>
                        <span>{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                    <div className="price-row total"><span>Total</span><span className="price-value">{formatCurrency(total)}</span></div>
                  </div>
                )}
              </div>

              {/* ── Delivery Location ── */}
              <div className="card">
                <div className="section-title"><div className="title-icon">📍</div> Delivery Location</div>
                <div className="form-group">
                  <label className="form-label">Delivery Address</label>
                  <input id="delivery-address" className="form-input" type="text"
                    placeholder="Enter your full delivery address"
                    value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required />
                </div>
                <button type="button" className="btn btn-secondary" onClick={handleGPS} disabled={gpsLoading}
                  id="use-gps-btn" style={{ marginBottom: '0.75rem' }}>
                  {gpsLoading ? <><span className="spinner spinner-sm" /> Locating...</> : '📡 Use My GPS Location'}
                </button>
                <DeliveryMap position={location} onMapClick={handleMapClick} height={280} popupText="Delivery Here" />
                {location ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--status-delivered)', marginTop: '0.5rem' }}>
                    ✅ Location set: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                ) : <p className="map-hint">🖱️ Click on the map to pin your delivery location</p>}
              </div>

              {/* ── Payment & Notes ── */}
              <div className="card">
                <div className="section-title"><div className="title-icon">💳</div> Payment & Notes</div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { key: 'cod', label: '💵 Cash on Delivery', emoji: '💵' },
                      { key: 'online', label: '📱 Pay Online (Razorpay)', emoji: '📱' },
                    ].map(pm => (
                      <button key={pm.key} type="button" id={`payment-${pm.key}`}
                        onClick={() => setPaymentMode(pm.key)}
                        style={{
                          padding: '0.875rem', fontFamily: 'var(--font)', fontSize: '0.9rem', fontWeight: 600,
                          border: `2px solid ${paymentMode === pm.key ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)',
                          background: paymentMode === pm.key ? 'rgba(0,210,255,0.1)' : 'rgba(0,0,0,0.2)',
                          color: paymentMode === pm.key ? 'var(--primary)' : 'var(--text-secondary)',
                        }}>
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Notes (Optional)</label>
                  <input id="delivery-notes" className="form-input" type="text"
                    placeholder="Leave at door, call before arrival..."
                    value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              {/* Submit */}
              <button id="place-order-submit" type="submit"
                className={`btn btn-primary btn-lg btn-full ${total > 0 ? 'btn-glow' : ''}`}
                disabled={loading || total === 0}>
                {loading ? <><span className="spinner spinner-sm" /> Placing Order...</>
                  : total === 0 ? '➕ Select Products to Continue'
                  : `🚀 Place Order · ${formatCurrency(total)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrder;
