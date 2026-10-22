const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, REST, Routes, Events, ActivityType, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder, AuditLogEvent } = require("discord.js");
const config = require("./config");
const { commands, handleCommand, handleButton, handleModalSubmit } = require("./commands");
const { startDashboard } = require("./dashboard");
const { log } = require("./logger");
const { db, addXp } = require("./db");
const { reconnectAll247Voice } = require("./voice");
const { handleBoost } = require("./boost");
const { startGamingFeedScheduler } = require("./gaming");
const { startFivemScriptsScheduler } = require("./fivemScripts");
const { startFivemCitizensScheduler } = require("./fivemCitizens");

// Validate environment variables on startup
const missingConfig = config.validateBotConfig();
if (missingConfig.length > 0) {
  console.error("==================================================================");
  console.error("ERREUR DE CONFIGURATION CRITIQUE :");
  console.error("Les variables d'environnement suivantes sont manquantes ou invalides :");
  console.error(missingConfig.map(k => `  - ${k}`).join("\n"));
  console.error("Veuillez renseigner votre fichier .env avant de démarrer le bot.");
  console.error("==================================================================");
  process.exit(1);
}

// Client intents: Guilds, Voice, Messages, and Members
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMembers
];
if (process.env.ENABLE_MESSAGE_CONTENT_INTENT === "true") {
  intents.push(GatewayIntentBits.MessageContent);
}

const client = new Client({
  intents,
  allowedMentions: { parse: ["users", "roles"], repliedUser: false }
});

let httpServer = null;

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);

  // 1. Register global slash commands so they work in all servers
  try {
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log(`[Commands] ${commands.length} commandes slash globales enregistrées avec succès.`);
  } catch (error) {
    console.warn(`[Commands] Note enregistrement global : ${error.message}`);
  }

  // 2. If a specific guildId is configured, register directly for instant dev refresh
  if (config.guildId) {
    try {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log(`[Commands] Commandes slash synchronisées sur le serveur ${config.guildId}.`);
    } catch (error) {
      if (error.message && error.message.includes("Missing Access")) {
        console.warn(`[Commands] Note : Le bot n'est pas encore sur le serveur ${config.guildId}.`);
        console.warn(`[Commands] Invitez le bot avec ce lien :`);
        console.warn(`  https://discord.com/oauth2/authorize?client_id=${config.clientId}&scope=bot%20applications.commands&permissions=8`);
      } else {
        console.warn(`[Commands] Enregistrement serveur (${config.guildId}) : ${error.message}`);
      }
    }
  }
}

client.once(Events.ClientReady, async readyClient => {
  console.log("==================================================================");
  console.log(`[Bot Discord] Connecté avec succès en tant que : ${readyClient.user.tag}`);
  console.log(`[Bot Discord] Présent sur ${readyClient.guilds.cache.size} serveur(s).`);

  if (readyClient.guilds.cache.size === 0) {
    console.log("------------------------------------------------------------------");
    console.log("ATTENTION : Le bot n'a pas encore rejoint votre serveur Discord !");
    console.log("Ouvrez ce lien dans votre navigateur pour l'inviter :");
    console.log(`👉 https://discord.com/oauth2/authorize?client_id=${config.clientId}&scope=bot%20applications.commands&permissions=8`);
    console.log("------------------------------------------------------------------");
  } else {
    readyClient.guilds.cache.forEach(g => {
      console.log(`  - Serveur : "${g.name}" (ID: ${g.id}, ${g.memberCount} membres)`);
    });
  }

  // Set bot presence
  try {
    readyClient.user.setPresence({
      activities: [{ name: "/help | mazoodev.com", type: ActivityType.Playing }],
      status: "online"
    });
  } catch {}

  // Start HTTP API and Dashboard server
  try {
    httpServer = startDashboard(client, config);
  } catch (err) {
    console.error("[API Dashboard] Erreur lors du lancement du serveur HTTP :", err.message);
  }

  // Auto-reconnect 24/7 voice channels if configured
  try {
    reconnectAll247Voice(readyClient, config);
  } catch (err) {
    console.error("[Voice 24/7] Erreur lors de la reconnexion vocale :", err.message);
  }

  // Register slash commands (global & guild)
  try {
    await registerCommands();
  } catch (err) {
    console.error("[Commands] Erreur lors de l'enregistrement des commandes :", err.message);
  }

  // Start Gaming Hub Feed Scheduler (Free Games & News)
  try {
    startGamingFeedScheduler(readyClient, config, 30);
  } catch (err) {
    console.error("[Gaming Feed] Erreur lancement scheduler :", err.message);
  }

  // Start FiveM Free Scripts Feed Scheduler
  try {
    startFivemScriptsScheduler(readyClient, config, 30);
  } catch (err) {
    console.error("[FiveM Scripts] Erreur lancement scheduler :", err.message);
  }

  // Start FiveM Citizens & Graphic Mods Feed Scheduler
  try {
    startFivemCitizensScheduler(readyClient, config, 30);
  } catch (err) {
    console.error("[FiveM Citizens] Erreur lancement scheduler :", err.message);
  }
  console.log("==================================================================");
});

