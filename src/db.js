const fs = require("node:fs");
const path = require("node:path");

let rawDb;
let dbDriver = "node:sqlite";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "bot.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

try {
  const BetterSqlite3 = require("better-sqlite3");
  rawDb = new BetterSqlite3(dbPath);
  dbDriver = "better-sqlite3";
} catch {
  const { DatabaseSync } = require("node:sqlite");
  rawDb = new DatabaseSync(dbPath);
  dbDriver = "node:sqlite";
}

try {
  rawDb.exec("PRAGMA journal_mode = WAL;");
  rawDb.exec("PRAGMA foreign_keys = ON;");
} catch (e) {
  // Pragma may vary on in-memory or specific drivers
}

const db = {
  driver: dbDriver,
  exec(sql) {
    return rawDb.exec(sql);
  },
  prepare(sql) {
    const stmt = rawDb.prepare(sql);
    return {
      run(...params) {
        const result = stmt.run(...params);
        return {
          changes: Number(result?.changes ?? 0),
          lastInsertRowid: result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : 0
        };
      },
      get(...params) {
        return stmt.get(...params);
      },
      all(...params) {
        return stmt.all(...params);
      }
    };
  },
  transaction(fn) {
    if (typeof rawDb.transaction === "function") {
      return rawDb.transaction(fn);
    }
    return (...args) => {
      rawDb.exec("BEGIN IMMEDIATE;");
      try {
        const result = fn(...args);
        rawDb.exec("COMMIT;");
        return result;
      } catch (err) {
        try { rawDb.exec("ROLLBACK;"); } catch {}
        throw err;
      }
    };
  },
  close() {
    if (typeof rawDb.close === "function") rawDb.close();
  }
};

