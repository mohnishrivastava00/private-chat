const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chat.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & performance
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    color TEXT DEFAULT '#38bdf8',
    avatar_emoji TEXT DEFAULT '💬',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    sender_username TEXT NOT NULL,
    content TEXT NOT NULL,
    reply_to_id INTEGER,
    reactions TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
`);

// Preset accounts configuration
const INITIAL_USERS = [
  {
    username: 'sexy_namrru',
    display_name: 'sexy_Namrru',
    password: '160417090312',
    role: 'namrata',
    color: '#ff4081',
    avatar_emoji: '🌸'
  },
  {
    username: 'hottie_momo',
    display_name: 'Hottie_Momo',
    password: '!_!!!!_Namrru',
    role: 'momo',
    color: '#38bdf8',
    avatar_emoji: '⚡'
  },
  {
    username: 'demo',
    display_name: 'demo',
    password: 'ikigai03',
    role: 'demo',
    color: '#a855f7',
    avatar_emoji: '✨'
  }
];

function seedUsers() {
  const checkUserStmt = db.prepare('SELECT username FROM users WHERE username = ?');
  const insertUserStmt = db.prepare(`
    INSERT INTO users (username, display_name, password_hash, role, color, avatar_emoji)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const updateUserStmt = db.prepare(`
    UPDATE users SET display_name = ?, password_hash = ?, role = ?, color = ?, avatar_emoji = ?
    WHERE username = ?
  `);

  for (const user of INITIAL_USERS) {
    const existing = checkUserStmt.get(user.username.toLowerCase());
    const hash = bcrypt.hashSync(user.password, 10);
    if (!existing) {
      insertUserStmt.run(user.username.toLowerCase(), user.display_name, hash, user.role, user.color, user.avatar_emoji);
    } else {
      updateUserStmt.run(user.display_name, hash, user.role, user.color, user.avatar_emoji, user.username.toLowerCase());
    }
  }
}

seedUsers();

// Exported database methods
module.exports = {
  db,

  getUserByUsername(username) {
    if (!username) return null;
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username.toLowerCase().trim());
  },

  getAllUsers() {
    const stmt = db.prepare('SELECT username, display_name, role, color, avatar_emoji FROM users');
    return stmt.all();
  },

  addMessage({ sender, sender_username, content, reply_to_id = null }) {
    const stmt = db.prepare(`
      INSERT INTO messages (sender, sender_username, content, reply_to_id, created_at)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    const result = stmt.run(sender, sender_username.toLowerCase(), content, reply_to_id);
    const getStmt = db.prepare('SELECT * FROM messages WHERE id = ?');
    const msg = getStmt.get(result.lastInsertRowid);
    return {
      ...msg,
      reactions: {}
    };
  },

  getRecentMessages(limit = 150) {
    const stmt = db.prepare(`
      SELECT * FROM (
        SELECT * FROM messages ORDER BY id DESC LIMIT ?
      ) ORDER BY id ASC
    `);
    const rows = stmt.all(limit);
    return rows.map(row => ({
      ...row,
      reactions: row.reactions ? JSON.parse(row.reactions) : {}
    }));
  },

  deleteMessage(id, username) {
    const stmt = db.prepare('DELETE FROM messages WHERE id = ? AND sender_username = ?');
    return stmt.run(id, username.toLowerCase());
  },

  toggleReaction(messageId, username, emoji) {
    const getStmt = db.prepare('SELECT reactions FROM messages WHERE id = ?');
    const msg = getStmt.get(messageId);
    if (!msg) return null;

    let reactions = {};
    try {
      reactions = JSON.parse(msg.reactions || '{}');
    } catch {
      reactions = {};
    }

    if (!reactions[emoji]) {
      reactions[emoji] = [username];
    } else {
      const idx = reactions[emoji].indexOf(username);
      if (idx > -1) {
        reactions[emoji].splice(idx, 1);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji].push(username);
      }
    }

    const updateStmt = db.prepare('UPDATE messages SET reactions = ? WHERE id = ?');
    updateStmt.run(JSON.stringify(reactions), messageId);
    return reactions;
  },

  removeDemoUser() {
    const stmt = db.prepare('DELETE FROM users WHERE username = "demo"');
    return stmt.run();
  },

  clearChatHistory() {
    const stmt = db.prepare('DELETE FROM messages');
    return stmt.run();
  }
};
