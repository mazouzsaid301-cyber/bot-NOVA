const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require("@discordjs/voice");
const { getSetting, setSetting } = require("./db");

const activeConnections = new Map();

async function connectToVoice(guild, channelId) {
  try {
    let channel = guild.channels.cache.get(channelId);
    if (!channel) {
      channel = await guild.channels.fetch(channelId).catch(() => null);
    }
    if (!channel || (!channel.isVoiceBased())) {
      console.warn(`[Voice 24/7] Salon vocal introuvable pour le serveur ${guild.name} (${guild.id})`);
      return null;
    }

    let botMember = guild.members.me;
    if (!botMember) {
      botMember = await guild.members.fetchMe().catch(() => null);
    }
    const perms = channel.permissionsFor(botMember);
    if (!perms || !perms.has("ViewChannel") || !perms.has("Connect")) {
      console.warn(`[Voice 24/7] ⚠️ Permissions insuffisantes pour rejoindre "${channel.name}" sur "${guild.name}" : le bot a besoin des permissions "Voir le salon" (ViewChannel) et "Se connecter" (Connect).`);
      return null;
    }

    console.log(`[Voice 24/7] Connexion au salon vocal "${channel.name}" sur le serveur "${guild.name}"...`);

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false
    });

    activeConnections.set(guild.id, connection);

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log(`[Voice 24/7] Connecté avec succès au salon vocal "${channel.name}" sur "${guild.name}" !`);
    });

    connection.on("error", (error) => {
      console.error(`[Voice 24/7] Erreur sur la connexion vocale :`, error.message);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000)
        ]);
        // Reconnected successfully
      } catch (e) {
        // Check if 24/7 is still enabled
        const savedChannelId = getSetting(`voice_channel:${guild.id}`);
        if (savedChannelId) {
          console.log(`[Voice 24/7] Reconnexion automatique au salon vocal dans 5 secondes sur "${guild.name}"...`);
          try { connection.destroy(); } catch {}
          setTimeout(() => connectToVoice(guild, savedChannelId), 5000);
        } else {
          try { connection.destroy(); } catch {}
          activeConnections.delete(guild.id);
        }
      }
    });

    return connection;
  } catch (error) {
    console.error(`[Voice 24/7] Erreur lors de la connexion au salon vocal :`, error);
    return null;
  }
}

async function enable247Voice(guild, channelId) {
  setSetting(`voice_channel:${guild.id}`, channelId);
  return await connectToVoice(guild, channelId);
}

function disable247Voice(guild) {
  setSetting(`voice_channel:${guild.id}`, "");
  const connection = getVoiceConnection(guild.id) || activeConnections.get(guild.id);
  if (connection) {
    try {
      connection.destroy();
    } catch {}
    activeConnections.delete(guild.id);
  }
  return true;
}

let watchersInitialized = false;

function setupVoiceWatchers(client) {
  if (watchersInitialized) return;
  watchersInitialized = true;

  // Détection des modifications de permissions de salon
  client.on("channelUpdate", async (_, newChannel) => {
    if (newChannel && typeof newChannel.isVoiceBased === "function" && newChannel.isVoiceBased()) {
      const savedChannelId = getSetting(`voice_channel:${newChannel.guild.id}`);
      if (savedChannelId === newChannel.id) {
        const conn = getVoiceConnection(newChannel.guild.id);
        if (!conn || conn.state.status !== VoiceConnectionStatus.Ready) {
          console.log(`[Voice 24/7] Détection de modification sur "${newChannel.name}", nouvelle tentative de connexion...`);
          connectToVoice(newChannel.guild, savedChannelId);
        }
      }
    }
  });

  // Détection des modifications de rôles ou permissions du bot
  client.on("guildMemberUpdate", async (_, newMember) => {
    if (newMember.id === client.user.id) {
      const savedChannelId = getSetting(`voice_channel:${newMember.guild.id}`);
      if (savedChannelId) {
        const conn = getVoiceConnection(newMember.guild.id);
        if (!conn || conn.state.status !== VoiceConnectionStatus.Ready) {
          console.log(`[Voice 24/7] Rôles ou permissions du bot mis à jour sur "${newMember.guild.name}", tentative de connexion au vocal 24/7...`);
          connectToVoice(newMember.guild, savedChannelId);
        }
      }
    }
  });

  // Tentative périodique si le salon est configuré mais que les permissions manquaient
  setInterval(() => {
    for (const [, guild] of client.guilds.cache) {
      const savedChannelId = getSetting(`voice_channel:${guild.id}`);
      if (savedChannelId) {
        const conn = getVoiceConnection(guild.id);
        if (!conn || conn.state.status !== VoiceConnectionStatus.Ready) {
          connectToVoice(guild, savedChannelId);
        }
      }
    }
  }, 15000);
}

async function reconnectAll247Voice(client, config = {}) {
  setupVoiceWatchers(client);
  const globalVoiceId = config.voiceChannelId || process.env.VOICE_CHANNEL_ID || "";

  for (const [, guild] of client.guilds.cache) {
    let savedChannelId = getSetting(`voice_channel:${guild.id}`);

    if (!savedChannelId && globalVoiceId) {
      try {
        const found = guild.channels.cache.get(globalVoiceId) || await guild.channels.fetch(globalVoiceId).catch(() => null);
        if (found && found.isVoiceBased()) {
          savedChannelId = globalVoiceId;
          setSetting(`voice_channel:${guild.id}`, globalVoiceId);
        }
      } catch {}
    }

    if (savedChannelId) {
      console.log(`[Voice 24/7] Reprise de la connexion vocale 24/7 (${savedChannelId}) pour le serveur "${guild.name}"...`);
      connectToVoice(guild, savedChannelId);
    }
  }
}

module.exports = {
  enable247Voice,
  disable247Voice,
  reconnectAll247Voice,
  connectToVoice,
  setupVoiceWatchers
};

