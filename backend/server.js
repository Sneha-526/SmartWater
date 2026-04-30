require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const { initSocket } = require('./socket/socketManager');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Middleware  
app.use(cors({
  origin: (origin, cb) => {
    // Allow all origins in development; in production, use CLIENT_URL
    if (!origin || origin.includes('localhost') || origin === process.env.CLIENT_URL) {
      cb(null, true);
    } else {
      cb(null, process.env.CLIENT_URL || true);
    }
  },
  credentials: true,
}));

// Raw body for Razorpay webhook
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// JSON body parser for everything else
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/predict', require('./routes/predict'));
app.use('/api/catalog', require('./routes/catalog'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'supabase',
    payment: process.env.RAZORPAY_KEY_ID ? 'razorpay_configured' : 'not_configured',
    maps: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'not_configured',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 SmartAqua V2 Server running on port ${PORT}`);
  console.log(`📦 Database: Supabase PostgreSQL`);
  console.log(`💳 Payments: Razorpay`);
  console.log(`🗺️  Maps: Google Maps`);
  console.log(`🌐 Client: ${process.env.CLIENT_URL}\n`);
});

module.exports = { app, server };
