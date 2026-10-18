const { Client, GatewayIntentBits, REST, Routes, Events, ActivityType } = require("discord.js");
const config = require("./config");
const { commands, handleCommand } = require("./commands");
const { startDashboard } = require("./dashboard");
const { log } = require("./logger");
const { db } = require("./db");

// Validate environment variables on startup
const missingConfig = config.validateBotConfig();
if (missingConfig.length > 0) {
  console.error("==================================================================");
  console.error("ERREUR DE CONFIGURATION CRITIQUE :");
  console.error(`Les variables d'environnement suivantes sont manquantes ou par défaut :`);
  console.error(missingConfig.map(k => `  - ${k}`).join("\n"));
  console.error("Veuillez renseigner votre fichier .env avant de démarrer le bot.");
  console.error("==================================================================");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  allowedMentions: { parse: ["users", "roles"], repliedUser: false }
});

let httpServer = null;

async function registerCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(config.token);
    if (config.guildId) {
      console.log(`[Commands] Enregistrement de ${commands.length} commandes slash sur le serveur ${config.guildId}...`);
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log(`[Commands] Commandes slash enregistrées avec succès sur le serveur ${config.guildId}.`);
    } else {
      console.log(`[Commands] Aucun GUILD_ID spécifié, enregistrement des commandes de manière globale...`);
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log(`[Commands] Commandes slash globales enregistrées avec succès.`);
    }
  } catch (error) {
    console.error("[Commands] Erreur lors de l'enregistrement des commandes slash :", error.message);
  }
}

client.once(Events.ClientReady, async readyClient => {
  console.log(`[Bot Discord] Connecté avec succès : ${readyClient.user.tag}`);
  console.log(`[Bot Discord] Présent sur ${readyClient.guilds.cache.size} serveur(s).`);

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
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
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
});

client.on(Events.GuildMemberAdd, member => {
  log(member.guild, "Nouveau membre", `📥 **${member.user.tag}** (${member.id}) a rejoint le serveur.`, 0x57F287, {
    category: "member",
    userId: member.id
  });
});

client.on(Events.GuildMemberRemove, member => {
  log(member.guild, "Départ d'un membre", `📤 **${member.user.tag}** (${member.id}) a quitté le serveur.`, 0xED4245, {
    category: "member",
    userId: member.id
  });
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
