const express = require("express");
const crypto = require("node:crypto");
const {
  db,
  listTickets,
  countTickets,
  closeTicket,
  listRedeemCodes,
  createRedeemCode,
  deleteRedeemCode,
  getLeaderboard,
  getEconomyStats,
  listAuditLogs,
  listModerationActions,
  getSetting,
  setSetting,
  getAllSettings,
  addAuditLog
} = require("./db");

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""));
  const bufB = Buffer.from(String(b || ""));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function startDashboard(client, config) {
  const app = express();
  app.disable("x-powered-by");

  // Parse JSON and URL-encoded bodies with strict limits
  app.use(express.json({ limit: "50kb" }));
  app.use(express.urlencoded({ extended: false, limit: "50kb" }));

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    next();
  });

  // CORS Configuration
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = config.corsOrigins || [];

    const isAllowed = !origin ||
      allowedOrigins.includes(origin) ||
      origin === "https://mazoodev.com" ||
      origin === "https://www.mazoodev.com" ||
      origin.endsWith(".netlify.app") ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:");

    if (isAllowed && origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Rate limiting for login
  const loginAttempts = new Map();
  const revokedTokens = new Set();
  const startTime = Date.now();

  function generateToken() {
    const id = crypto.randomBytes(32).toString("hex");
    const exp = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
    const payload = `${id}.${exp}`;
    const signature = crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("hex");
    return `${payload}.${signature}`;
  }

  function verifyToken(token) {
    if (!token || revokedTokens.has(token)) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [id, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!exp || exp < Date.now()) return null;

    const payload = `${id}.${expStr}`;
    const expectedSig = crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("hex");
    const bufSig = Buffer.from(sig);
    const bufExp = Buffer.from(expectedSig);
    if (bufSig.length !== bufExp.length || !crypto.timingSafeEqual(bufSig, bufExp)) {
      return null;
    }
    return { id, exp };
  }

  function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7).trim();
    }
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith("dash_session="));
    if (match) {
      return match.slice("dash_session=".length);
    }
    return null;
  }

  function requireAuth(req, res, next) {
    const token = extractToken(req);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: "Accès refusé. Session invalide ou expirée.",
        code: "UNAUTHORIZED"
      });
    }
    req.auth = payload;
    next();
  }

  // --- Health-Check Endpoint ---
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
      botReady: client.isReady(),
      botTag: client.user?.tag || null,
      timestamp: Date.now()
    });
  });

  // --- Auth Endpoints ---
  app.post("/api/auth/login", (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const entry = loginAttempts.get(ip) || { count: 0, until: 0 };

    if (entry.until > Date.now()) {
      const waitMin = Math.ceil((entry.until - Date.now()) / 60000);
      return res.status(429).json({
        error: `Trop de tentatives. Veuillez patienter ${waitMin} minute(s) avant de réessayer.`,
        code: "RATE_LIMITED"
      });
    }

    const { password } = req.body || {};
    if (!password || !safeEqual(password, config.dashboardPassword)) {
      entry.count += 1;
      if (entry.count >= 5) {
        entry.until = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
        entry.count = 0;
      }
      loginAttempts.set(ip, entry);
      return res.status(401).json({
        error: "Mot de passe incorrect.",
        code: "INVALID_CREDENTIALS"
      });
    }

    loginAttempts.delete(ip);
    const token = generateToken();
    const isProd = config.nodeEnv === "production";

    res.setHeader(
      "Set-Cookie",
      `dash_session=${token}; Path=/; HttpOnly; SameSite=${isProd ? "None" : "Lax"}; Max-Age=28800${isProd ? "; Secure" : ""}`
    );

    res.json({
      success: true,
      token,
      user: { role: "admin", username: "Administrateur" },
      expiresIn: 28800
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = extractToken(req);
    if (token) revokedTokens.add(token);
    res.setHeader("Set-Cookie", "dash_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    res.json({ success: true, message: "Déconnexion réussie." });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({
      authenticated: true,
      user: { role: "admin", username: "Administrateur" }
    });
  });

  // --- Statistics & Overview ---
  app.get("/api/stats", requireAuth, (req, res) => {
    const guilds = Array.from(client.guilds.cache.values());
    const totalMembers = guilds.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    const totalChannels = guilds.reduce((acc, g) => acc + (g.channels.cache.size || 0), 0);

    const economyStats = getEconomyStats();
    const totalTickets = countTickets();
    const openTickets = countTickets({ status: "open" });
    const closedTickets = countTickets({ status: "closed" });

    const redeemCodes = listRedeemCodes("all");
    const totalRedeemCodes = redeemCodes.length;
    const usedRedeemCodes = redeemCodes.filter(c => c.redeemed_by).length;

    const mem = process.memoryUsage();

    res.json({
      bot: {
        ready: client.isReady(),
        tag: client.user?.tag || "Non connecté",
        avatar: client.user?.displayAvatarURL() || null,
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        wsPing: Math.round(client.ws.ping),
        guildsCount: guilds.length,
        totalMembers,
        channelsCount: totalChannels,
        memoryRssMb: Math.round(mem.rss / 1024 / 1024),
        memoryHeapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        nodeVersion: process.version,
        startTime
      },
      tickets: {
        total: totalTickets,
        open: openTickets,
        closed: closedTickets
      },
      economy: {
        totalUsers: economyStats.totalUsers,
        totalCoins: economyStats.totalCoins,
        totalTransactions: economyStats.totalTransactions
      },
      redeem: {
        total: totalRedeemCodes,
        used: usedRedeemCodes,
        unused: totalRedeemCodes - usedRedeemCodes
      }
    });
  });

  // --- Guilds List ---
  app.get("/api/guilds", requireAuth, (req, res) => {
    const guilds = client.guilds.cache.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL(),
      memberCount: g.memberCount,
      channelsCount: g.channels.cache.size,
      rolesCount: g.roles.cache.size,
      ownerId: g.ownerId,
      joinedAt: g.joinedTimestamp
    }));
    res.json({ guilds });
  });

  // --- Tickets Management ---
  app.get("/api/tickets", requireAuth, (req, res) => {
    const { status, guildId, limit = 50, offset = 0 } = req.query;
    const tickets = listTickets({
      status: status || null,
      guildId: guildId || null,
      limit: Number(limit),
      offset: Number(offset)
    });

    const enriched = tickets.map(t => {
      const guild = client.guilds.cache.get(t.guild_id);
      return {
        ...t,
        guild_name: guild?.name || "Serveur inconnu"
      };
    });

    const total = countTickets({ status: status || null, guildId: guildId || null });
    res.json({
      tickets: enriched,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });
  });

  app.post("/api/tickets/:channelId/close", requireAuth, async (req, res) => {
    const { channelId } = req.params;
    const { reason = "Fermé depuis le dashboard d'administration" } = req.body || {};

    const result = closeTicket(channelId, "Admin Dashboard", reason);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    addAuditLog({
      guildId: result.ticket?.guild_id,
      category: "ticket",
      action: "Ticket fermé via Dashboard",
      details: `Ticket salon ${channelId} fermé depuis le dashboard. Raison : ${reason}`,
      userId: "DASHBOARD_ADMIN"
    });

    // Attempt to delete Discord channel if bot can find it
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel) {
        await channel.send("🔒 Ce ticket a été fermé par l'administrateur depuis le tableau de bord web. Suppression dans 5 secondes...").catch(() => {});
        setTimeout(() => channel.delete("Fermé depuis le dashboard").catch(() => {}), 5000);
      }
    } catch {}

    res.json({ success: true, ticket: result.ticket });
  });

  // --- Redeem Codes Management ---
  app.get("/api/redeem", requireAuth, (req, res) => {
    const filter = req.query.filter || "all";
    const codes = listRedeemCodes(filter);
    res.json({ codes });
  });

  app.post("/api/redeem", requireAuth, (req, res) => {
    const { code, amount } = req.body || {};
    if (!code || !amount) {
      return res.status(400).json({ error: "Le code et le montant sont obligatoires." });
    }

    try {
      const created = createRedeemCode(code, amount, "ADMIN_DASHBOARD");
      addAuditLog({
        guildId: null,
        category: "redeem",
        action: "Code créé via Dashboard",
        details: `Code ${created.code} (${created.amount} coins) créé depuis le dashboard`,
        userId: "DASHBOARD_ADMIN"
      });
      res.status(201).json({ success: true, code: created });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/redeem/:code", requireAuth, (req, res) => {
    const { code } = req.params;
    const result = deleteRedeemCode(code);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    addAuditLog({
      guildId: null,
      category: "redeem",
      action: "Code supprimé via Dashboard",
      details: `Code ${code.toUpperCase()} supprimé depuis le dashboard`,
      userId: "DASHBOARD_ADMIN"
    });
    res.json({ success: true, message: "Code supprimé avec succès." });
  });

  // --- Economy & Leaderboard ---
  app.get("/api/economy", requireAuth, (req, res) => {
    const stats = getEconomyStats();
    const leaderboard = getLeaderboard(25);
    res.json({
      stats,
      leaderboard
    });
  });

  // --- Moderation Actions ---
  app.get("/api/moderation", requireAuth, (req, res) => {
    const { guildId, limit = 50, offset = 0 } = req.query;
    const actions = listModerationActions({
      guildId: guildId || null,
      limit: Number(limit),
      offset: Number(offset)
    });
    res.json({ actions });
  });

  // --- Audit Logs ---
  app.get("/api/logs", requireAuth, (req, res) => {
    const { guildId, category, limit = 50, offset = 0 } = req.query;
    const logs = listAuditLogs({
      guildId: guildId || null,
      category: category || null,
      limit: Number(limit),
      offset: Number(offset)
    });
    res.json({ logs });
  });

  // --- Bot Settings ---
  app.get("/api/settings", requireAuth, (req, res) => {
    const settings = getAllSettings();
    res.json({
      settings,
      configured: {
        logChannelId: config.logChannelId,
        ticketCategoryId: config.ticketCategoryId,
        dashboardPublicUrl: config.dashboardPublicUrl,
        guildId: config.guildId
      }
    });
  });

  app.post("/api/settings", requireAuth, (req, res) => {
    const { settings } = req.body || {};
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ error: "Objet settings requis." });
    }

    for (const [key, value] of Object.entries(settings)) {
      if (typeof key === "string" && key.length > 0 && key.length < 100) {
        setSetting(key, String(value));
      }
    }

    addAuditLog({
      guildId: null,
      category: "config",
      action: "Configuration modifiée",
      details: `Clés modifiées: ${Object.keys(settings).join(", ")}`,
      userId: "DASHBOARD_ADMIN"
    });

    res.json({ success: true, settings: getAllSettings() });
  });

  // --- Fallback Direct Status Page ---
  app.get("/", (req, res) => {
    const botReady = client.isReady();
    const publicUrl = config.dashboardPublicUrl || "https://mazoodev.com";
    res.send(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Discord Bot API & Gateway</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; max-width: 580px; width: 100%; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { margin-top: 0; color: #38bdf8; font-size: 24px; display: flex; align-items: center; gap: 12px; }
    .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 14px; background: ${botReady ? "#065f46" : "#7f1d1d"}; color: ${botReady ? "#34d399" : "#f87171"}; }
    p { line-height: 1.6; color: #94a3b8; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; transition: background 0.2s; }
    .btn:hover { background: #1d4ed8; }
    .meta { margin-top: 24px; padding-top: 20px; border-top: 1px solid #334155; font-size: 13px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🤖 Discord Bot & API Gateway</h1>
    <div class="status">● ${botReady ? "En ligne & Connecté" : "Démarrage en cours..."}</div>
    <p>Le bot Discord s'exécute de manière persistante sur ce serveur et expose son API sécurisée.</p>
    <p>Le tableau de bord d'administration officiel hébergé sur Netlify est disponible sur votre domaine personnalisé :</p>
    <a href="${publicUrl}" class="btn" target="_blank" rel="noopener">Accéder au Dashboard (${publicUrl})</a>
    <div class="meta">
      <div>Serveur : Node.js ${process.version}</div>
      <div>Uptime : ${Math.floor(process.uptime())} secondes</div>
      <div>Endpoints API : <code>/health</code>, <code>/api/*</code></div>
    </div>
  </div>
</body>
</html>`);
  });

  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`[API Dashboard] Serveur HTTP écoute sur http://0.0.0.0:${config.port}`);
  });

  return server;
}

module.exports = { startDashboard };
