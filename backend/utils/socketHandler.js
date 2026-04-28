const jwt = require('jsonwebtoken');

const setupSocketIO = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.userId})`);
    socket.join(`user:${socket.userId}`);

    socket.on('subscribe:alerts', () => socket.join('alerts'));
    socket.on('subscribe:dashboard', () => socket.join('dashboard'));

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  // Emit periodic dashboard updates
  setInterval(() => {
    io.to('dashboard').emit('dashboard:update', {
      timestamp: new Date().toISOString(),
      serverLoad: Math.round(Math.random() * 30 + 10),
      activeUsers: Math.floor(Math.random() * 50 + 10),
    });
  }, 30000);
};

module.exports = { setupSocketIO };