client.on(Events.GuildCreate, async guild => {
  console.log(`[Bot Discord] Le bot a rejoint un nouveau serveur : "${guild.name}" (${guild.id}) !`);
  try {
    reconnectAll247Voice(client, config);
  } catch (err) {
    console.error("[Voice 24/7] Erreur reconnexion sur nouveau serveur :", err.message);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    try {
      await handleCommand(interaction, client, config);
    } catch (error) {
      console.error(`[Commands] Erreur commande /${interaction.commandName} :`, error);
      const response = {
        content: "❌ Une erreur inattendue est survenue lors de l'exécution de cette commande. Vérifiez les permissions du bot et réessayez.",
        ephemeral: true
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(response).catch(() => {});
      } else {
        await interaction.reply(response).catch(() => {});
      }
      if (interaction.guild) {
        await log(interaction.guild, "Erreur Commande", `/${interaction.commandName} par ${interaction.user.tag} : ${String(error.message || error)}`, 0xED4245, {
          category: "bot",
          userId: interaction.user.id
        });
      }
    }
  } else if (interaction.isButton()) {
    try {
      await handleButton(interaction, client, config);
    } catch (error) {
      console.error(`[Button Error] ${interaction.customId} :`, error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Une erreur est survenue lors de cette action. Vérifiez les permissions du bot.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  } else if (interaction.isModalSubmit()) {
    try {
      await handleModalSubmit(interaction, client, config);
    } catch (error) {
      console.error(`[Modal Error] ${interaction.customId} :`, error);
      const errorMsg = {
        content: "❌ Une erreur est survenue lors de l'envoi de votre annonce. Vérifiez les permissions du bot.",
        ephemeral: true
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(errorMsg).catch(() => {});
      } else {
        await interaction.reply(errorMsg).catch(() => {});
      }
    }
  }
});

client.on(Events.GuildMemberAdd, async member => {
  // 1. Audit log
  log(member.guild, "Nouveau membre", `📥 **${member.user.tag}** (${member.id}) a rejoint le serveur.`, 0x57F287, {
    category: "member",
    userId: member.id
  });

  // 2. Auto-role: 👥・Members (1561289752932786197) if available
  try {
    const memberRole = member.guild.roles.cache.get("1561289752932786197") || member.guild.roles.cache.find(r => r.name.includes("Members"));
    if (memberRole && member.guild.members.me.roles.highest.position > memberRole.position) {
      await member.roles.add(memberRole).catch(() => {});
    }
  } catch (err) {
    console.error("[AutoRole Error]:", err.message);
  }

  // 3. Welcome notification in 👋・welcome (1561442787679936712) with nova-pvp-logo.gif
  try {
    const welcomeChannelId = config.welcomeChannelId || "1561442787679936712";
    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId) || member.guild.channels.cache.find(c => c.name.includes("welcome"));

    if (welcomeChannel && welcomeChannel.permissionsFor(member.guild.members.me)?.has(PermissionFlagsBits.SendMessages)) {
      const gifPath = path.join(__dirname, "..", "assets", "nova-pvp-logo.gif");
      const files = [];
      const imageAttachmentName = "nova-pvp-logo.gif";

      if (fs.existsSync(gifPath)) {
        files.push(new AttachmentBuilder(gifPath, { name: imageAttachmentName }));
      }

      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x8B5CF6) // Electric Violet NOVA Theme
        .setTitle("⚔️ BIENVENUE DANS L'ARÈNE NOVA PVP !")
        .setDescription(
          `Marhba bik ${member} f la communauté officielle **NOVA PVP** ! 🏆\n\n` +
          `🔥 Prépare ton stuff, trouve ton équipe et domine l'arène !\n\n` +
          `📜・**Règles du serveur :** <#1561442792729739385>\n` +
          `🎭・**Choisis tes rôles :** <#1558904477996548120>\n` +
          `💬・**Chat général :** <#1561442800455647322>\n` +
          `⚔️・**Arène PVP & Matchmaking :** <#1561442812216615052>\n` +
          `🎫・**Besoin d'aide ? :** <#1561442825218822164>\n\n` +
          `Tu es notre **${member.guild.memberCount}ème combattant** ! ⚡`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage(files.length > 0 ? `attachment://${imageAttachmentName}` : "https://cdn.discordapp.com/attachments/1561275464243478678/1561452111571456164/nova-pvp-logo.gif")
        .setFooter({ text: "NOVA PVP SYSTEME • Prépare-toi au combat !" })
        .setTimestamp();

      await welcomeChannel.send({
        content: `👋 Bienvenue ${member} sur le serveur **NOVA PVP** ! ⚔️`,
        embeds: [welcomeEmbed],
        files
      }).catch(err => console.error("[Welcome Send Error]:", err.message));

      // 4. Send private DM welcome directly to the new member
      try {
        await member.send({
          content: `Marhba bik ${member} f **NOVA PVP** ! 🏆\nTu es notre **${member.guild.memberCount}ème combattant**.\n\nPrépare ton stuff et rejoins l'arène !\n📜・Règles : <#1561442792729739385>\n🎭・Rôles : <#1558904477996548120>\n💬・Général : <#1561442800455647322>\n⚔️・PVP Arena : <#1561442812216615052>`,
          embeds: [welcomeEmbed]
        }).catch(() => {});
      } catch {}
    }
  } catch (err) {
    console.error("[Welcome Notification Error]:", err.message);
  }
});

client.on(Events.GuildMemberRemove, member => {
  log(member.guild, "Départ d'un membre", `📤 **${member.user.tag}** (${member.id}) a quitté le serveur.`, 0xED4245, {
    category: "member",
    userId: member.id
  });
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    const wasBoosting = Boolean(oldMember.premiumSince);
    const isBoosting = Boolean(newMember.premiumSince);

    if (!wasBoosting && isBoosting) {
      await handleBoost(newMember, client, config);
    }
  } catch (err) {
    console.error("[Boost GuildMemberUpdate Error]:", err.message);
  }
});

