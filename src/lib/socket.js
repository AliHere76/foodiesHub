const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { redisClient } = require('./redis');

let io;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Create a separate Redis client for pub/sub
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis adapter configured');
  }).catch((error) => {
    console.error('❌ Socket.IO Redis adapter error:', error);
    console.log('⚠️  Running without Redis adapter (single instance mode)');
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join tenant-specific room
    socket.on('join_tenant', (tenantId) => {
      socket.join(`tenant:${tenantId}`);
      console.log(`Socket ${socket.id} joined tenant room: ${tenantId}`);
    });

    // Join order-specific room
    socket.on('join_order', (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`Socket ${socket.id} joined order room: ${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

// Emit functions
function emitOrderUpdate(tenantId, orderId, orderData) {
  if (io) {
    io.to(`tenant:${tenantId}`).emit('order_update', orderData);
    io.to(`order:${orderId}`).emit('order_status_change', orderData);
  }
}

function emitMetricsUpdate(tenantId, metrics) {
  if (io) {
    io.to(`tenant:${tenantId}`).emit('metrics_update', metrics);
  }
}

module.exports = { 
  initializeSocket, 
  getIO, 
  emitOrderUpdate, 
  emitMetricsUpdate 
};