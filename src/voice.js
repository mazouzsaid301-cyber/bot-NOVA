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
      selfMute: true
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

  // Tracking de l'activité vocale (Détection AFK > 1 heure)
  client.on("voiceStateUpdate", (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    // Si le membre quitte complètement le vocal
    if (!newState.channelId) {
      voiceActivity.delete(member.id);
      return;
    }

    // Si le membre a changé de salon ou vient de se connecter
    if (oldState.channelId !== newState.channelId) {
      voiceActivity.set(member.id, Date.now());
      return;
    }

    // Si le membre s'est démute / réactivé le micro, réinitialiser le compteur d'inactivité
    const wasMuted = oldState.selfMute || oldState.serverMute || oldState.selfDeaf || oldState.serverDeaf;
    const isMuted = newState.selfMute || newState.serverMute || newState.selfDeaf || newState.serverDeaf;
    if (wasMuted && !isMuted) {
      voiceActivity.set(member.id, Date.now());
    } else if (!voiceActivity.has(member.id)) {
      voiceActivity.set(member.id, Date.now());
    }
  });

  // Vérification périodique toutes les minutes de l'inactivité > 1h (3600000 ms)
  setInterval(async () => {
    const ONE_HOUR = 3600000;
    const now = Date.now();

    for (const [, guild] of client.guilds.cache) {
      // Trouver le salon AFK officiel du serveur ou un salon contenant "afk"
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

        // Si le membre est inactif/mute depuis plus d'une heure
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

