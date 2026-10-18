const { EmbedBuilder } = require("discord.js");
const config = require("./config");
const { getSetting, addAuditLog } = require("./db");

function sanitizeText(str) {
  if (!str) return "";
  let clean = String(str);
  if (config.token) clean = clean.replaceAll(config.token, "[TOKEN_MASQUÉ]");
  if (config.dashboardPassword) clean = clean.replaceAll(config.dashboardPassword, "[MOT_DE_PASSE_MASQUÉ]");
  if (config.sessionSecret) clean = clean.replaceAll(config.sessionSecret, "[SECRET_MASQUÉ]");
  return clean;
}

async function log(guild, title, description, color = 0x5865F2, options = {}) {
  const guildId = guild?.id || null;
  const safeTitle = sanitizeText(title).slice(0, 256);
  const safeDescription = sanitizeText(description || "Aucun détail").slice(0, 4000);

  // 1. Record in DB audit log for persistent dashboard access
  try {
    addAuditLog({
      guildId,
      category: options.category || "bot",
      action: safeTitle,
      details: safeDescription,
      userId: options.userId || null
    });
  } catch (err) {
    console.error("Erreur lors de l'enregistrement de l'audit log en DB:", err.message);
  }

  // 2. Dispatch to Discord text channel if available
  if (!guild) return;
  const channelId = getSetting(`logs:${guild.id}`) || config.logChannelId;
  if (!channelId) return;

  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(safeTitle)
      .setDescription(safeDescription)
      .setTimestamp();

    if (options.fields && Array.isArray(options.fields)) {
      embed.addFields(options.fields.slice(0, 25));
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error("Erreur lors de l'envoi du log Discord:", err.message);
  }
}

module.exports = { log, sanitizeText };
