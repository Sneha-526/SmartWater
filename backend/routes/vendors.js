const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase'); // ✅ import shared supabase client
const { protect, vendorOnly } = require('../middleware/auth');

// POST /api/vendors/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, address = '' } = req.body;

    if (!name || !email || !phone || !password)
      return res.status(400).json({ success: false, message: 'Name, email, phone, and password are required.' });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'vendor', phone, address },
    });

    if (authError)
      return res.status(409).json({ success: false, message: authError.message });

    const { error: vendorError } = await supabaseAdmin
      .from('vendors')
      .insert({ id: authData.user.id, name, email, phone, address, role: 'vendor', is_available: true });

    if (vendorError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ success: false, message: 'Vendor profile creation failed.' });
    }

    // ✅ Sign in immediately after registration to return a token
    const { data: signInData, error: signInError } = await supabase
      .auth.signInWithPassword({ email, password });

    if (signInError) {
      return res.status(201).json({
        success: true,
        message: 'Vendor registration successful. Please sign in.',
        vendor: { id: authData.user.id, name, email, phone, role: 'vendor' },
      });
    }

    res.status(201).json({
      success: true,
      token: signInData.session.access_token,
      vendor: { id: authData.user.id, name, email, phone, address, role: 'vendor' },
    });
  } catch (err) {
    console.error('[Vendors] Register error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/vendors/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    // ✅ Use shared supabase client instead of inline createClient
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!vendor)
      return res.status(403).json({ success: false, message: 'Vendor account not found.' });

    res.json({
      success: true,
      token: data.session.access_token,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        is_available: vendor.is_available,
        rating: vendor.rating,
        total_orders: vendor.total_orders,
        role: 'vendor',
      },
    });
  } catch (err) {
    console.error('[Vendors] Login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/vendors/me
router.get('/me', protect, vendorOnly, async (req, res) => {
  try {
    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .select('id, name, email, phone, address, is_available, rating, total_orders, lat, lng')
      .eq('id', req.user.id)
      .single();

    if (error || !vendor)
      return res.status(404).json({ success: false, message: 'Vendor not found.' });

    res.json({ success: true, vendor });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/vendors/availability
router.put('/availability', protect, vendorOnly, async (req, res) => {
  try {
    const is_available = req.body.is_available ?? req.body.isAvailable;

    if (is_available === undefined)
      return res.status(400).json({ success: false, message: 'is_available is required.' });

    // ✅ Remove .single() — just update without fetching back
    const { error } = await supabaseAdmin
      .from('vendors')
      .update({ is_available })
      .eq('id', req.user.id);

    if (error) {
      console.error('[Vendors] availability error:', error.message);
      return res.status(500).json({ success: false, message: 'Update failed.' });
    }

    res.json({ success: true, is_available });
  } catch (err) {
    console.error('[Vendors] availability error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});
// PUT /api/vendors/location
router.put('/location', protect, vendorOnly, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await supabaseAdmin.from('vendors').update({ lat, lng }).eq('id', req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;