// Initialize schema
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  last_daily INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS redeem_codes (
  code TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  redeemed_by TEXT,
  redeemed_at INTEGER
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id TEXT UNIQUE NOT NULL,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  closed_at INTEGER,
  closed_by TEXT,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  user_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id TEXT,
  target_tag TEXT,
  moderator_id TEXT NOT NULL,
  moderator_tag TEXT NOT NULL,
  reason TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS economy_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  from_user_id TEXT,
  to_user_id TEXT,
  amount INTEGER NOT NULL,
  details TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_guild_status ON tickets(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_guild ON audit_logs(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_guild ON moderation_actions(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_tx_created ON economy_transactions(created_at DESC);
`);

// Migration checks for existing databases
function runMigrations() {
  try {
    const ticketCols = db.prepare("PRAGMA table_info(tickets)").all();
    const colNames = ticketCols.map(c => c.name);
    if (!colNames.includes("closed_by")) {
      db.exec("ALTER TABLE tickets ADD COLUMN closed_by TEXT;");
    }
    if (!colNames.includes("reason")) {
      db.exec("ALTER TABLE tickets ADD COLUMN reason TEXT;");
    }
  } catch {}

  try {
    const userCols = db.prepare("PRAGMA table_info(users)").all();
    const userColNames = userCols.map(c => c.name);
    if (!userColNames.includes("updated_at")) {
      db.exec("ALTER TABLE users ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;");
    }
  } catch {}
}
runMigrations();

function ensureUser(userId) {
  const now = Date.now();
  db.prepare("INSERT OR IGNORE INTO users (user_id, balance, last_daily, created_at, updated_at) VALUES (?, 0, 0, ?, ?)")
    .run(userId, now, now);
}

function getUser(userId) {
  ensureUser(userId);
  return db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);
}

function getLeaderboard(limit = 10) {
  const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 100);
  return db.prepare("SELECT user_id, balance, last_daily, created_at FROM users ORDER BY balance DESC LIMIT ?").all(safeLimit);
}

function transferCoins(fromUserId, toUserId, amount) {
  if (fromUserId === toUserId) return { success: false, error: "Vous ne pouvez pas vous transférer des coins à vous-même." };
  const numAmount = Math.floor(Number(amount));
  if (!numAmount || numAmount <= 0) return { success: false, error: "Le montant doit être un entier positif." };

  const tx = db.transaction(() => {
    ensureUser(fromUserId);
    ensureUser(toUserId);
    const sender = db.prepare("SELECT balance FROM users WHERE user_id = ?").get(fromUserId);
    if (!sender || sender.balance < numAmount) {
      return { success: false, error: "Solde insuffisant." };
    }
    const now = Date.now();
    db.prepare("UPDATE users SET balance = balance - ?, updated_at = ? WHERE user_id = ?").run(numAmount, now, fromUserId);
    db.prepare("UPDATE users SET balance = balance + ?, updated_at = ? WHERE user_id = ?").run(numAmount, now, toUserId);
    db.prepare("INSERT INTO economy_transactions (type, from_user_id, to_user_id, amount, details, created_at) VALUES ('pay', ?, ?, ?, ?, ?)")
      .run(fromUserId, toUserId, numAmount, `Transfert de ${fromUserId} vers ${toUserId}`, now);
    return { success: true, amount: numAmount };
  });

  return tx();
}

function claimDaily(userId, amount = 100, cooldownMs = 86400000) {
  const tx = db.transaction(() => {
    ensureUser(userId);
    const user = db.prepare("SELECT balance, last_daily FROM users WHERE user_id = ?").get(userId);
    const now = Date.now();
    const elapsed = now - (user.last_daily || 0);
    if (elapsed < cooldownMs) {
      return { success: false, remainingMs: cooldownMs - elapsed };
    }
    db.prepare("UPDATE users SET balance = balance + ?, last_daily = ?, updated_at = ? WHERE user_id = ?")
      .run(amount, now, now, userId);
    db.prepare("INSERT INTO economy_transactions (type, to_user_id, amount, details, created_at) VALUES ('daily', ?, ?, ?, ?)")
      .run(userId, amount, "Récompense quotidienne", now);
    return { success: true, amount, newBalance: user.balance + amount };
  });

  return tx();
}

function createRedeemCode(code, amount, createdBy) {
  const normalizedCode = String(code).trim().toUpperCase();
  const numAmount = Math.floor(Number(amount));
  if (!normalizedCode || normalizedCode.length < 3 || normalizedCode.length > 40) {
    throw new Error("Le code doit contenir entre 3 et 40 caractères.");
  }
  if (!numAmount || numAmount <= 0) {
    throw new Error("Le montant doit être un entier positif.");
  }
  const now = Date.now();
  db.prepare("INSERT INTO redeem_codes (code, amount, created_by, created_at) VALUES (?, ?, ?, ?)")
    .run(normalizedCode, numAmount, createdBy, now);
  return { code: normalizedCode, amount: numAmount, created_by: createdBy, created_at: now };
}

function claimRedeemCode(code, userId) {
  const normalizedCode = String(code).trim().toUpperCase();
  const tx = db.transaction(() => {
    const row = db.prepare("SELECT * FROM redeem_codes WHERE code = ?").get(normalizedCode);
    if (!row) return { success: false, error: "Code invalide ou introuvable." };
    if (row.redeemed_by) return { success: false, error: "Ce code a déjà été utilisé." };
    ensureUser(userId);
    const now = Date.now();
    db.prepare("UPDATE users SET balance = balance + ?, updated_at = ? WHERE user_id = ?").run(row.amount, now, userId);
    const updateRes = db.prepare("UPDATE redeem_codes SET redeemed_by = ?, redeemed_at = ? WHERE code = ? AND redeemed_by IS NULL")
      .run(userId, now, normalizedCode);
    if (updateRes.changes === 0) {
      throw new Error("Conflit de validation du code.");
    }
    db.prepare("INSERT INTO economy_transactions (type, to_user_id, amount, details, created_at) VALUES ('redeem', ?, ?, ?, ?)")
      .run(userId, row.amount, `Code utilisé: ${normalizedCode}`, now);
    return { success: true, amount: row.amount };
  });

  return tx();
}

function listRedeemCodes(filter = "all") {
  if (filter === "unused") {
    return db.prepare("SELECT * FROM redeem_codes WHERE redeemed_by IS NULL ORDER BY created_at DESC").all();
  }
  if (filter === "used") {
    return db.prepare("SELECT * FROM redeem_codes WHERE redeemed_by IS NOT NULL ORDER BY redeemed_at DESC").all();
  }
  return db.prepare("SELECT * FROM redeem_codes ORDER BY created_at DESC").all();
}

function deleteRedeemCode(code) {
  const normalizedCode = String(code).trim().toUpperCase();
  const row = db.prepare("SELECT * FROM redeem_codes WHERE code = ?").get(normalizedCode);
  if (!row) return { success: false, error: "Code introuvable." };
  if (row.redeemed_by) return { success: false, error: "Impossible de supprimer un code déjà utilisé." };
  db.prepare("DELETE FROM redeem_codes WHERE code = ?").run(normalizedCode);
  return { success: true };
}

function createTicket(channelId, guildId, userId) {
  const now = Date.now();
  db.prepare("INSERT INTO tickets (channel_id, guild_id, user_id, status, created_at) VALUES (?, ?, ?, 'open', ?)")
    .run(channelId, guildId, userId, now);
  return { channelId, guildId, userId, status: "open", createdAt: now };
}

function closeTicket(channelId, closedBy, reason = "") {
  const row = db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(channelId);
  if (!row) return { success: false, error: "Ticket ouvert introuvable." };
  const now = Date.now();
  db.prepare("UPDATE tickets SET status = 'closed', closed_at = ?, closed_by = ?, reason = ? WHERE channel_id = ?")
    .run(now, closedBy, reason, channelId);
  return { success: true, ticket: { ...row, status: "closed", closed_at: now, closed_by: closedBy, reason } };
}

function getTicketByChannel(channelId) {
  return db.prepare("SELECT * FROM tickets WHERE channel_id = ?").get(channelId);
}

function getOpenTicketForUser(guildId, userId) {
  return db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'").get(guildId, userId);
}

function listTickets({ guildId = null, status = null, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 100);
  const safeOffset = Math.max(0, Number(offset) || 0);

  const conditions = [];
  const params = [];
  if (guildId) { conditions.push("guild_id = ?"); params.push(guildId); }
  if (status) { conditions.push("status = ?"); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM tickets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(safeLimit, safeOffset);
  return db.prepare(sql).all(...params);
}

function countTickets({ guildId = null, status = null } = {}) {
  const conditions = [];
  const params = [];
  if (guildId) { conditions.push("guild_id = ?"); params.push(guildId); }
  if (status) { conditions.push("status = ?"); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT COUNT(*) AS total FROM tickets ${where}`;
  return db.prepare(sql).get(...params)?.total || 0;
}

function addAuditLog({ guildId = null, category, action, details = "", userId = null }) {
  const now = Date.now();
  db.prepare("INSERT INTO audit_logs (guild_id, category, action, details, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(guildId, category, action, String(details || ""), userId, now);
}

function listAuditLogs({ guildId = null, category = null, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 100);
  const safeOffset = Math.max(0, Number(offset) || 0);
  const conditions = [];
  const params = [];
  if (guildId) { conditions.push("guild_id = ?"); params.push(guildId); }
  if (category) { conditions.push("category = ?"); params.push(category); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(safeLimit, safeOffset);
  return db.prepare(sql).all(...params);
}

function addModerationAction({ guildId, actionType, targetId, targetTag, moderatorId, moderatorTag, reason = "", details = "" }) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO moderation_actions (guild_id, action_type, target_id, target_tag, moderator_id, moderator_tag, reason, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, actionType, targetId, targetTag, moderatorId, moderatorTag, reason, details, now);
  addAuditLog({
    guildId,
    category: "moderation",
    action: actionType,
    details: `${actionType.toUpperCase()}: ${targetTag || targetId} par ${moderatorTag || moderatorId} — Raison: ${reason || "Aucune"}`,
    userId: moderatorId
  });
}

function listModerationActions({ guildId = null, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 100);
  const safeOffset = Math.max(0, Number(offset) || 0);
  if (guildId) {
    return db.prepare("SELECT * FROM moderation_actions WHERE guild_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?").all(guildId, safeLimit, safeOffset);
  }
  return db.prepare("SELECT * FROM moderation_actions ORDER BY created_at DESC LIMIT ? OFFSET ?").all(safeLimit, safeOffset);
}

function getEconomyStats() {
  const userCount = db.prepare("SELECT COUNT(*) AS total FROM users").get()?.total || 0;
  const balanceSum = db.prepare("SELECT SUM(balance) AS sum FROM users").get()?.sum || 0;
  const txCount = db.prepare("SELECT COUNT(*) AS total FROM economy_transactions").get()?.total || 0;
  const recentTransactions = db.prepare("SELECT * FROM economy_transactions ORDER BY created_at DESC LIMIT 15").all();
  return {
    totalUsers: userCount,
    totalCoins: Number(balanceSum) || 0,
    totalTransactions: txCount,
    recentTransactions
  };
}

function getSetting(key) {
  return db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? null;
}

function setSetting(key, value) {
  db.prepare("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, String(value));
}

function getAllSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  return obj;
}

module.exports = {
  db,
  ensureUser,
  getUser,
  getLeaderboard,
  transferCoins,
  claimDaily,
  createRedeemCode,
  claimRedeemCode,
  listRedeemCodes,
  deleteRedeemCode,
  createTicket,
  closeTicket,
  getTicketByChannel,
  getOpenTicketForUser,
  listTickets,
  countTickets,
  addAuditLog,
  listAuditLogs,
  addModerationAction,
  listModerationActions,
  getEconomyStats,
  getSetting,
  setSetting,
  getAllSettings
};
