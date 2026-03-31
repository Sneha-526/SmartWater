const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { protect, userOnly, vendorOnly } = require('../middleware/auth');
const {
  emitNewOrder,
  emitOrderAccepted,
  emitOrderStatusUpdate,
  emitOrderUnavailable,
} = require('../socket/socketManager');

// POST /api/orders — Place new order (user only)
router.post('/', protect, userOnly, async (req, res) => {
  try {
    const { deliveryAddress, deliveryLocation, items, paymentMode = 'cod', notes = '' } = req.body;

    if (!deliveryAddress || !deliveryLocation || !items || items.length === 0)
      return res.status(400).json({ success: false, message: 'Delivery address, location, and items are required.' });

    const totalAmount = items.reduce((sum, item) => sum + item.price_per_unit * item.quantity, 0);

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: req.user.id,
        delivery_address: deliveryAddress,
        delivery_lat: deliveryLocation.lat,
        delivery_lng: deliveryLocation.lng,
        total_amount: totalAmount,
        payment_mode: paymentMode,
        notes,
        status: 'pending',
        payment_status: paymentMode === 'cod' ? 'pending' : 'pending',
      })
      .select()
      .single();

    if (orderError) throw new Error(orderError.message);

    // Insert order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id || null,
      product_name: item.name,
      category: item.category,
      size: item.size,
      quantity: item.quantity,
      price_per_unit: item.price_per_unit,
      subtotal: item.price_per_unit * item.quantity,
    }));

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
    if (itemsError) throw new Error(itemsError.message);

    // Insert initial status history
    await supabaseAdmin.from('order_status_history').insert({
      order_id: order.id,
      status: 'pending',
      note: 'Order placed by customer',
    });

    // Fetch full order with items and user
    const fullOrder = await getFullOrder(order.id);

    // Emit to all connected vendors
    emitNewOrder(fullOrder);

    res.status(201).json({ success: true, message: 'Order placed successfully.', order: fullOrder });
  } catch (err) {
    console.error('[Orders] Create error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

// GET /api/orders/user — Get user's orders
router.get('/user', protect, userOnly, async (req, res) => {
  try {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`*, order_items(*), order_status_history(*)`)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const enriched = await Promise.all(
      (orders || []).map(async (order) => {
        if (!order.vendor_id) return { ...order, vendor: null };
        const { data: vendor } = await supabaseAdmin
          .from('vendors')
          .select('id, name, phone, email, address, rating, lat, lng')
          .eq('id', order.vendor_id)
          .single();
        return { ...order, vendor };
      })
    );

    res.json({ success: true, orders: enriched });
  } catch (err) {
    console.error('[Orders] Get user orders error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/orders/vendor — Get vendor orders
// GET /api/orders/vendor — Get vendor orders
router.get('/vendor', protect, vendorOnly, async (req, res) => {
  try {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`*, order_items(*), order_status_history(*)`)
      .or(`and(status.eq.pending,vendor_id.is.null),vendor_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Fetch user separately for each order
    const enriched = await Promise.all(
      (orders || []).map(async (order) => {
        if (!order.user_id) return { ...order, user: null };
        const { data: user } = await supabaseAdmin
          .from('profiles')
          .select('id, name, phone, email')
          .eq('id', order.user_id)
          .single();
        return { ...order, user };
      })
    );

    res.json({ success: true, orders: enriched });
  } catch (err) {
    console.error('[Orders] Get vendor orders error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/orders/:id/accept — Vendor accepts order
router.put('/:id/accept', protect, vendorOnly, async (req, res) => {
  try {
    // Atomic accept: check current state first
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, status, vendor_id, user_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existing)
      return res.status(404).json({ success: false, message: 'Order not found.' });
    if (existing.status !== 'pending' || existing.vendor_id)
      return res.status(409).json({ success: false, message: 'Order already accepted or unavailable.' });

    // Update order
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'accepted', vendor_id: req.user.id })
      .eq('id', req.params.id)
      .eq('status', 'pending') // double check atomicity
      .is('vendor_id', null);

    if (updateError) throw new Error(updateError.message);

    // Log status history
    await supabaseAdmin.from('order_status_history').insert({
      order_id: req.params.id,
      status: 'accepted',
      note: 'Order accepted by vendor',
    });

    // Increment vendor total orders
    await supabaseAdmin.rpc('increment_vendor_orders', { vendor_id_param: req.user.id }).catch(() => { });

    const fullOrder = await getFullOrder(req.params.id);

    emitOrderAccepted(existing.user_id, fullOrder);
    emitOrderUnavailable(req.params.id);

    res.json({ success: true, message: 'Order accepted.', order: fullOrder });
  } catch (err) {
    console.error('[Orders] Accept error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/orders/:id/status — Update status (vendor only)
router.put('/:id/status', protect, vendorOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedTransitions = {
      accepted: ['on_the_way'],
      on_the_way: ['delivered'],
    };

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, vendor_id, user_id')
      .eq('id', req.params.id)
      .single();

    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.vendor_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not your order.' });

    const allowed = allowedTransitions[order.status];
    if (!allowed || !allowed.includes(status))
      return res.status(400).json({ success: false, message: `Cannot transition from ${order.status} to ${status}.` });

    await supabaseAdmin.from('orders').update({ status }).eq('id', req.params.id);
    await supabaseAdmin.from('order_status_history').insert({
      order_id: req.params.id,
      status,
      note: `Status updated to ${status}`,
    });

    const fullOrder = await getFullOrder(req.params.id);
    emitOrderStatusUpdate(order.user_id, fullOrder);

    res.json({ success: true, message: `Status updated to ${status}.`, order: fullOrder });
  } catch (err) {
    console.error('[Orders] Status update error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/orders/:id/reject — Vendor rejects pending order
router.put('/:id/reject', protect, vendorOnly, async (req, res) => {
  try {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, user_id, vendor_id')
      .eq('id', req.params.id)
      .single();

    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.status !== 'pending')
      return res.status(409).json({ success: false, message: 'Can only reject pending orders.' });

    await supabaseAdmin.from('orders').update({ status: 'rejected' }).eq('id', req.params.id);
    await supabaseAdmin.from('order_status_history').insert({
      order_id: req.params.id,
      status: 'rejected',
      note: 'Rejected by vendor',
    });

    const fullOrder = await getFullOrder(req.params.id);
    emitOrderStatusUpdate(order.user_id, fullOrder);
    emitOrderUnavailable(req.params.id);

    res.json({ success: true, message: 'Order rejected.', order: fullOrder });
  } catch (err) {
    console.error('[Orders] Reject error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Helper: Fetch full order with all relations ──────────────
async function getFullOrder(orderId) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select(`*, order_items(*), order_status_history(*),
      user:user_id(id, name, phone, email)`)
    .eq('id', orderId)
    .single();

  if (!order) return null;

  let vendor = null;
  if (order.vendor_id) {
    const { data } = await supabaseAdmin
      .from('vendors')
      .select('id, name, phone, email, address, rating, lat, lng')
      .eq('id', order.vendor_id)
      .single();
    vendor = data;
  }

  return { ...order, vendor };
}

module.exports = router;
