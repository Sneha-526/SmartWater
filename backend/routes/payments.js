const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { protect, userOnly } = require('../middleware/auth');

const razorpay = process.env.RAZORPAY_KEY_ID ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
}) : null;

// POST /api/payments/create-order — Create Razorpay order
router.post('/create-order', protect, userOnly, async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount)
      return res.status(400).json({ success: false, message: 'Order ID and amount are required.' });

    // Verify order belongs to user
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_amount, status')
      .eq('id', orderId)
      .single();

    if (!order || order.user_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Order not found.' });

    if (order.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Order is not in pending state.' });

    // Create Razorpay order (amount in paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total_amount * 100),
      currency: 'INR',
      receipt: `smartaqua_${orderId.slice(-8)}`,
      notes: { orderId, userId: req.user.id },
    });

    // Store payment record
    await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      user_id: req.user.id,
      razorpay_order_id: razorpayOrder.id,
      amount: order.total_amount,
      currency: 'INR',
      status: 'created',
    });

    // Update order with razorpay order id
    await supabaseAdmin
      .from('orders')
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq('id', orderId);

    res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[Payments] Create order error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Payment initiation failed.' });
  }
});

// POST /api/payments/verify — Verify Razorpay payment signature
router.post('/verify', protect, userOnly, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
    }

    // Update payment record
    await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: 'paid',
      })
      .eq('razorpay_order_id', razorpayOrderId);

    // Mark order as payment confirmed
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        razorpay_payment_id: razorpayPaymentId,
      })
      .eq('id', orderId);

    res.json({ success: true, message: 'Payment verified and confirmed.' });
  } catch (err) {
    console.error('[Payments] Verify error:', err.message);
    res.status(500).json({ success: false, message: 'Payment verification failed.' });
  }
});

// POST /api/payments/webhook — Razorpay webhook (no auth)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body)
        .digest('hex');
      if (signature !== expectedSig) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      await supabaseAdmin
        .from('payments')
        .update({ status: 'paid', razorpay_payment_id: payment.id })
        .eq('razorpay_order_id', razorpayOrderId);

      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('razorpay_order_id', razorpayOrderId);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Payments] Webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

module.exports = router;
