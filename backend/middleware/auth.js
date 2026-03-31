const { supabaseAdmin } = require('../config/supabase');

// Verify Supabase JWT and attach user to req
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided.' });
    }
    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
    }

    // Get role from user metadata
    const role = user.user_metadata?.role || 'user';

    req.user = { id: user.id, email: user.email, role };
    next();
  } catch (err) {
    console.error('[Auth] protect error:', err.message);
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
};

const userOnly = (req, res, next) => {
  if (req.user?.role === 'user') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Users only.' });
};

const vendorOnly = (req, res, next) => {
  if (req.user?.role === 'vendor') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Vendors only.' });
};

module.exports = { protect, userOnly, vendorOnly };