client.on(Events.MessageCreate, async message => {
  if (!message.guild) return;

  // Nitro Boost System Messages (Type 8: UserPremiumGuildSubscription, 9: TierOne, 10: TierTwo, 11: TierThree)
  const boostTypes = [8, 9, 10, 11];
  if (boostTypes.includes(message.type)) {
    try {
      const boosterMember = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
      if (boosterMember) {
        await handleBoost(boosterMember, client, config);
      }
    } catch (err) {
      console.error("[Boost MessageCreate Error]:", err.message);
    }
    return;
  }

  if (message.author.bot) return;

  // Leveling & XP Gain
  try {
    const xpGain = Math.floor(Math.random() * 11) + 15; // 15 to 25 XP
    const res = addXp(message.author.id, xpGain, 60000); // 60s anti-spam cooldown
    if (res && res.success && res.leveledUp) {
      const levelChannel = message.guild.channels.cache.find(c =>
        c.name.includes("level-chat") || c.name.includes("rank") || c.name.includes("général")
      );
      const targetChan = levelChannel || message.channel;

      const levelEmbed = new EmbedBuilder()
        .setColor(0x8B5CF6) // Electric Violet
        .setTitle("⚡ LEVEL UP — NOVA PVP")
        .setDescription(`Félicitations ${message.author} ! Tu passes **Niveau ${res.newLevel}** ! 🏆\nContinue de participer pour débloquer des récompenses exclusives. Tape \`/rewards-info\` pour voir tes privilèges.`)
        .setFooter({ text: "NOVA PVP System • Système d'XP" })
        .setTimestamp();

      if (targetChan && targetChan.permissionsFor(message.guild.members.me)?.has(PermissionFlagsBits.SendMessages)) {
        await targetChan.send({ embeds: [levelEmbed] }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[XP Error]:", err.message);
  }

  // Auto-reactions in #memes channel (😂, 💀, 🔥)
  try {
    const memesChanId = config.memesChannelId || "1561442808353652908";
    const isMemesChan = message.channel.id === memesChanId || message.channel.name?.toLowerCase().includes("meme");
    if (isMemesChan && (message.attachments.size > 0 || message.content.includes("http://") || message.content.includes("https://"))) {
      await message.react("😂").catch(() => {});
      await message.react("💀").catch(() => {});
      await message.react("🔥").catch(() => {});
    }
  } catch (err) {
    console.error("[Memes Auto-React Error]:", err.message);
  }
});

client.on(Events.MessageUpdate, (oldMsg, newMsg) => {
  if (oldMsg.guild && !oldMsg.author?.bot && oldMsg.content !== newMsg.content) {
    const channelName = oldMsg.channel?.name ? `#${oldMsg.channel.name}` : "salon inconnu";
    const authorTag = oldMsg.author?.tag || "Utilisateur inconnu";
    const before = (oldMsg.content || "[Média ou non disponible]").slice(0, 200);
    const after = (newMsg.content || "[Média ou non disponible]").slice(0, 200);

    log(oldMsg.guild, "Message modifié", `Auteur : **${authorTag}**\nSalon : ${channelName}\n**Avant :** \`\`\`${before}\`\`\`\n**Après :** \`\`\`${after}\`\`\``, 0x06B6D4, {
      category: "moderation",
      userId: oldMsg.author?.id
    });
  }
});

client.on(Events.MessageDelete, message => {
  if (message.guild && !message.author?.bot) {
    const channelName = message.channel?.name ? `#${message.channel.name}` : "salon inconnu";
    const authorTag = message.author?.tag || "Utilisateur inconnu";
    const preview = (message.content || "[Contenu indisponible ou média]").slice(0, 500);
    log(message.guild, "Message supprimé", `Auteur : **${authorTag}**\nSalon : ${channelName}\nContenu : \`\`\`${preview}\`\`\``, 0xFEE75C, {
      category: "moderation",
      userId: message.author?.id
    });
  }
});

client.on(Events.GuildBanAdd, ban => {
  log(ban.guild, "Bannissement détecté", `🔨 **${ban.user.tag}** (${ban.user.id}) a été banni du serveur.`, 0xED4245, {
    category: "moderation",
    userId: ban.user.id
  });
});

client.on(Events.GuildBanRemove, ban => {
  log(ban.guild, "Débannissement détecté", `🔓 **${ban.user.tag}** (${ban.user.id}) a été débanni du serveur.`, 0x57F287, {
    category: "moderation",
    userId: ban.user.id
  });
});

// Logs : Mise à jour d'un membre (Rôles & Pseudo)
client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
  if (!oldMember.guild) return;

  // 1. Changement de pseudo
  if (oldMember.nickname !== newMember.nickname) {
    const oldNick = oldMember.nickname || oldMember.user.username;
    const newNick = newMember.nickname || newMember.user.username;
    log(newMember.guild, "Pseudo modifié", `👤 Membre : **${newMember.user.tag}** (${newMember.id})\n**Ancien :** \`${oldNick}\`\n**Nouveau :** \`${newNick}\``, 0x38BDF8, {
      category: "member",
      userId: newMember.id
    });
  }

  // 2. Ajout / Retrait de rôles
  const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

  if (addedRoles.size > 0) {
    const rolesList = addedRoles.map(r => `\`${r.name}\``).join(", ");
    log(newMember.guild, "Rôle(s) attribué(s)", `➕ Membre : **${newMember.user.tag}** (${newMember.id})\nRôle(s) : ${rolesList}`, 0x22D3EE, {
      category: "roles",
      userId: newMember.id
    });
  }

  if (removedRoles.size > 0) {
    const rolesList = removedRoles.map(r => `\`${r.name}\``).join(", ");
    log(newMember.guild, "Rôle(s) retiré(s)", `➖ Membre : **${newMember.user.tag}** (${newMember.id})\nRôle(s) : ${rolesList}`, 0xF97316, {
      category: "roles",
      userId: newMember.id
    });
  }
});

// Logs : Activité Vocale (Connexion, Déconnexion, Déplacement avec détection du Modérateur)
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const guild = newState.guild || oldState.guild;

  // 1. Connexion au vocal
  if (!oldState.channelId && newState.channelId) {
    const channelName = newState.channel?.name || "salon vocal";
    log(guild, "Connexion Vocale", `🔊 **${member.user.tag}** (<@${member.id}>) a rejoint le salon vocal **#${channelName}**.`, 0x57F287, {
      category: "voice",
      userId: member.id,
      fields: [
        { name: "Membre", value: `${member} (\`${member.user.tag}\`)`, inline: true },
        { name: "Salon Vocal", value: `\`#${channelName}\``, inline: true }
      ]
    });
  }
  // 2. Déconnexion du vocal (Volontaire ou Expulsé par un Modérateur)
  else if (oldState.channelId && !newState.channelId) {
    const channelName = oldState.channel?.name || "salon vocal";

    setTimeout(async () => {
      let kicker = null;
      try {
        if (guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
          const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberDisconnect }).catch(() => null);
          const entry = auditLogs?.entries?.first();
          if (entry && entry.target?.id === member.id && (Date.now() - entry.createdTimestamp) < 3500) {
            kicker = entry.executor;
          }
        }
      } catch {}

      const title = kicker ? "Expulsion Vocale" : "Déconnexion Vocale";
      const color = kicker ? 0xED4245 : 0xF97316;
      const desc = kicker
        ? `🚨 **${member.user.tag}** (<@${member.id}>) a été **expulsé(e) du vocal** par **${kicker.tag}** (<@${kicker.id}>) !\n📍 **Salon :** \`#${channelName}\``
        : `🔇 **${member.user.tag}** (<@${member.id}>) a quitté le salon vocal **#${channelName}** *(Déconnexion volontaire)*.`;

      const fields = [
        { name: "Membre", value: `${member} (\`${member.user.tag}\`)`, inline: true },
        { name: "Salon Vocal", value: `\`#${channelName}\``, inline: true }
      ];

      if (kicker) {
        fields.push({ name: "⚡ Expulsé par (Modérateur)", value: `${kicker} (\`${kicker.tag}\`)`, inline: false });
      }

      log(guild, title, desc, color, {
        category: "voice",
        userId: member.id,
        fields
      });
    }, 600);
  }
  // 3. Déplacement de salon vocal (Volontaire ou Déplacé par un Modérateur)
  else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    const oldName = oldState.channel?.name || "inconnu";
    const newName = newState.channel?.name || "inconnu";

    setTimeout(async () => {
      let mover = null;
      try {
        if (guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
          const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberMove }).catch(() => null);
          const entry = auditLogs?.entries?.first();
          if (entry && (Date.now() - entry.createdTimestamp) < 3500) {
            mover = entry.executor;
          }
        }
      } catch {}

      const title = mover ? "Déplacement Vocal (Par un Modérateur)" : "Changement de Salon Vocal";
      const desc = mover
        ? `🔁 **${member.user.tag}** (<@${member.id}>) a été **déplacé(e)** par **${mover.tag}** (<@${mover.id}>) !\n📍 **De :** \`#${oldName}\`\n📍 **Vers :** \`#${newName}\``
        : `🔁 **${member.user.tag}** (<@${member.id}>) a changé de salon vocal :\n📍 **De :** \`#${oldName}\`\n📍 **Vers :** \`#${newName}\``;

      const fields = [
        { name: "Membre", value: `${member} (\`${member.user.tag}\`)`, inline: true },
        { name: "Salons", value: `\`#${oldName}\` ➜ \`#${newName}\``, inline: true }
      ];

      if (mover) {
        fields.push({ name: "⚡ Déplacé par (Modérateur)", value: `${mover} (\`${mover.tag}\`)`, inline: false });
      }

      log(guild, title, desc, 0x38BDF8, {
        category: "voice",
        userId: member.id,
        fields
      });
    }, 600);
  }
});

