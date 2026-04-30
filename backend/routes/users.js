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

    // Create user with email_confirm: false so Supabase sends OTP
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
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

    // Send OTP to email via Supabase
    const { error: otpError } = await supabase.auth.signInWithOtp({ email });
    if (otpError) {
      console.error('[Users] OTP send error:', otpError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Account created! Please verify your email with the OTP sent.',
      requiresOtp: true,
      email,
      userId: authData.user.id,
    });
  } catch (err) {
    console.error('[Users] Register error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/users/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error)
      return res.status(400).json({ success: false, message: error.message || 'Invalid OTP.' });

    // Also confirm the email in admin
    if (data.user) {
      await supabaseAdmin.auth.admin.updateUser(data.user.id, { email_confirm: true });
    }

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    res.json({
      success: true,
      message: 'Email verified successfully!',
      token: data.session?.access_token,
      user: profile ? { ...profile } : { email, role: 'user' },
    });
  } catch (err) {
    console.error('[Users] Verify OTP error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/users/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error)
      return res.status(400).json({ success: false, message: error.message });

    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
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
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/users/google-auth — Handle Google OAuth sign-in
router.post('/google-auth', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token)
      return res.status(400).json({ success: false, message: 'Access token required.' });

    // Get user from the token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(access_token);
    if (error || !user)
      return res.status(401).json({ success: false, message: 'Invalid token.' });

    // Upsert profile (first-time Google users won't have a profile yet)
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!existing) {
      // Create profile for first-time Google user
      await supabaseAdmin.from('profiles').insert({
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
        email: user.email,
        phone: user.user_metadata?.phone || '',
        address: '',
        role: 'user',
      });
    }

    // Ensure user_metadata has role set
    if (!user.user_metadata?.role) {
      await supabaseAdmin.auth.admin.updateUser(user.id, {
        user_metadata: { ...user.user_metadata, role: 'user' },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({
      success: true,
      token: access_token,
      user: profile ? { ...profile } : { id: user.id, email: user.email, role: 'user' },
    });
  } catch (err) {
    console.error('[Users] Google auth error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/users/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password`,
    });

    if (error)
      return res.status(400).json({ success: false, message: error.message });

    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/users/reset-password — Reset password with new password
router.post('/reset-password', async (req, res) => {
  try {
    const { access_token, password } = req.body;
    if (!access_token || !password)
      return res.status(400).json({ success: false, message: 'Token and new password required.' });

    const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUser(
      (await supabaseAdmin.auth.getUser(access_token)).data.user.id,
      { password }
    );

    if (error)
      return res.status(400).json({ success: false, message: error.message });

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[Users] Reset password error:', err.message);
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