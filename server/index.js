require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const { initDatabase, query } = require('./db');
const { setupTransporter } = require('./mailer');
const { JWT_SECRET } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const fileRoutes = require('./routes/files');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

app.set('io', io);

let initializationPromise;

function initialize() {
  if (!initializationPromise) {
    initializationPromise = Promise.all([
      initDatabase(),
      setupTransporter()
    ]);
  }

  return initializationPromise;
}

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  initialize().then(() => next(), next);
});

// Socket.IO Authentication & Rooms
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error: token missing'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await query.get('SELECT id, name, email, role, avatar FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return next(new Error('Authentication error: user not found'));
    }

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.user;
  const userRoom = `user_${user.id}`;
  socket.join(userRoom);

  console.log(`[SOCKET] User connected: ${user.name} (${user.email}) -> Room: ${userRoom}`);

  // Typing indicators
  socket.on('typing', ({ receiverId }) => {
    socket.to(`user_${receiverId}`).emit('user_typing', { senderId: user.id, senderName: user.name });
  });

  socket.on('stop_typing', ({ receiverId }) => {
    socket.to(`user_${receiverId}`).emit('user_stop_typing', { senderId: user.id });
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] User disconnected: ${user.name}`);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Team Task Management API'
  });
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// Serve frontend build in production
const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  // If requesting an API route that wasn't matched, return 404
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('Team Task Management API is running. Client dev server active on port 5173.');
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
async function start() {
  try {
    await initialize();

    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Team Task Management Server running on port ${PORT}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`🛡️  Admin Account: ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'}`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

module.exports = app;

if (!process.env.VERCEL) {
  start();
}