// Logs : Création et Suppression de Salons
client.on(Events.ChannelCreate, channel => {
  if (!channel.guild) return;
  log(channel.guild, "Salon créé", `📁 Nouveau salon : **#${channel.name}** (ID: \`${channel.id}\`)`, 0x57F287, {
    category: "channel"
  });
});

client.on(Events.ChannelDelete, channel => {
  if (!channel.guild) return;
  log(channel.guild, "Salon supprimé", `🗑️ Salon supprimé : **#${channel.name}** (ID: \`${channel.id}\`)`, 0xED4245, {
    category: "channel"
  });
});

// Logs : Création et Suppression de Rôles
client.on(Events.RoleCreate, role => {
  log(role.guild, "Rôle créé", `🛡️ Nouveau rôle : **${role.name}** (ID: \`${role.id}\`)`, 0x57F287, {
    category: "roles"
  });
});

client.on(Events.RoleDelete, role => {
  log(role.guild, "Rôle supprimé", `🗑️ Rôle supprimé : **${role.name}** (ID: \`${role.id}\`)`, 0xED4245, {
    category: "roles"
  });
});

// Graceful Shutdown
async function shutdown(signal) {
  console.log(`[Process] Signal ${signal} reçu. Arrêt gracieux du bot en cours...`);
  try {
    if (httpServer) {
      httpServer.close(() => console.log("[API Dashboard] Serveur HTTP arrêté."));
    }
    client.destroy();
    console.log("[Bot Discord] Connexion Gateway Discord fermée.");
    db.close();
    console.log("[Database] Connexion SQLite fermée.");
  } catch (err) {
    console.error("[Process] Erreur lors de l'arrêt gracieux :", err);
  }
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", error => {
  console.error("[Process] Unhandled Rejection :", error);
});

process.on("uncaughtException", error => {
  console.error("[Process] Uncaught Exception :", error);
  process.exit(1);
});

// Bot Startup
(async () => {
  try {
    console.log("[Startup] Initialisation du bot...");
    await registerCommands();
    await client.login(config.token);
  } catch (error) {
    console.error("[Startup] Impossible de démarrer le bot :", error.message);
    process.exit(1);
  }
})();
