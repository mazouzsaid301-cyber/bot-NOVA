const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require("@discordjs/voice");
const { getSetting, setSetting } = require("./db");
const { log } = require("./logger");

const activeConnections = new Map();
const voiceActivity = new Map(); // key: memberId, value: timestamp of last active

async function connectToVoice(guild, channelId) {
  try {
    let channel = guild.channels.cache.get(channelId);
    if (!channel) {
      channel = await guild.channels.fetch(channelId).catch(() => null);
    }
    if (!channel || !channel.isVoiceBased()) {
      console.warn(`[Voice 24/7] Salon vocal introuvable pour le serveur ${guild.name} (${guild.id})`);
      return null;
    }

    let botMember = guild.members.me;
    if (!botMember) {
      botMember = await guild.members.fetchMe().catch(() => null);
    }
    const perms = channel.permissionsFor(botMember);
    if (!perms || !perms.has("ViewChannel") || !perms.has("Connect")) {
      console.warn(`[Voice 24/7] ⚠️ Permissions insuffisantes pour rejoindre "${channel.name}" sur "${guild.name}" : le bot a besoin de "Voir le salon" (ViewChannel) et "Se connecter" (Connect).`);
      return null;
    }

    const existingConn = getVoiceConnection(guild.id);
    const isAlreadyConnectingOrReady = existingConn && (
      existingConn.state.status === VoiceConnectionStatus.Ready ||
      existingConn.state.status === VoiceConnectionStatus.Connecting ||
      existingConn.state.status === VoiceConnectionStatus.Signalling
    );
    if (isAlreadyConnectingOrReady && botMember?.voice?.channelId === channel.id) {
      // Déjà en cours de connexion ou connecté au bon salon
      return existingConn;
    }

    console.log(`[Voice 24/7] Connexion / Déplacement vers le salon dédié "${channel.name}" (${channel.id}) sur "${guild.name}"...`);

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true
    });

    activeConnections.set(guild.id, connection);

    if (!connection._hasCustomListeners) {
      connection._hasCustomListeners = true;

      connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`[Voice 24/7] Connecté avec succès au salon vocal dédié "${channel.name}" sur "${guild.name}" !`);
      });

      connection.on("error", (error) => {
        console.error(`[Voice 24/7] Erreur connexion vocale :`, error.message);
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5000)
          ]);
        } catch (e) {
          const targetChannelId = process.env.VOICE_CHANNEL_ID || getSetting(`voice_channel:${guild.id}`);
          if (targetChannelId) {
            console.log(`[Voice 24/7] Reconnexion automatique au salon dédié dans 3 secondes sur "${guild.name}"...`);
            try { connection.destroy(); } catch {}
            activeConnections.delete(guild.id);
            setTimeout(() => connectToVoice(guild, targetChannelId), 3000);
          } else {
            try { connection.destroy(); } catch {}
            activeConnections.delete(guild.id);
          }
        }
      });
    }

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

  // Surveillance du bot lui-même : s'il est déplacé dans un autre salon (comme NOVA LOBBY) ou déconnecté, le remettre immédiatement dans son salon officiel !
  client.on("voiceStateUpdate", async (oldState, newState) => {
    if (newState.id === client.user.id) {
      const targetChannelId = process.env.VOICE_CHANNEL_ID || getSetting(`voice_channel:${newState.guild.id}`);
      if (!targetChannelId) return;

      if (newState.channelId !== targetChannelId) {
        console.log(`[Voice 24/7] ⚠️ Détection: le bot NOVA PVP est hors de son salon officiel (actuel: ${newState.channelId || 'aucun'}). Rapatriement immédiat vers ${targetChannelId}...`);
        setTimeout(() => {
          connectToVoice(newState.guild, targetChannelId);
        }, 1500);
      }
    }
  });

  // Détection des modifications de permissions de salon
  client.on("channelUpdate", async (_, newChannel) => {
    if (newChannel && typeof newChannel.isVoiceBased === "function" && newChannel.isVoiceBased()) {
      const targetChannelId = process.env.VOICE_CHANNEL_ID || getSetting(`voice_channel:${newChannel.guild.id}`);
      if (targetChannelId === newChannel.id) {
        const conn = getVoiceConnection(newChannel.guild.id);
        const botMember = newChannel.guild.members.me;
        if (!conn || conn.state.status !== VoiceConnectionStatus.Ready || botMember?.voice?.channelId !== targetChannelId) {
          console.log(`[Voice 24/7] Modification sur le salon dédié "${newChannel.name}", reconnexion...`);
          connectToVoice(newChannel.guild, targetChannelId);
        }
      }
    }
  });

  // Détection des modifications de rôles ou permissions du bot
  client.on("guildMemberUpdate", async (_, newMember) => {
    if (newMember.id === client.user.id) {
      const targetChannelId = process.env.VOICE_CHANNEL_ID || getSetting(`voice_channel:${newMember.guild.id}`);
      if (targetChannelId) {
        const conn = getVoiceConnection(newMember.guild.id);
        const botMember = newMember.guild.members.me;
        if (!conn || conn.state.status !== VoiceConnectionStatus.Ready || botMember?.voice?.channelId !== targetChannelId) {
          console.log(`[Voice 24/7] Permissions du bot mises à jour sur "${newMember.guild.name}", reconnexion au salon dédié...`);
          connectToVoice(newMember.guild, targetChannelId);
        }
      }
    }
  });

  // Vérification périodique toutes les 15 secondes pour verrouiller le bot dans son salon dédié
  setInterval(() => {
    for (const [, guild] of client.guilds.cache) {
      const targetChannelId = process.env.VOICE_CHANNEL_ID || getSetting(`voice_channel:${guild.id}`);
      if (targetChannelId) {
        const botMember = guild.members.me;
        const currentChannelId = botMember?.voice?.channelId;
        const conn = getVoiceConnection(guild.id);

        if (!currentChannelId || currentChannelId !== targetChannelId || !conn || conn.state.status !== VoiceConnectionStatus.Ready) {
          connectToVoice(guild, targetChannelId);
        }
      }
    }
  }, 15000);

  // Tracking de l'activité vocale (Détection AFK > 1 heure pour les utilisateurs)
  client.on("voiceStateUpdate", (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    if (!newState.channelId) {
      voiceActivity.delete(member.id);
      return;
    }

    if (oldState.channelId !== newState.channelId) {
      voiceActivity.set(member.id, Date.now());
      return;
    }

    const wasMuted = oldState.selfMute || oldState.serverMute || oldState.selfDeaf || oldState.serverDeaf;
    const isMuted = newState.selfMute || newState.serverMute || newState.selfDeaf || newState.serverDeaf;
    if (wasMuted && !isMuted) {
      voiceActivity.set(member.id, Date.now());
    } else if (!voiceActivity.has(member.id)) {
      voiceActivity.set(member.id, Date.now());
    }
  });

  // Vérification périodique AFK > 1h
  setInterval(async () => {
    const ONE_HOUR = 3600000;
    const now = Date.now();

    for (const [, guild] of client.guilds.cache) {
      let afkChannelId = guild.afkChannelId;
      if (!afkChannelId) {
        const afkChan = guild.channels.cache.find(c =>
          c.isVoiceBased() && (c.name.toLowerCase().includes("afk") || c.name.toLowerCase().includes("sleep"))
        );
        afkChannelId = afkChan?.id;
      }

      if (!afkChannelId) continue;

      for (const [memberId, state] of guild.voiceStates.cache) {
        if (!state.channelId || state.channelId === afkChannelId) continue;
        const member = state.member;
        if (!member || member.user.bot) continue;

        if (!voiceActivity.has(memberId)) {
          voiceActivity.set(memberId, now);
          continue;
        }

        const lastActive = voiceActivity.get(memberId);
        const isInactive = state.selfMute || state.serverMute || state.selfDeaf || state.serverDeaf;

        if (isInactive && now - lastActive >= ONE_HOUR) {
          try {
            await member.voice.setChannel(afkChannelId, "Inactivité vocale supérieure à 1 heure");
            voiceActivity.set(memberId, now);
            console.log(`[AFK Voice] Membre ${member.user.tag} déplacé vers le salon AFK après 1 heure d'inactivité.`);
            log(guild, "Déplacement Vocal AFK", `💤 **${member.user.tag}** (${member.id}) a été déplacé vers le salon AFK après 1 heure d'inactivité vocale.`, 0xFEE75C, {
              category: "voice",
              userId: member.id
            });
          } catch (err) {
            console.warn(`[AFK Voice Note] Impossible de déplacer ${member.user.tag}:`, err.message);
          }
        }
      }
    }
  }, 60000);
}

async function reconnectAll247Voice(client, config = {}) {
  setupVoiceWatchers(client);
  const globalVoiceId = config.voiceChannelId || process.env.VOICE_CHANNEL_ID || "";

  for (const [, guild] of client.guilds.cache) {
    let targetChannelId = globalVoiceId || getSetting(`voice_channel:${guild.id}`);

    if (globalVoiceId) {
      targetChannelId = globalVoiceId;
      setSetting(`voice_channel:${guild.id}`, globalVoiceId);
    }

    if (targetChannelId) {
      console.log(`[Voice 24/7] Connexion permanente au salon dédié (${targetChannelId}) pour le serveur "${guild.name}"...`);
      await connectToVoice(guild, targetChannelId);
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

