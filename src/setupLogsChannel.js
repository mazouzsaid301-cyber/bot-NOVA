const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { setSetting } = require("./db");

async function setupLogsChannel() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  console.log("==================================================================");
  console.log("🚀 [Logs Setup] Configuration du salon de logs serveur NOVA PVP...");
  console.log("==================================================================");

  await client.login(process.env.DISCORD_TOKEN);
  console.log(`[Logs Setup] Connecté en tant que ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  if (!guild) {
    console.error(`[Logs Setup] Erreur : Serveur (${process.env.GUILD_ID}) introuvable !`);
    process.exit(1);
  }

  // 1. Find or locate Staff HQ category
  const channels = await guild.channels.fetch();
  let staffCategory = channels.find(c =>
    c && c.type === ChannelType.GuildCategory && (c.name.includes("STAFF") || c.name.includes("ADMIN"))
  );

  // 2. Find Staff role for permissions
  const staffRole = guild.roles.cache.find(r =>
    r.name.includes("Staff") || r.name.includes("Master Admin") || r.name.includes("Management")
  );

  // 3. Find or create 📜・server-logs channel
  let logChannel = channels.find(c =>
    c && c.type === ChannelType.GuildText && (c.name === "📜・server-logs" || c.name === "server-logs")
  );

  if (!logChannel) {
    console.log("[Logs Setup] Création du salon '📜・server-logs'...");
    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel] // Invisible pour les membres normaux
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages
        ]
      }
    ];

    if (staffRole) {
      permissionOverwrites.push({
        id: staffRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
      });
    }

    logChannel = await guild.channels.create({
      name: "📜・server-logs",
      type: ChannelType.GuildText,
      parent: staffCategory ? staffCategory.id : null,
      topic: "Logs en temps réel des activités du serveur NOVA PVP (Membres, Messages, Modération, Vocaux)",
      permissionOverwrites,
      reason: "Création automatique du salon de logs centralisé pour NOVA PVP"
    });
    console.log(`✅ [Logs Setup] Salon créé avec succès : "${logChannel.name}" (ID: ${logChannel.id})`);
  } else {
    console.log(`ℹ️ [Logs Setup] Salon existant trouvé : "${logChannel.name}" (ID: ${logChannel.id})`);
  }

  // 4. Save to Database setting so logger.js uses it immediately
  try {
    setSetting(`logs:${guild.id}`, logChannel.id);
    console.log(`💾 [Logs Setup] Configuration enregistrée en base de données pour le serveur ${guild.id}.`);
  } catch (err) {
    console.warn("[Logs Setup] Note DB:", err.message);
  }

  // 5. Update .env file with new LOG_CHANNEL_ID
  try {
    const envPath = path.join(__dirname, "..", ".env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8");
      if (envContent.includes("LOG_CHANNEL_ID=")) {
        envContent = envContent.replace(/LOG_CHANNEL_ID=.*/, `LOG_CHANNEL_ID=${logChannel.id}`);
      } else {
        envContent += `\nLOG_CHANNEL_ID=${logChannel.id}`;
      }
      fs.writeFileSync(envPath, envContent, "utf8");
      console.log(`📝 [Logs Setup] Fichier .env mis à jour : LOG_CHANNEL_ID=${logChannel.id}`);
    }
  } catch (err) {
    console.warn("[Logs Setup] Note mise à jour .env:", err.message);
  }

  // 6. Send Initial Presentation Embed in the new logs channel
  const initEmbed = new EmbedBuilder()
    .setColor(0x8B5CF6) // Electric Violet
    .setTitle("📜・SYSTÈME DE LOGS CENTRALISÉ — NOVA PVP")
    .setDescription(
      `Ce salon enregistre automatiquement et en temps réel **tout ce qui se passe sur le serveur** :\n\n` +
      `📥 **Membres :** Arrivées, Départs, Changements de pseudo et Attribution de rôles.\n` +
      `💬 **Messages :** Messages supprimés et Messages modifiés (avec aperçu avant/après).\n` +
      `🔊 **Salons Vocaux :** Connexion, Déconnexion et Déplacements entre salons.\n` +
      `🛡️ **Modération :** Bannissements, Débannissements, Kicks, Mutes et Avertissements.\n` +
      `⚙️ **Structure :** Création et Suppression de salons ou rôles.\n\n` +
      `*Ce salon est strictement privé et réservé à l'équipe Staff et à l'Administration.*`
    )
    .addFields([
      { name: "Serveur", value: `${guild.name}`, inline: true },
      { name: "ID du Salon", value: `\`${logChannel.id}\``, inline: true },
      { name: "Statut", value: "🟢 Actif & Opérationnel", inline: true }
    ])
    .setFooter({ text: "NOVA PVP SYSTEME • Journal d'Audit & Sécurité" })
    .setTimestamp();

  await logChannel.send({ embeds: [initEmbed] }).catch(() => {});
  console.log(`📨 [Logs Setup] Message d'initialisation envoyé dans #${logChannel.name} !`);

  console.log("==================================================================");
  console.log("🎉 [Logs Setup Terminé avec Succès]");
  console.log(`   Salon configuré : #${logChannel.name} (${logChannel.id})`);
  console.log("==================================================================");

  await client.destroy();
  return logChannel;
}

if (require.main === module) {
  setupLogsChannel().then(() => process.exit(0)).catch(err => {
    console.error("[Logs Setup] Erreur :", err);
    process.exit(1);
  });
}

module.exports = { setupLogsChannel };
