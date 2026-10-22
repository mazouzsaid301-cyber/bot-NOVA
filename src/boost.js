const fs = require("node:fs");
const path = require("node:path");
const { EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require("discord.js");
const { log } = require("./logger");
const { addCoins, addXp } = require("./db");

// In-memory anti-duplicate cooldown map (30s cooldown per user)
const recentBoosts = new Map();

/**
 * Find the most appropriate channel for boost announcements
 */
async function resolveBoostChannel(guild, config) {
  if (!guild) return null;

  // 1. Configured boost channel ID
  const configuredId = config.boostChannelId || "1440421152538361916";
  let channel = guild.channels.cache.get(configuredId);
  if (!channel) {
    channel = await guild.channels.fetch(configuredId).catch(() => null);
  }
  if (channel && channel.isTextBased()) return channel;

  // 2. Search for any text channel matching 'boost' or 'booster'
  const found = guild.channels.cache.find(c =>
    c.isTextBased() && (c.name.includes("boost") || c.name.includes("booster"))
  );
  if (found) return found;

  // 3. Fallback to welcome channel or general chat or system channel
  const welcomeId = config.welcomeChannelId || "1561442787679936712";
  const welcomeChan = guild.channels.cache.get(welcomeId);
  if (welcomeChan && welcomeChan.isTextBased()) return welcomeChan;

  const generalChan = guild.channels.cache.find(c =>
    c.isTextBased() && (c.name.includes("general") || c.name.includes("général"))
  );
  if (generalChan) return generalChan;

  return guild.systemChannel || null;
}

/**
 * Handle a new Nitro Boost on the server
 * @param {GuildMember} member - The member who boosted
 * @param {Client} client - The Discord client
 * @param {Object} config - Bot configuration
 * @param {boolean} isTest - Whether this is a test simulation
 */
async function handleBoost(member, client, config, isTest = false) {
  if (!member || !member.guild) return false;

  const guild = member.guild;
  const userId = member.id;

  // Prevent duplicate trigger if GuildMemberUpdate and MessageCreate both fire within 30 seconds
  if (!isTest) {
    const now = Date.now();
    const last = recentBoosts.get(userId);
    if (last && now - last < 30000) {
      return false;
    }
    recentBoosts.set(userId, now);
  }

  const boostChannel = await resolveBoostChannel(guild, config);
  if (!boostChannel) {
    console.warn(`[Boost] Impossible de trouver un salon d'annonce pour le boost sur ${guild.name}.`);
    return false;
  }

  // Check bot permissions in target channel
  const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (botMember) {
    const perms = boostChannel.permissionsFor(botMember);
    if (!perms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      console.warn(`[Boost] Permissions manquantes dans #${boostChannel.name} pour envoyer la notification.`);
      return false;
    }
  }

  // Server boost stats
  const totalBoosts = guild.premiumSubscriptionCount || 1;
  const tier = guild.premiumTier || 0;
  const tierLabels = [
    "Niveau 0 (En progression ⚡)",
    "Niveau 1 🚀 (Audio 128kbps, +50 Emojis)",
    "Niveau 2 💎 (Audio 256kbps, 1080p, 50MB)",
    "Niveau 3 👑 (Audio 384kbps, Vanity URL, 100MB)"
  ];
  const currentTierText = tierLabels[tier] || `Niveau ${tier}`;

  // Award economy bonus (+500 coins & +250 XP) to the booster
  try {
    addCoins(userId, 500, "Récompense Server Nitro Booster");
    addXp(userId, 250);
  } catch (err) {
    console.error("[Boost Economy Error]:", err.message);
  }

  // Prepare banner attachment if local gif exists
  const files = [];
  const gifPath = path.join(__dirname, "..", "assets", "nova-pvp-logo.gif");
  const imageAttachmentName = "nova-pvp-logo.gif";
  if (fs.existsSync(gifPath)) {
    files.push(new AttachmentBuilder(gifPath, { name: imageAttachmentName }));
  }

  const novaEmoji = guild.emojis?.cache?.find(e => e.name === "nova_logo" || e.name === "nova_pvp")?.toString() || "🚀";

  const boostEmbed = new EmbedBuilder()
    .setColor(0xF47FFF) // Iconic Discord Nitro Pink
    .setAuthor({
      name: `${member.user.tag} vient de booster le serveur !`,
      iconURL: member.user.displayAvatarURL({ dynamic: true })
    })
    .setTitle(`${novaEmoji} NOUVEAU BOOST SERVEUR ! | NOVA PVP`)
    .setDescription(
      `💜 **CHOUKRAN BZZAF ${member} 3LA L-BOOST !** ${novaEmoji}\n\n` +
      `Marhba bik f la team des **Légendes NOVA PVP** ! Grâce à ton soutien exceptionnel, le serveur franchit un nouveau palier et débloque des performances maximales pour toute la communauté ! ⚡\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 **Statistiques du Serveur :**\n` +
      `• 🚀 **Total de Boosts :** **${totalBoosts} boosts**\n` +
      `• 🏆 **Niveau Actuel :** **${currentTierText}**\n` +
      `• 💎 **Booster d'Élite :** ${member} (${member.user.tag})\n\n` +
      `🎁 **Tes Avantages & Privilèges Débloqués :**\n` +
      `• 👑 Rôle officiel **<@&1441192105098612776>** (Server Booster)\n` +
      `• 💬 Accès direct aux salons privés & vocaux VIP\n` +
      `• 🎨 Permission d'utiliser des stickers & emojis personnalisés partout\n` +
      `• 💰 **Bonus Économie offert :** **+500 Coins** ajoutés à ton solde (/balance) !\n` +
      `• ⚡ Priorité de parole vocale & Stream HD 1080p\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Toute l'équipe et les combattants de NOVA PVP te remercient chaleureusement pour ta force !* ⚔️`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setImage(files.length > 0 ? `attachment://${imageAttachmentName}` : "https://cdn.discordapp.com/attachments/1561275464243478678/1561452111571456164/nova-pvp-logo.gif")
    .setFooter({
      text: "NOVA PVP System • Nitro Booster Rewards • Merci pour ton soutien",
      iconURL: guild.iconURL({ dynamic: true }) || client.user?.displayAvatarURL()
    })
    .setTimestamp();

  // Send public celebration in boost channel
  try {
    await boostChannel.send({
      content: `🎉 **NOUVEAU BOOST DÉBLOQUÉ !** Merci infiniment à ${member} pour son soutien légendaire ! 🚀💜`,
      embeds: [boostEmbed],
      files
    });
  } catch (err) {
    console.error("[Boost Send Error]:", err.message);
  }

  // Send warm thank-you DM to the booster
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0xF47FFF)
      .setTitle("💜 MERCI INFINIMENT POUR TON BOOST !")
      .setDescription(
        `Salam **${member.user.username}** ! 🏆\n\n` +
        `Bghina nchokrok bzzaf 3la l-boost li 3titi l serveur **NOVA PVP** ! 🚀\n` +
        `Grâce lik serveur kayzid y9wa o kay-débloqui des fonctionnalités exclusives l kolchi.\n\n` +
        `💰 **Cadeau spécial :** **+500 Coins** ont été ajoutés à ton solde (\`/balance\`) !\n` +
        `👑 Tu possèdes désormais le rôle exclusif **Server Booster** et l'accès aux salons VIP.\n\n` +
        `Ila khtajiti ayy 7aja, l-staff dima f l-khidma ! Marhba bik dima ! ⚔️`
      )
      .setFooter({ text: "NOVA PVP • Staff & Administration" })
      .setTimestamp();

    await member.send({ embeds: [dmEmbed] }).catch(() => {});
  } catch {}

  // Log in Audit / Mod logs
  try {
    await log(guild, "🚀 Nouveau Boost Serveur", `**${member.user.tag}** (${member.id}) a boosté le serveur ! Total : **${totalBoosts} boosts** (${currentTierText}).`, 0xF47FFF, {
      category: "member",
      userId: member.id
    });
  } catch {}

  return true;
}

module.exports = {
  resolveBoostChannel,
  handleBoost
};
