const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const config = require("./config");
const { setSetting } = require("./db");
const { enable247Voice } = require("./voice");

async function applyBlueprint() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
  });

  try {
    console.log("[NOVA Setup] Connexion au bot Discord...");
    await client.login(config.token);
    console.log(`[NOVA Setup] Connecté en tant que ${client.user.tag}`);

    const guild = await client.guilds.fetch(config.guildId).catch(() => null);
    if (!guild) {
      console.error(`[NOVA Setup] Erreur : Serveur (${config.guildId}) introuvable !`);
      process.exit(1);
    }
    console.log(`[NOVA Setup] Serveur trouvé : "${guild.name}" (${guild.id})`);

    // 1. Staff Role
    let staffRole = guild.roles.cache.find(r =>
      r.name.toLowerCase() === "staff" ||
      r.name.toLowerCase().includes("staff") ||
      r.name.toLowerCase().includes("moderator")
    );

    if (!staffRole) {
      console.log("[NOVA Setup] Création du rôle 🛡️ Staff...");
      staffRole = await guild.roles.create({
        name: "🛡️ Staff",
        color: 0x8B5CF6,
        permissions: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.ModerateMembers
        ],
        reason: "Création automatique du rôle Staff pour NOVA PVP"
      });
    }
    console.log(`[NOVA Setup] Rôle Staff configuré : "${staffRole.name}" (${staffRole.id})`);

    // 2. Blueprint structure
    const BLUEPRINT = [
      {
        name: "✦・START HERE",
        channels: [
          { name: "👋・welcome", type: ChannelType.GuildText, readonly: true },
          { name: "📢・announcements", type: ChannelType.GuildText, readonly: true },
          { name: "📜・server-rules", type: ChannelType.GuildText, readonly: true },
          { name: "🎭・get-roles", type: ChannelType.GuildText, readonly: true },
          { name: "📌・server-info", type: ChannelType.GuildText, readonly: true }
        ]
      },
      {
        name: "⚡・NOVA COMMUNITY",
        channels: [
          { name: "💬・general-chat", type: ChannelType.GuildText },
          { name: "🎮・gaming-hub", type: ChannelType.GuildText },
          { name: "🤝・find-a-team", type: ChannelType.GuildText },
          { name: "📸・media-zone", type: ChannelType.GuildText },
          { name: "😂・memes", type: ChannelType.GuildText },
          { name: "💡・suggestions", type: ChannelType.GuildText }
        ]
      },
      {
        name: "⚔️・PVP ARENA",
        channels: [
          { name: "⚔️・pvp-chat", type: ChannelType.GuildText },
          { name: "🔎・team-recruitment", type: ChannelType.GuildText },
          { name: "🎯・matchmaking", type: ChannelType.GuildText },
          { name: "🏆・tournament-info", type: ChannelType.GuildText, readonly: true },
          { name: "📊・leaderboard", type: ChannelType.GuildText, readonly: true },
          { name: "🎬・kill-clips", type: ChannelType.GuildText }
        ]
      },
      {
        name: "🎫・SUPPORT CENTER",
        channels: [
          { name: "🎟️・create-ticket", type: ChannelType.GuildText, readonly: true },
          { name: "📨・ticket-transcripts", type: ChannelType.GuildText, private: true }
        ]
      },
      {
        name: "🔊・VOICE LOUNGE",
        channels: [
          { name: "🔊・NOVA LOBBY", type: ChannelType.GuildVoice },
          { name: "🎮・SQUAD 01", type: ChannelType.GuildVoice },
          { name: "🎮・SQUAD 02", type: ChannelType.GuildVoice },
          { name: "⚔️・PVP TEAM", type: ChannelType.GuildVoice },
          { name: "🔒・PRIVATE SQUAD", type: ChannelType.GuildVoice, limit: 4 }
        ]
      },
      {
        name: "⭐・LEVELS & REWARDS",
        channels: [
          { name: "📈・level-rankings", type: ChannelType.GuildText, readonly: true },
          { name: "🎁・rewards-info", type: ChannelType.GuildText, readonly: true },
          { name: "💬・level-chat", type: ChannelType.GuildText }
        ]
      },
      {
        name: "🛡️・STAFF HQ",
        private: true,
        channels: [
          { name: "🔐・staff-chat", type: ChannelType.GuildText },
          { name: "🚨・player-reports", type: ChannelType.GuildText },
          { name: "📋・mod-logs", type: ChannelType.GuildText },
          { name: "🤖・bot-logs", type: ChannelType.GuildText },
          { name: "🎫・ticket-control", type: ChannelType.GuildText },
          { name: "📝・staff-notes", type: ChannelType.GuildText }
        ]
      }
    ];

    const channelMap = new Map();
    let supportCat = null;
    let botLogsChan = null;
    let novaLobbyChan = null;

    console.log("[NOVA Setup] Déploiement des catégories et salons...");

    for (const catDef of BLUEPRINT) {
      // Find or create category
      let category = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildCategory &&
        (c.name.toLowerCase() === catDef.name.toLowerCase() || c.name.includes(catDef.name.replace(/^[^\w\s]+・/, "")))
      );

      if (!category) {
        const overwrites = [];
        if (catDef.private) {
          overwrites.push(
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
          );
        }
        category = await guild.channels.create({
          name: catDef.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites: overwrites.length ? overwrites : undefined
        });
        console.log(`[NOVA Setup] + Catégorie créée : "${category.name}"`);
      } else {
        console.log(`[NOVA Setup] = Catégorie réutilisée : "${category.name}"`);
      }

      if (catDef.name.includes("SUPPORT")) supportCat = category;

      // Channels
      for (const chanDef of catDef.channels) {
        const cleanChanName = chanDef.name.replace(/^[^\w\s]+・/, "").toLowerCase();
        let channel = guild.channels.cache.find(c =>
          c.parentId === category.id &&
          (c.name.toLowerCase() === chanDef.name.toLowerCase() || c.name.toLowerCase().includes(cleanChanName))
        );

        // Also check if channel exists outside category
        if (!channel) {
          channel = guild.channels.cache.find(c =>
            !c.isThread() &&
            c.type === chanDef.type &&
            (c.name.toLowerCase() === chanDef.name.toLowerCase() || c.name.toLowerCase().includes(cleanChanName))
          );
          if (channel) {
            await channel.setParent(category.id, { lockPermissions: false }).catch(() => {});
            await channel.setName(chanDef.name).catch(() => {});
            console.log(`[NOVA Setup] ↳ Salon déplacé & renommé : "${channel.name}"`);
          }
        }

        if (!channel) {
          const overwrites = [];
          if (chanDef.readonly) {
            overwrites.push({
              id: guild.roles.everyone.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
              deny: [PermissionFlagsBits.SendMessages]
            });
          }
          if (chanDef.private) {
            overwrites.push(
              { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
              { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
              { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            );
          }

          channel = await guild.channels.create({
            name: chanDef.name,
            type: chanDef.type,
            parent: category.id,
            userLimit: chanDef.limit || undefined,
            permissionOverwrites: overwrites.length ? overwrites : undefined
          });
          console.log(`[NOVA Setup] + Salon créé : "${channel.name}"`);
        }

        channelMap.set(chanDef.name, channel);

        if (chanDef.name.includes("bot-logs") || chanDef.name.includes("mod-logs")) botLogsChan = channel;
        if (chanDef.name.includes("NOVA LOBBY")) novaLobbyChan = channel;
      }
    }

    // 3. Save Settings in SQLite
    if (botLogsChan) {
      setSetting(`logs:${guild.id}`, botLogsChan.id);
      console.log(`[NOVA Setup] Salon de logs configuré : #${botLogsChan.name} (${botLogsChan.id})`);
    }
    if (supportCat) {
      setSetting(`ticket_category:${guild.id}`, supportCat.id);
      console.log(`[NOVA Setup] Catégorie de tickets configurée : ${supportCat.name} (${supportCat.id})`);
    }
    if (novaLobbyChan) {
      setSetting(`voice_channel:${guild.id}`, novaLobbyChan.id);
      console.log(`[NOVA Setup] Salon vocal 24/7 configuré : #${novaLobbyChan.name} (${novaLobbyChan.id})`);
      enable247Voice(guild, novaLobbyChan.id).catch(err => console.warn("[Voice Connect Note]:", err.message));
    }

    // 4. Send Themed Esports Embeds & Panels
    console.log("[NOVA Setup] Envoi des embeds et panneaux interactifs...");

    // Welcome Embed
    const welcomeChan = channelMap.get("👋・welcome");
    if (welcomeChan && welcomeChan.isTextBased()) {
      const messages = await welcomeChan.messages.fetch({ limit: 10 }).catch(() => new Map());
      if (messages.size === 0) {
        const welcomeEmbed = new EmbedBuilder()
          .setColor(0x8B5CF6) // Electric Violet
          .setTitle("⚡ BIENVENUE SUR NOVA PVP — L'ÉLITE DU GAMING")
          .setDescription(
            `Bienvenue sur **NOVA PVP**, la communauté francophone dédiée à la compétition, au PVP et aux tournois esport !\n\n` +
            `### 🚀 Pour bien commencer :\n` +
            `**1.** Lisez et respectez le règlement officiel dans <#${channelMap.get("📜・server-rules")?.id || "server-rules"}>\n` +
            `**2.** Choisissez vos plateformes de jeu et alertes dans <#${channelMap.get("🎭・get-roles")?.id || "get-roles"}>\n` +
            `**3.** Présentez-vous et discutez dans <#${channelMap.get("💬・general-chat")?.id || "general-chat"}>\n` +
            `**4.** Trouvez des coéquipiers pour vos duos/escouades dans <#${channelMap.get("🤝・find-a-team")?.id || "find-a-team"}>\n` +
            `**5.** Besoin d'aide ? Ouvrez un ticket privé dans <#${channelMap.get("🎟️・create-ticket")?.id || "create-ticket"}>\n\n` +
            `*Que le meilleur gagne !* 🏆`
          )
          .setImage("https://media.giphy.com/media/26ueYUlPAmUkTBAM8/giphy.gif")
          .setFooter({ text: "NOVA PVP System • Serveur Officiel" })
          .setTimestamp();

        await welcomeChan.send({ embeds: [welcomeEmbed] }).catch(() => {});
      }
    }

    // Rules Embed
    const rulesChan = channelMap.get("📜・server-rules");
    if (rulesChan && rulesChan.isTextBased()) {
      const messages = await rulesChan.messages.fetch({ limit: 10 }).catch(() => new Map());
      if (messages.size === 0) {
        const rulesEmbed = new EmbedBuilder()
          .setColor(0x0B0E1B) // Midnight Navy
          .setTitle("📜 RÈGLEMENT OFFICIEL — NOVA PVP")
          .setDescription(
            `Pour garantir une expérience compétitive saine et agréable à tous nos membres, merci de respecter ces règles élémentaires :\n\n` +
            `### 1. Respect & Fair-Play\n` +
            `• Les insultes, le harcèlement, la provocation toxique et les propos haineux sont strictement interdits.\n` +
            `• Restez courtois même dans la défaite lors des matchs compétitifs.\n\n` +
            `### 2. Triche & Anti-Jeu\n` +
            `• Tout cheat, hack, macro abusif, glitch non autorisé ou comportement anti-jeu entraînera un **bannissement immédiat et définitif**.\n\n` +
            `### 3. Publicité & Spam\n` +
            `• Toute publicité en message privé ou dans les salons (liens Discord, ventes, etc.) sans accord préalable du staff est prohibée.\n` +
            `• Le spam textuel, vocal ou l'utilisation d'outils de flood est sanctionné.\n\n` +
            `### 4. Salons Vocaux & Textuels\n` +
            `• Utilisez les salons vocaux conformément à leur usage (Duo, Squad, Lobby 24/7).\n` +
            `• Respectez les thématiques de chaque salon.\n\n` +
            `*L'équipe du staff se réserve le droit d'appliquer les sanctions nécessaires (avertissement, timeout, expulsion, bannissement) en cas de manquement.*`
          )
          .setFooter({ text: "NOVA PVP System • Sécurité & Équité" })
          .setTimestamp();

        await rulesChan.send({ embeds: [rulesEmbed] }).catch(() => {});
      }
    }

    // Server Info Embed
    const infoChan = channelMap.get("📌・server-info");
    if (infoChan && infoChan.isTextBased()) {
      const messages = await infoChan.messages.fetch({ limit: 10 }).catch(() => new Map());
      if (messages.size === 0) {
        const infoEmbed = new EmbedBuilder()
          .setColor(0x06B6D4) // Cyan
          .setTitle("📌 INFORMATIONS DU SERVEUR — NOVA PVP")
          .setDescription(
            `Retrouvez ici toutes les informations utiles sur l'infrastructure de notre serveur et les commandes disponibles :\n\n` +
            `### 🤖 Commandes Utiles du Bot\n` +
            `• \`/rank\` : Consultez votre niveau d'XP et votre carte de joueur\n` +
            `• \`/leaderboard\` : Affichez le classement des meilleurs joueurs (XP ou Coins)\n` +
            `• \`/rewards-info\` : Consultez les récompenses et privilèges de niveaux\n` +
            `• \`/balance\` : Consultez votre solde de coins du serveur\n` +
            `• \`/daily\` : Récupérez 100 coins gratuits toutes les 24 heures\n` +
            `• \`/pay <membre> <montant>\` : Transférez des coins à un coéquipier\n` +
            `• \`/ticket\` : Ouvrez un ticket d'assistance privé\n` +
            `• \`/ping\` : Vérifiez la latence du bot et de Discord\n` +
            `• \`/dashboard\` : Accédez au tableau de bord d'administration\n\n` +
            `### 🛡️ Équipe du Staff\n` +
            `Pour tout signalement ou question urgente, utilisez le salon **#🎟️・create-ticket**.`
          )
          .setFooter({ text: "NOVA PVP System • Guide Officiel" })
          .setTimestamp();

        await infoChan.send({ embeds: [infoEmbed] }).catch(() => {});
      }
    }

    // Ticket Panel Embed
    const ticketChan = channelMap.get("🎟️・create-ticket");
    if (ticketChan && ticketChan.isTextBased()) {
      const messages = await ticketChan.messages.fetch({ limit: 10 }).catch(() => new Map());
      if (messages.size === 0) {
        const openBtn = new ButtonBuilder()
          .setCustomId("ticket_create")
          .setLabel("Ouvrir un ticket")
          .setEmoji("🎟️")
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(openBtn);

        const ticketEmbed = new EmbedBuilder()
          .setColor(0x8B5CF6) // Electric Violet
          .setTitle("🎫 CENTRE DE SUPPORT & ASSISTANCE — NOVA PVP")
          .setDescription(
            "Besoin d'aide, d'un signalement joueur ou d'une question sur un tournoi ?\n\n" +
            "Cliquez sur le bouton ci-dessous pour ouvrir un salon privé sécurisé avec l'équipe du staff.\n\n" +
            "• **Support 7j/7 dédié à la communauté**\n" +
            "• **Confidentialité totale des échanges**\n" +
            "• **Archivage automatique et transcript sécurisé**\n\n" +
            "*(Un seul ticket ouvert à la fois par membre)*"
          )
          .setFooter({ text: "NOVA PVP System • Support Sécurisé" })
          .setTimestamp();

        await ticketChan.send({ embeds: [ticketEmbed], components: [row] }).catch(() => {});
      }
    }

    // Roles Panel Embed
    const rolesChan = channelMap.get("🎭・get-roles");
    if (rolesChan && rolesChan.isTextBased()) {
      const messages = await rolesChan.messages.fetch({ limit: 10 }).catch(() => new Map());
      if (messages.size === 0) {
        const platformRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("role_toggle_pc").setLabel("PC").setEmoji("🖥️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("role_toggle_playstation").setLabel("PlayStation").setEmoji("🎮").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("role_toggle_xbox").setLabel("Xbox").setEmoji("🟢").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("role_toggle_switch").setLabel("Switch").setEmoji("🔴").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("role_toggle_mobile").setLabel("Mobile").setEmoji("📱").setStyle(ButtonStyle.Secondary)
        );

        const notifRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("role_toggle_annonces").setLabel("Annonces").setEmoji("📢").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("role_toggle_tournois").setLabel("Tournois").setEmoji("⚔️").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("role_toggle_giveaways").setLabel("Giveaways").setEmoji("🎁").setStyle(ButtonStyle.Primary)
        );

        const rolesEmbed = new EmbedBuilder()
          .setColor(0x06B6D4) // Cyan
          .setTitle("🎭 SÉLECTION DES RÔLES & NOTIFICATIONS — NOVA PVP")
          .setDescription(
            "Personnalisez votre profil et choisissez vos alertes en cliquant sur les boutons ci-dessous.\n*Cliquez à nouveau pour retirer un rôle.*\n\n" +
            "**🎮 Plateformes de Jeu :**\n" +
            "Attribuez-vous vos plateformes pour trouver facilement vos coéquipiers dans **#🤝・find-a-team**.\n\n" +
            "**🔔 Alertes & Notifications :**\n" +
            "Recevez les mentions pour les annonces importantes, tournois esport et concours."
          )
          .setFooter({ text: "NOVA PVP System • Rôles Interactifs" })
          .setTimestamp();

        await rolesChan.send({ embeds: [rolesEmbed], components: [platformRow, notifRow] }).catch(() => {});
      }
    }

    // Rewards Info Embed
    const rewardsChan = channelMap.get("🎁・rewards-info");
    if (rewardsChan && rewardsChan.isTextBased()) {
      const messages = await rewardsChan.messages.fetch({ limit: 10 }).catch(() => new Map());
      if (messages.size === 0) {
        const rewardsEmbed = new EmbedBuilder()
          .setColor(0x06B6D4) // Cyan
          .setTitle("🏆 PALIERS DE NIVEAUX & RÉCOMPENSES — NOVA PVP")
          .setDescription(
            "Gagnez de l'XP en participant activement aux discussions dans les salons textuels (15 à 25 XP par message avec cooldown anti-spam).\n\n" +
            "### 🌟 Paliers de Prestige Esports\n" +
            "• **Niveau 5 — Challenger :** Rôle cosmétique, accès aux réactions externes et permissions médias.\n" +
            "• **Niveau 10 — PVP Member :** Accès débloqué aux salons de tournois et recherche d'équipe compétitive.\n" +
            "• **Niveau 20 — VIP :** Rôle VIP, salons vocaux réservés, bonus de coins quotidiens augmentés.\n" +
            "• **Niveau 30 — Master :** Accès prioritaire au matchmaking et aux salons privés.\n" +
            "• **Niveau 50 — PVP Champion :** Rôle suprême de champion, salon d'élite et badge exclusif sur le serveur.\n\n" +
            "### 💰 Économie & Codes Promo\n" +
            "• `/daily` : Récupérez 100 coins toutes les 24h.\n" +
            "• `/pay <membre> <montant>` : Transférez des coins à vos coéquipiers.\n" +
            "• `/redeem <code>` : Échangez les codes promos distribués lors des événements."
          )
          .setFooter({ text: "NOVA PVP System • Competitive Rewards" })
          .setTimestamp();

        await rewardsChan.send({ embeds: [rewardsEmbed] }).catch(() => {});
      }
    }

    console.log("==================================================================");
    console.log("[NOVA Setup] ✅ DÉPLOIEMENT COMPLET RÉUSSI AVEC SUCCÈS !");
    console.log("==================================================================");

    client.destroy();
    process.exit(0);
  } catch (err) {
    console.error("[NOVA Setup Error]:", err);
    process.exit(1);
  }
}

applyBlueprint();
