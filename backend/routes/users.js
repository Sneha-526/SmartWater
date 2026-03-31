const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase'); // ✅ import supabase too
const { protect, userOnly } = require('../middleware/auth');

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone = '', address = '' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'user', phone, address },
    });

    if (authError)
      return res.status(409).json({ success: false, message: authError.message });

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: authData.user.id, name, email, phone, address, role: 'user' });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ success: false, message: 'Profile creation failed.' });
    }

    // ✅ Sign in immediately after registration
    const { data: signInData, error: signInError } = await supabase
      .auth.signInWithPassword({ email, password });

    if (signInError) {
      return res.status(201).json({
        success: true,
        message: 'Account created. Please log in.',
        user: { id: authData.user.id, name, email, role: 'user' },
      });
    }

    res.status(201).json({
      success: true,
      token: signInData.session.access_token,
      user: { id: authData.user.id, name, email, phone, address, role: 'user' },
    });
  } catch (err) {
    console.error('[Users] Register error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });


    if (error || !data.user)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();


    if (!profile || profile.role !== 'user')
      return res.status(403).json({ success: false, message: 'Account not found as customer.' });

    res.json({ success: true, token: data.session.access_token, user: { ...profile } });

  } catch (err) {
    console.error('8. CAUGHT ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/users/me
router.get('/me', protect, userOnly, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, phone, address, role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile)
      return res.status(404).json({ success: false, message: 'Profile not found.' });

    res.json({ success: true, user: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;