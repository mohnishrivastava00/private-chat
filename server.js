require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-momo-namrata-vault-2026-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication helper
function generateToken(user) {
  return jwt.sign(
    {
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      color: user.color,
      avatar_emoji: user.avatar_emoji
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
}

// REST Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const userPayload = {
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    color: user.color,
    avatar_emoji: user.avatar_emoji
  };

  const token = generateToken(userPayload);
  return res.json({ token, user: userPayload });
});

app.get('/api/me', authenticateToken, (req, res) => {
  const user = db.getUserByUsername(req.user.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    user: {
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      color: user.color,
      avatar_emoji: user.avatar_emoji
    }
  });
});

app.get('/api/users', authenticateToken, (req, res) => {
  const users = db.getAllUsers();
  res.json({ users });
});

app.get('/api/messages', authenticateToken, (req, res) => {
  const messages = db.getRecentMessages(100);
  res.json({ messages });
});

app.post('/api/clear-history', authenticateToken, (req, res) => {
  db.clearChatHistory();
  io.emit('history_cleared');
  res.json({ success: true, message: 'Chat history cleared' });
});

app.post('/api/remove-demo', authenticateToken, (req, res) => {
  db.removeDemoUser();
  io.emit('demo_removed');
  res.json({ success: true, message: 'Demo user removed successfully' });
});

// Socket.io Connection & Events
// Track connected users: username -> Set of socket IDs
const activeSockets = new Map();

function broadcastPresence() {
  const onlineUsernames = Array.from(activeSockets.keys());
  io.emit('presence_update', { onlineUsernames });
}

// Socket Auth Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  const username = socket.user.username;

  if (!activeSockets.has(username)) {
    activeSockets.set(username, new Set());
  }
  activeSockets.get(username).add(socket.id);

  broadcastPresence();

  // Send message event
  socket.on('send_message', (data) => {
    if (!data || !data.content || typeof data.content !== 'string') return;
    const content = data.content.trim();
    if (!content || content.length > 5000) return;

    const newMsg = db.addMessage({
      sender: socket.user.display_name,
      sender_username: socket.user.username,
      content: content,
      reply_to_id: data.reply_to_id || null
    });

    io.emit('new_message', newMsg);
  });

  // Typing event
  socket.on('typing', (data) => {
    socket.broadcast.emit('user_typing', {
      username: socket.user.username,
      display_name: socket.user.display_name,
      isTyping: !!data.isTyping
    });
  });

  // Toggle reaction event
  socket.on('toggle_reaction', (data) => {
    if (!data || !data.message_id || !data.emoji) return;
    const reactions = db.toggleReaction(data.message_id, socket.user.display_name, data.emoji);
    if (reactions) {
      io.emit('reaction_updated', {
        message_id: data.message_id,
        reactions: reactions
      });
    }
  });

  // Delete message event
  socket.on('delete_message', (data) => {
    if (!data || !data.message_id) return;
    const result = db.deleteMessage(data.message_id, socket.user.username);
    if (result.changes > 0) {
      io.emit('message_deleted', { message_id: data.message_id });
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (activeSockets.has(username)) {
      const userSockets = activeSockets.get(username);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        activeSockets.delete(username);
      }
    }
    broadcastPresence();
  });
});

// Fallback to index.html for SPA (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`✨ Private Chat platform running on http://localhost:${PORT}`);
});
