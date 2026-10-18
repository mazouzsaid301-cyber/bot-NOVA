require("dotenv").config();

function validateBotConfig() {
  const required = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID", "DASHBOARD_PASSWORD", "SESSION_SECRET"];
  const missing = [];
  for (const key of required) {
    const val = process.env[key];
    if (!val || val.startsWith("CHANGE_MOI") || val === "COLLE_ICI_LE_TOKEN_DU_BOT") {
      missing.push(key);
    }
  }
  return missing;
}

const parseCorsOrigins = () => {
  const raw = process.env.CORS_ORIGIN || process.env.DASHBOARD_URL || process.env.DASHBOARD_PUBLIC_URL || "";
  const defaults = ["https://mazoodev.com", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"];
  if (!raw) return defaults;
  const list = raw.split(",").map(s => s.trim().replace(/\/$/, "")).filter(Boolean);
  return Array.from(new Set([...defaults, ...list]));
};

module.exports = {
  token: process.env.DISCORD_TOKEN || "",
  clientId: process.env.CLIENT_ID || "",
  guildId: process.env.GUILD_ID || "",
  port: Number(process.env.DASHBOARD_PORT || process.env.PORT || 3000),
  dashboardPassword: process.env.DASHBOARD_PASSWORD || "",
  sessionSecret: process.env.SESSION_SECRET || "default_development_secret_change_in_production",
  dashboardPublicUrl: process.env.DASHBOARD_PUBLIC_URL || "https://mazoodev.com",
  apiBaseUrl: process.env.API_BASE_URL || "",
  corsOrigins: parseCorsOrigins(),
  logChannelId: process.env.LOG_CHANNEL_ID || "",
  ticketCategoryId: process.env.TICKET_CATEGORY_ID || "",
  voiceChannelId: process.env.VOICE_CHANNEL_ID || "",
  databasePath: process.env.DATABASE_PATH || "",
  nodeEnv: process.env.NODE_ENV || "development",
  validateBotConfig
};
