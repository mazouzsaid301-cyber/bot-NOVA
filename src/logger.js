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

let cachedLogo = {
  url: null,
  expiresAt: 0
};

async function getNovaLogoUrl(guild) {
  const now = Date.now();
  if (cachedLogo.url && now < cachedLogo.expiresAt) {
    return cachedLogo.url;
  }

  const logoMsgId = config.logoMessageId || process.env.LOGO_MESSAGE_ID || "1561452111634497698";
  const logoChanId = config.logoChannelId || process.env.LOGO_CHANNEL_ID || "1561275464243478678";

  if (logoMsgId && guild?.client) {
    try {
      const channel = guild.channels.cache.get(logoChanId) || await guild.channels.fetch(logoChanId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const msg = await channel.messages.fetch(logoMsgId).catch(() => null);
        const attachment = msg?.attachments?.first();
        if (attachment?.url) {
          cachedLogo.url = attachment.url;
          cachedLogo.expiresAt = now + 2 * 3600 * 1000;
          return cachedLogo.url;
        }
      }
    } catch (e) {
      console.warn("[Logger] Récupération du logo personnalisé :", e.message);
    }
  }

  const botAvatar = guild?.client?.user?.displayAvatarURL({ dynamic: true, size: 512 });
  return botAvatar || guild?.iconURL({ dynamic: true, size: 512 }) || null;
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

    const logoUrl = await getNovaLogoUrl(guild);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: `NOVA PVP • ${safeTitle}`,
        iconURL: logoUrl || undefined
      })
      .setDescription(safeDescription)
      .setFooter({
        text: `NOVA PVP • Surveillance Serveur`,
        iconURL: logoUrl || undefined
      })
      .setTimestamp();

    if (logoUrl) {
      embed.setThumbnail(logoUrl);
    }

    if (options.fields && Array.isArray(options.fields)) {
      embed.addFields(options.fields.slice(0, 25));
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error("Erreur lors de l'envoi du log Discord:", err.message);
  }
}

module.exports = { log, sanitizeText, getNovaLogoUrl };
