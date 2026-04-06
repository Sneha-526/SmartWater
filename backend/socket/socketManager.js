// Socket connection maps
const connectedUsers = new Map(); // userId -> socketId
const connectedVendors = new Map(); // vendorId -> socketId

let io;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // User registers their socket
    socket.on('user:register', (userId) => {
      if (userId) {
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        console.log(`[Socket] User registered: ${userId} -> ${socket.id}`);
      }
    });

    // Vendor registers their socket
    socket.on('vendor:register', (vendorId) => {
      if (vendorId) {
        connectedVendors.set(vendorId, socket.id);
        socket.vendorId = vendorId;
        socket.join('vendors'); // Join vendor room
        console.log(`[Socket] Vendor registered: ${vendorId} -> ${socket.id}`);
      }
    });

    // Vendor sends live location during delivery
    socket.on('vendor:location', (data) => {
      // data = { orderId, userId, lat, lng }
      if (data && data.userId && data.lat && data.lng) {
        const userSocketId = connectedUsers.get(data.userId);
        if (userSocketId) {
          io.to(userSocketId).emit('vendorLocation', {
            orderId: data.orderId,
            lat: data.lat,
            lng: data.lng,
          });
        }
      }
    });

    socket.on('disconnect', () => {
      // Cleanup
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        console.log(`[Socket] User disconnected: ${socket.userId}`);
      }
      if (socket.vendorId) {
        connectedVendors.delete(socket.vendorId);
        console.log(`[Socket] Vendor disconnected: ${socket.vendorId}`);
      }
    });
  });

  return io;
};

// Emit new order to all connected vendors
const emitNewOrder = (order) => {
  if (io) {
    io.to('vendors').emit('newOrder', order);
    console.log(`[Socket] Emitted newOrder to vendors room`);
  }
};

// Emit order accepted to the specific user
const emitOrderAccepted = (userId, order) => {
  if (io) {
    const socketId = connectedUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('orderAccepted', order);
      console.log(`[Socket] Emitted orderAccepted to user: ${userId}`);
    }
  }
};

// Emit status update to the specific user
const emitOrderStatusUpdate = (userId, order) => {
  if (io) {
    const socketId = connectedUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('orderStatusUpdate', order);
      console.log(`[Socket] Emitted orderStatusUpdate to user: ${userId}`);
    }
  }
};

// Emit order removed from feed (accepted/rejected/cancelled) to vendors
const emitOrderUnavailable = (orderId) => {
  if (io) {
    io.to('vendors').emit('orderUnavailable', { orderId });
  }
};

// Emit vendor location to a specific user
const emitVendorLocation = (userId, data) => {
  if (io) {
    const socketId = connectedUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('vendorLocation', data);
    }
  }
};

const getIO = () => io;

module.exports = {
  initSocket,
  emitNewOrder,
  emitOrderAccepted,
  emitOrderStatusUpdate,
  emitOrderUnavailable,
  emitVendorLocation,
  getIO,
  connectedUsers,
  connectedVendors,
};

