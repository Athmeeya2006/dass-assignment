require('express-async-errors');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const TeamChatMessage = require('./models/TeamChatMessage');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// Connect to MongoDB and seed admin
const { Admin } = require('./models/User');

const seedAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (!adminExists) {
      await Admin.create({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
      console.log('Admin seeded');
    }
  } catch (err) {
    console.error('Admin seed error:', err.message);
  }
};

connectDB().then(seedAdmin);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/participant', require('./routes/participant'));
app.use('/api/organizer', require('./routes/organizer'));
app.use('/api/organizers', require('./routes/organizers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/event', require('./routes/event'));
app.use('/api/password-reset', require('./routes/passwordReset'));
app.use('/api/team', require('./routes/team'));
app.use('/api/feedback', require('./routes/feedback'));

// Health check
const mongoose = require('mongoose');
const { getEmailMode } = require('./utils/emailService');
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'Connected' : dbState === 2 ? 'Connecting' : 'Disconnected';
  res.json({
    api: 'Running',
    database: dbStatus,
    email: getEmailMode(),
    status: dbState === 1 ? 'Operational' : 'Degraded',
    timestamp: new Date().toISOString(),
  });
});

// --- Socket.IO with JWT Authentication ---
// Online users per team room (in-memory, ephemeral)
const teamOnlineUsers = new Map();

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  // Join event room (for discussion forum)
  socket.on('join-event', (eventId) => {
    socket.join(`event-${eventId}`);
  });

  socket.on('leave-event', (eventId) => {
    socket.leave(`event-${eventId}`);
  });

  // Forum real-time events
  socket.on('new-message', (data) => {
    io.to(`event-${data.eventId}`).emit('message-received', data);
  });

  socket.on('message-deleted', (data) => {
    io.to(`event-${data.eventId}`).emit('message-deleted-event', data);
  });

  socket.on('message-pinned', (data) => {
    io.to(`event-${data.eventId}`).emit('message-pinned-event', data);
  });

  // ── Team Chat (Tier B3) with MongoDB persistence & online status ──
  socket.on('join-team', async (teamId) => {
    if (!teamId) return socket.emit('team-error', 'Team ID is required');

    // Verify team membership before allowing join
    try {
      const Team = require('./models/Team');
      const team = await Team.findById(teamId);
      if (!team) return socket.emit('team-error', 'Team not found');

      const userId = socket.user.userId;
      const isMember = team.leaderId.toString() === userId ||
        team.members.some(m => m.participantId.toString() === userId && m.status === 'Accepted');
      if (!isMember) return socket.emit('team-error', 'Not a team member');
    } catch (err) {
      console.error('Team join auth error:', err.message);
      return socket.emit('team-error', 'Authorization failed');
    }

    // Clean up previous team room if any
    if (socket.currentTeamId && socket.currentTeamId !== teamId) {
      socket.leave(`team-${socket.currentTeamId}`);
      if (teamOnlineUsers.has(socket.currentTeamId)) {
        teamOnlineUsers.get(socket.currentTeamId).delete(socket.user.userId);
        io.to(`team-${socket.currentTeamId}`).emit('team-online-users',
          Array.from(teamOnlineUsers.get(socket.currentTeamId))
        );
      }
    }

    socket.join(`team-${teamId}`);
    socket.currentTeamId = teamId;

    // Track online users
    if (!teamOnlineUsers.has(teamId)) teamOnlineUsers.set(teamId, new Set());
    teamOnlineUsers.get(teamId).add(socket.user.userId);

    // Load history from MongoDB (last 200 messages)
    try {
      const history = await TeamChatMessage.find({ teamId })
        .sort({ timestamp: 1 })
        .limit(200)
        .lean();
      socket.emit('team-chat-history', history.map(m => ({
        id: m._id.toString(),
        senderId: m.senderId.toString(),
        senderName: m.senderName,
        text: m.text,
        timestamp: m.timestamp,
      })));
    } catch (err) {
      console.error('Team history load error:', err.message);
      socket.emit('team-chat-history', []);
    }

    // Broadcast updated online users
    io.to(`team-${teamId}`).emit('team-online-users',
      Array.from(teamOnlineUsers.get(teamId))
    );
  });

  socket.on('leave-team', (teamId) => {
    socket.leave(`team-${teamId}`);
    if (teamOnlineUsers.has(teamId)) {
      teamOnlineUsers.get(teamId).delete(socket.user.userId);
      io.to(`team-${teamId}`).emit('team-online-users',
        Array.from(teamOnlineUsers.get(teamId))
      );
    }
    socket.currentTeamId = null;
  });

  socket.on('team-message', async (data) => {
    // Verify the user is in the team room
    if (!data || !data.teamId || !data.text) return;
    if (socket.currentTeamId !== data.teamId) {
      // User might have reconnected - try re-joining
      return;
    }

    const senderName = socket.user.name && socket.user.name !== 'undefined undefined'
      ? socket.user.name
      : (data.senderName || socket.user.email || 'Unknown');

    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      senderId: socket.user.userId,
      senderName,
      text: data.text.substring(0, 2000),
      timestamp: new Date().toISOString(),
    };

    // Persist to MongoDB
    try {
      const saved = await TeamChatMessage.create({
        teamId: data.teamId,
        senderId: socket.user.userId,
        senderName: msg.senderName,
        text: msg.text,
        timestamp: new Date(msg.timestamp),
      });
      msg.id = saved._id.toString();
    } catch (err) {
      console.error('Team message save error:', err.message);
    }

    io.to(`team-${data.teamId}`).emit('team-message-received', msg);
  });

  socket.on('team-typing', (data) => {
    socket.to(`team-${data.teamId}`).emit('team-typing', {
      senderId: socket.user.userId,
      senderName: socket.user.name || data.senderName,
    });
  });

  socket.on('team-stop-typing', (data) => {
    socket.to(`team-${data.teamId}`).emit('team-stop-typing', {
      senderId: socket.user.userId,
    });
  });

  socket.on('disconnect', () => {
    // Clean up online status
    const teamId = socket.currentTeamId;
    if (teamId && teamOnlineUsers.has(teamId)) {
      teamOnlineUsers.get(teamId).delete(socket.user.userId);
      io.to(`team-${teamId}`).emit('team-online-users',
        Array.from(teamOnlineUsers.get(teamId))
      );
    }
  });
});

// 404 handler - serve SPA in production, else JSON
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  }
  res.status(404).json({ error: 'Route not found' });
});

// Error handling (must come after 404)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
