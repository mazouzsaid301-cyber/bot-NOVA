const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require("discord.js");
const {
  ensureUser,
  getUser,
  getLeaderboard,
  transferCoins,
  claimDaily,
  createRedeemCode,
  claimRedeemCode,
  createTicket,
  closeTicket,
  getTicketByChannel,
  getOpenTicketForUser,
  setSetting,
  getSetting,
  addModerationAction
} = require("./db");
const { log } = require("./logger");
const { enable247Voice, disable247Voice } = require("./voice");

const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche l'aide complète et la liste des commandes du bot"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Affiche la latence de l'API Discord et du bot"),

  new SlashCommandBuilder()
    .setName("dashboard")
    .setDescription("Affiche l'adresse sécurisée du dashboard web d'administration"),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ouvre un salon de ticket privé avec l'équipe du staff"),

  new SlashCommandBuilder()
    .setName("ticket-close")
    .setDescription("Ferme le ticket privé actuel")
    .addStringOption(o => o.setName("raison").setDescription("Raison de fermeture (optionnel)").setMaxLength(200)),

  new SlashCommandBuilder()
    .setName("setup-logs")
    .setDescription("Configure le salon d'audit et de logs du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o => o.setName("salon").setDescription("Salon textuel où envoyer les logs").addChannelTypes(ChannelType.GuildText).setRequired(true)),

  new SlashCommandBuilder()
    .setName("redeem-create")
    .setDescription("Crée un code de récompense à usage unique pour l'économie")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName("code").setDescription("Code unique (ex: PROMO50)").setMinLength(3).setMaxLength(40).setRequired(true))
    .addIntegerOption(o => o.setName("montant").setDescription("Nombre de coins à attribuer").setMinValue(1).setMaxValue(1000000).setRequired(true)),

  new SlashCommandBuilder()
    .setName("redeem")
    .setDescription("Utilise un code de récompense pour recevoir des coins")
    .addStringOption(o => o.setName("code").setDescription("Votre code de récompense").setMinLength(3).setMaxLength(40).setRequired(true)),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Consulte votre solde de coins ou celui d'un autre membre")
    .addUserOption(o => o.setName("membre").setDescription("Membre à consulter (laisser vide pour votre solde)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Récupère votre récompense quotidienne de 100 coins"),

  new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Transfère des coins de votre solde à un autre membre")
    .addUserOption(o => o.setName("membre").setDescription("Membre destinataire").setRequired(true))
    .addIntegerOption(o => o.setName("montant").setDescription("Montant à transférer").setMinValue(1).setMaxValue(1000000).setRequired(true)),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Affiche le classement des membres les plus riches du serveur"),

  new SlashCommandBuilder()
    .setName("mod-ban")
    .setDescription("Bannit un membre du serveur après vérification des permissions")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à bannir").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison du bannissement").setMaxLength(500).setRequired(false)),

  new SlashCommandBuilder()
    .setName("mod-kick")
    .setDescription("Expulse un membre du serveur après vérification des permissions")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à expulser").setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison de l'expulsion").setMaxLength(500).setRequired(false)),

  new SlashCommandBuilder()
    .setName("mod-timeout")
    .setDescription("Met temporairement un membre en exclusion (timeout)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("membre").setDescription("Membre à sanctionner").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Durée en minutes (1 à 40320, max 28 jours)").setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(o => o.setName("raison").setDescription("Raison du timeout").setMaxLength(500).setRequired(false)),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Supprime jusqu'à 100 messages récents dans ce salon")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName("nombre").setDescription("Nombre de messages à supprimer (1 à 100)").setMinValue(1).setMaxValue(100).setRequired(true)),

  new SlashCommandBuilder()
    .setName("clean")
    .setDescription("Vide entièrement ce salon textuel de tous ses messages (recréation propre)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addBooleanOption(o =>
      o.setName("forcer")
        .setDescription("Vider immédiatement le salon sans demander de confirmation")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("setup-server")
    .setDescription("Crée et organise automatiquement l'architecture complète, salons, catégories et rôles du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("voice-24-7")
    .setDescription("Connecte le bot en permanence (24h/24 7j/7) dans un salon vocal")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName("salon").setDescription("Salon vocal cible (optionnel, prend votre salon actuel si vide)").addChannelTypes(ChannelType.GuildVoice).setRequired(false)),

  new SlashCommandBuilder()
    .setName("voice-leave")
    .setDescription("Fait quitter le bot du salon vocal et désactive le mode 24/7")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
].map(c => c.toJSON());

function checkRoleHierarchy(interaction, targetMember) {
  const guild = interaction.guild;
  const botMember = guild.members.me;

  if (targetMember.id === interaction.user.id) {
    return { canAct: false, reason: "Vous ne pouvez pas exécuter cette action de modération sur vous-même." };
  }
  if (targetMember.id === interaction.client.user.id) {
    return { canAct: false, reason: "Le bot ne peut pas s'auto-sanctionner." };
  }
  if (targetMember.id === guild.ownerId) {
    return { canAct: false, reason: "Impossible d'appliquer une sanction au propriétaire du serveur." };
  }

  // Check executor vs target hierarchy (unless executor is owner)
  if (interaction.user.id !== guild.ownerId) {
    const executorHighest = interaction.member?.roles?.highest?.position ?? 0;
    const targetHighest = targetMember.roles?.highest?.position ?? 0;
    if (targetHighest >= executorHighest) {
      return {
        canAct: false,
        reason: "Votre rôle le plus élevé n'est pas supérieur à celui de ce membre dans la hiérarchie."
      };
    }
  }

  // Check bot vs target hierarchy
  const botHighest = botMember?.roles?.highest?.position ?? 0;
  const targetHighest = targetMember.roles?.highest?.position ?? 0;
  if (targetHighest >= botHighest) {
    return {
      canAct: false,
      reason: "Le rôle du bot n'est pas suffisamment élevé pour sanctionner ce membre. Placez le rôle du bot plus haut dans la liste des rôles."
    };
  }

  return { canAct: true };
}

async function handleCommand(interaction, client, config) {
  const name = interaction.commandName;
  const guild = interaction.guild;
  const reason = interaction.options.getString("raison") || "Aucune raison précisée";

  // --- /help ---
  if (name === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🛡️ Centre d'aide — Bot Tout-en-Un")
      .setDescription("Voici la liste complète des commandes disponibles sur ce serveur :")
      .addFields(
        {
          name: "🎫 Tickets",
          value: "• `/ticket` : Ouvre un salon de support privé avec l'équipe\n• `/ticket-close [raison]` : Ferme et archive le ticket actuel"
        },
        {
          name: "💰 Économie",
          value: "• `/balance [membre]` : Affiche le solde de coins\n• `/daily` : Récupère la récompense quotidienne (100 coins)\n• `/pay <membre> <montant>` : Transfère des coins à un autre membre\n• `/leaderboard` : Affiche le top 10 des membres les plus riches"
        },
        {
          name: "🎁 Codes Redeem",
          value: "• `/redeem <code>` : Utilise un code pour recevoir des coins\n• `/redeem-create <code> <montant>` : *(Admin)* Crée un code à usage unique"
        },
        {
          name: "⚖️ Modération",
          value: "• `/mod-ban <membre> [raison]` : Bannit un membre du serveur\n• `/mod-kick <membre> [raison]` : Expulse un membre du serveur\n• `/mod-timeout <membre> <minutes> [raison]` : Exclut temporairement un membre\n• `/purge <nombre>` : Supprime jusqu'à 100 messages récents\n• `/clean [forcer]` : Vide entièrement ce salon textuel (recréation propre)"
        },
        {
          name: "⚙️ Système & Administration",
          value: "• `/setup-logs <salon>` : *(Admin)* Configure le salon des logs\n• `/dashboard` : Affiche l'URL du tableau de bord web\n• `/ping` : Affiche la latence du bot et de l'API"
        }
      )
      .setFooter({ text: "Bot Tout-en-Un • Système sécurisé" })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // --- /ping ---
  if (name === "ping") {
    const sent = await interaction.reply({ content: "Calcul de la latence en cours...", fetchReply: true, ephemeral: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = Math.round(client.ws.ping);
    return interaction.editReply({
      content: `🏓 **Pong !**\n• Latence API Discord : **${wsPing >= 0 ? wsPing : 0} ms**\n• Latence aller-retour : **${roundtrip} ms**`
    });
  }

  // --- /dashboard ---
  if (name === "dashboard") {
    const dashboardUrl = config.dashboardPublicUrl || `http://localhost:${config.port}`;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🌐 Tableau de bord d'administration")
      .setDescription(`Le dashboard web sécurisé est disponible à l'adresse suivante :\n\n👉 **${dashboardUrl}**\n\nConnectez-vous avec vos identifiants administrateur pour gérer les tickets, les codes redeem, l'économie et consulter les logs.`)
      .setFooter({ text: "Connexion sécurisée par mot de passe & session" });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // --- /setup-logs ---
  if (name === "setup-logs") {
    if (!guild) return interaction.reply({ content: "Cette commande doit être exécutée dans un serveur.", ephemeral: true });
    const channel = interaction.options.getChannel("salon");
    setSetting(`logs:${guild.id}`, channel.id);

    await interaction.reply({
      content: `✅ Le salon des logs a été configuré avec succès sur ${channel}.`,
      ephemeral: true
    });

    return log(guild, "Configuration des logs", `Salon configuré : ${channel} par ${interaction.user.tag} (${interaction.user.id})`, 0x57F287, {
      category: "config",
      userId: interaction.user.id
    });
  }

  // --- /ticket ---
  if (name === "ticket") {
    if (!guild) return interaction.reply({ content: "Cette commande doit être exécutée dans un serveur.", ephemeral: true });

    const existing = getOpenTicketForUser(guild.id, interaction.user.id);
    if (existing) {
      return interaction.reply({
        content: `❌ Vous avez déjà un ticket ouvert actuellement : <#${existing.channel_id}>. Veuillez le fermer avant d'en ouvrir un nouveau.`,
        ephemeral: true
      });
    }

    const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 15) || "membre";
    const staffRole = guild.roles.cache.find(r => r.permissions.has(PermissionFlagsBits.ManageMessages) && !r.managed);

    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ];

    if (staffRole) {
      overwrites.push({
        id: staffRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }

    const categoryId = getSetting(`ticket_category:${guild.id}`) || config.ticketCategoryId;
    const parentCategory = categoryId && guild.channels.cache.has(categoryId) ? categoryId : undefined;

    let channel;
    try {
      channel = await guild.channels.create({
        name: `ticket-${safeName}`,
        type: ChannelType.GuildText,
        parent: parentCategory,
        permissionOverwrites: overwrites,
        topic: `Ticket ouvert par ${interaction.user.tag} (${interaction.user.id})`
      });
    } catch (err) {
      console.error("Erreur création salon ticket:", err);
      return interaction.reply({
        content: "❌ Impossible de créer le salon de ticket. Vérifiez que le bot a bien la permission `Gérer les salons`.",
        ephemeral: true
      });
    }

    createTicket(channel.id, guild.id, interaction.user.id);

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("🎫 Ticket ouvert — Assistance")
      .setDescription(`Bonjour ${interaction.user},\n\nMerci d'avoir ouvert un ticket. Veuillez décrire précisément votre demande ou votre problème ci-dessous.\nUn membre de l'équipe d'administration vous répondra dès que possible.\n\nPour fermer ce ticket, tapez \`/ticket-close\`.`)
      .setFooter({ text: "Système de ticket sécurisé" })
      .setTimestamp();

    await channel.send({
      content: `${interaction.user}${staffRole ? ` | ${staffRole}` : ""}`,
      embeds: [welcomeEmbed]
    }).catch(() => {});

    await interaction.reply({ content: `✅ Votre ticket a été créé avec succès : ${channel}`, ephemeral: true });

    return log(guild, "Ticket ouvert", `Nouveau ticket ${channel} créé par ${interaction.user.tag} (${interaction.user.id})`, 0x57F287, {
      category: "ticket",
      userId: interaction.user.id
    });
  }

  // --- /ticket-close ---
  if (name === "ticket-close") {
    if (!guild) return interaction.reply({ content: "Cette commande doit être exécutée dans un serveur.", ephemeral: true });

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket || ticket.status !== "open") {
      return interaction.reply({ content: "❌ Ce salon n'est pas un ticket ouvert enregistré dans le système.", ephemeral: true });
    }

    const isOwner = ticket.user_id === interaction.user.id;
    const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
                      interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);

    if (!isOwner && !canManage) {
      return interaction.reply({
        content: "❌ Seul le créateur du ticket ou un membre du staff peut fermer ce ticket.",
        ephemeral: true
      });
    }

    closeTicket(interaction.channelId, interaction.user.id, reason);

    const closeEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("🔒 Ticket fermé")
      .setDescription(`Ce ticket a été fermé par ${interaction.user}.\n**Raison :** ${reason}\n\n*Ce salon sera automatiquement supprimé dans 5 secondes.*`)
      .setTimestamp();

    await interaction.reply({ embeds: [closeEmbed] });

    await log(guild, "Ticket fermé", `Ticket #${interaction.channel.name} fermé par ${interaction.user.tag}. Raison : ${reason}`, 0xED4245, {
      category: "ticket",
      userId: interaction.user.id
    });

    setTimeout(async () => {
      try {
        await interaction.channel.delete(`Ticket fermé par ${interaction.user.tag}`);
      } catch (err) {
        console.error("Erreur suppression salon ticket:", err.message);
      }
    }, 5000);
    return;
  }

  // --- /redeem-create ---
  if (name === "redeem-create") {
    const code = interaction.options.getString("code");
    const amount = interaction.options.getInteger("montant");

    try {
      const created = createRedeemCode(code, amount, interaction.user.id);
      await interaction.reply({
        content: `✅ Code de récompense créé avec succès !\n• Code : \`${created.code}\`\n• Valeur : **${created.amount} coins**\n• Utilisation : **Usage unique**`,
        ephemeral: true
      });

      return log(guild, "Code Redeem créé", `Code \`${created.code}\` (+${created.amount} coins) créé par ${interaction.user.tag}`, 0xFEE75C, {
        category: "redeem",
        userId: interaction.user.id
      });
    } catch (err) {
      return interaction.reply({
        content: `❌ Erreur : Ce code existe déjà ou est invalide (${err.message}). Veuillez en choisir un autre.`,
        ephemeral: true
      });
    }
  }

  // --- /redeem ---
  if (name === "redeem") {
    const code = interaction.options.getString("code");
    const result = claimRedeemCode(code, interaction.user.id);

    if (!result.success) {
      return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
    }

    const updatedUser = getUser(interaction.user.id);
    await interaction.reply({
      content: `🎉 Félicitations ! Le code a été validé avec succès.\n• Gains : **+${result.amount} coins**\n• Votre nouveau solde : **${updatedUser.balance} coins**`,
      ephemeral: true
    });

    return log(guild, "Code Redeem utilisé", `${interaction.user.tag} (${interaction.user.id}) a utilisé le code \`${code.trim().toUpperCase()}\` (+${result.amount} coins)`, 0x57F287, {
      category: "redeem",
      userId: interaction.user.id
    });
  }

  // --- /balance ---
  if (name === "balance") {
    const targetUser = interaction.options.getUser("membre") || interaction.user;
    ensureUser(targetUser.id);
    const userRow = getUser(targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`💳 Solde — ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "Solde actuel", value: `🪙 **${userRow.balance.toLocaleString("fr-FR")} coins**`, inline: true },
        { name: "Membre", value: `<@${targetUser.id}>`, inline: true }
      )
      .setFooter({ text: "Bot Tout-en-Un • Système Économie" })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // --- /daily ---
  if (name === "daily") {
    const result = claimDaily(interaction.user.id, 100);

    if (!result.success) {
      const hours = Math.floor(result.remainingMs / 3600000);
      const minutes = Math.ceil((result.remainingMs % 3600000) / 60000);
      return interaction.reply({
        content: `⏳ Vous avez déjà récupéré votre récompense quotidienne aujourd'hui.\nRevenez dans **${hours}h et ${minutes}min**.`,
        ephemeral: true
      });
    }

    return interaction.reply({
      content: `🎁 Récompense quotidienne récupérée !\nVous avez reçu **+${result.amount} coins**.\nVotre nouveau solde est de **${result.newBalance.toLocaleString("fr-FR")} coins**.`,
      ephemeral: true
    });
  }

  // --- /pay ---
  if (name === "pay") {
    const target = interaction.options.getUser("membre");
    const amount = interaction.options.getInteger("montant");

    if (target.bot) {
      return interaction.reply({ content: "❌ Vous ne pouvez pas transférer de coins à un bot.", ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: "❌ Vous ne pouvez pas vous envoyer des coins à vous-même.", ephemeral: true });
    }

    const result = transferCoins(interaction.user.id, target.id, amount);
    if (!result.success) {
      return interaction.reply({ content: `❌ Échec du transfert : ${result.error}`, ephemeral: true });
    }

    const senderRow = getUser(interaction.user.id);
    await interaction.reply({
      content: `💸 Vous avez envoyé avec succès **${amount.toLocaleString("fr-FR")} coins** à ${target}.\nVotre solde restant : **${senderRow.balance.toLocaleString("fr-FR")} coins**.`,
      ephemeral: true
    });

    return log(guild, "Transfert d'économie", `${interaction.user.tag} a transféré ${amount} coins à ${target.tag}`, 0x5865F2, {
      category: "economy",
      userId: interaction.user.id
    });
  }

  // --- /leaderboard ---
  if (name === "leaderboard") {
    const top = getLeaderboard(10);
    const medals = ["🥇", "🥈", "🥉"];

    let description = "";
    if (!top || top.length === 0) {
      description = "Aucun membre n'a encore de coins enregistrés.";
    } else {
      description = top.map((entry, index) => {
        const medal = medals[index] || `**#${index + 1}**`;
        return `${medal} <@${entry.user_id}> — **${entry.balance.toLocaleString("fr-FR")} coins**`;
      }).join("\n\n");
    }

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle("🏆 Classement Économie — Top 10")
      .setDescription(description)
      .setFooter({ text: "Bot Tout-en-Un • Classement mondial du serveur" })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // --- /mod-ban ---
  if (name === "mod-ban") {
    if (!guild) return interaction.reply({ content: "Cette commande doit être exécutée dans un serveur.", ephemeral: true });
    const targetUser = interaction.options.getUser("membre");
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (targetMember) {
      const check = checkRoleHierarchy(interaction, targetMember);
      if (!check.canAct) return interaction.reply({ content: `❌ ${check.reason}`, ephemeral: true });
      if (!targetMember.bannable) {
        return interaction.reply({ content: "❌ Ce membre ne peut pas être banni par le bot (permissions insuffisantes du rôle bot).", ephemeral: true });
      }
    }

    try {
      await guild.members.ban(targetUser.id, { reason: `${reason} — Par ${interaction.user.tag}` });
      addModerationAction({
        guildId: guild.id,
        actionType: "ban",
        targetId: targetUser.id,
        targetTag: targetUser.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
        details: "Bannissement exécuté via /mod-ban"
      });

      await interaction.reply({
        content: `🔨 **${targetUser.tag}** a été banni du serveur avec succès.\n**Raison :** ${reason}`,
        ephemeral: true
      });

      return log(guild, "Membre Banni", `🔨 **${targetUser.tag}** (${targetUser.id}) a été banni par ${interaction.user.tag}.\nRaison : ${reason}`, 0xED4245, {
        category: "moderation",
        userId: interaction.user.id
      });
    } catch (err) {
      console.error("Erreur mod-ban:", err);
      return interaction.reply({ content: `❌ Impossible de bannir ce membre : ${err.message}`, ephemeral: true });
    }
  }

  // --- /mod-kick ---
  if (name === "mod-kick") {
    if (!guild) return interaction.reply({ content: "Cette commande doit être exécutée dans un serveur.", ephemeral: true });
    const targetUser = interaction.options.getUser("membre");
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({ content: "❌ Ce membre n'est pas présent sur le serveur.", ephemeral: true });
    }

    const check = checkRoleHierarchy(interaction, targetMember);
    if (!check.canAct) return interaction.reply({ content: `❌ ${check.reason}`, ephemeral: true });
    if (!targetMember.kickable) {
      return interaction.reply({ content: "❌ Ce membre ne peut pas être expulsé par le bot (permissions insuffisantes du rôle bot).", ephemeral: true });
    }

    try {
      await targetMember.kick(`${reason} — Par ${interaction.user.tag}`);
      addModerationAction({
        guildId: guild.id,
        actionType: "kick",
        targetId: targetUser.id,
        targetTag: targetUser.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
        details: "Expulsion exécutée via /mod-kick"
      });

      await interaction.reply({
        content: `👢 **${targetUser.tag}** a été expulsé du serveur avec succès.\n**Raison :** ${reason}`,
        ephemeral: true
      });

      return log(guild, "Membre Expulsé", `👢 **${targetUser.tag}** (${targetUser.id}) a été expulsé par ${interaction.user.tag}.\nRaison : ${reason}`, 0xED4245, {
        category: "moderation",
        userId: interaction.user.id
      });
    } catch (err) {
      console.error("Erreur mod-kick:", err);
      return interaction.reply({ content: `❌ Impossible d'expulser ce membre : ${err.message}`, ephemeral: true });
    }
  }

  // --- /mod-timeout ---
  if (name === "mod-timeout") {
    if (!guild) return interaction.reply({ content: "Cette commande doit être exécutée dans un serveur.", ephemeral: true });
    const targetUser = interaction.options.getUser("membre");
    const minutes = interaction.options.getInteger("minutes");
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({ content: "❌ Ce membre n'est pas présent sur le serveur.", ephemeral: true });
    }

    const check = checkRoleHierarchy(interaction, targetMember);
    if (!check.canAct) return interaction.reply({ content: `❌ ${check.reason}`, ephemeral: true });
    if (!targetMember.moderatable) {
      return interaction.reply({ content: "❌ Ce membre ne peut pas être mis en timeout par le bot (permissions insuffisantes).", ephemeral: true });
    }

    const durationMs = minutes * 60 * 1000;
    try {
      await targetMember.timeout(durationMs, `${reason} — Par ${interaction.user.tag}`);
      addModerationAction({
        guildId: guild.id,
        actionType: "timeout",
        targetId: targetUser.id,
        targetTag: targetUser.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
        details: `Exclusion temporaire de ${minutes} minutes`
      });

      await interaction.reply({
        content: `⏳ **${targetUser.tag}** a été mis en exclusion pendant **${minutes} minute(s)**.\n**Raison :** ${reason}`,
        ephemeral: true
      });

      return log(guild, "Membre en Timeout", `⏳ **${targetUser.tag}** mis en timeout (${minutes} min) par ${interaction.user.tag}.\nRaison : ${reason}`, 0xFEE75C, {
        category: "moderation",
        userId: interaction.user.id
      });
    } catch (err) {
      console.error("Erreur mod-timeout:", err);
      return interaction.reply({ content: `❌ Impossible de mettre en timeout : ${err.message}`, ephemeral: true });
    }
  }

  // --- /purge ---
  if (name === "purge") {
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      return interaction.reply({ content: "❌ Cette commande ne peut être exécutée que dans un salon textuel.", ephemeral: true });
    }

    const amount = interaction.options.getInteger("nombre");
    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);
      addModerationAction({
        guildId: guild ? guild.id : "dm",
        actionType: "purge",
        targetId: interaction.channelId,
        targetTag: `#${interaction.channel.name}`,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason: `Purge de ${deleted.size} messages`,
        details: `Demandé: ${amount}, Supprimés: ${deleted.size}`
      });

      await interaction.reply({
        content: `🧹 **${deleted.size} message(s)** supprimé(s) avec succès. *(Les messages de plus de 14 jours ne peuvent pas être supprimés par Discord)*`,
        ephemeral: true
      });

      if (guild) {
        await log(guild, "Purge de messages", `🧹 ${deleted.size} messages purgés dans #${interaction.channel.name} par ${interaction.user.tag}`, 0x5865F2, {
          category: "moderation",
          userId: interaction.user.id
        });
      }
    } catch (err) {
      console.error("Erreur purge:", err);
      return interaction.reply({ content: `❌ Erreur lors de la suppression des messages : ${err.message}`, ephemeral: true });
    }
  }

  // --- /clean ---
  if (name === "clean") {
    if (!guild) {
      return interaction.reply({ content: "❌ Cette commande doit être exécutée dans un serveur.", ephemeral: true });
    }

    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: "❌ Cette commande ne peut être exécutée que dans un salon textuel classique.",
        ephemeral: true
      });
    }

    if (channel.isThread()) {
      return interaction.reply({
        content: "❌ Cette commande ne peut pas être exécutée dans un fil de discussion (thread).",
        ephemeral: true
      });
    }

    // Check member permissions (ManageChannels or Administrator)
    const member = interaction.member;
    const canManageChannels = member?.permissions?.has(PermissionFlagsBits.ManageChannels) ||
                              member?.permissions?.has(PermissionFlagsBits.Administrator);
    if (!canManageChannels) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission requise (`Gérer les salons`) pour vider ce salon.",
        ephemeral: true
      });
    }

    // Check bot permissions
    const botMember = guild.members.me;
    if (!botMember?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: "❌ Le bot n'a pas la permission requise `Gérer les salons` pour recréer et vider ce salon.",
        ephemeral: true
      });
    }

    // Protect active tickets
    const ticket = getTicketByChannel(channel.id);
    if (ticket && ticket.status === "open") {
      return interaction.reply({
        content: "❌ Ce salon est un ticket de support actif. Utilisez `/ticket-close` pour le fermer.",
        ephemeral: true
      });
    }

    // Protect rules channel
    if (guild.rulesChannelId === channel.id) {
      return interaction.reply({
        content: "❌ Ce salon est configuré comme salon de règlement officiel du serveur et ne peut pas être réinitialisé.",
        ephemeral: true
      });
    }

    const executeClean = async () => {
      const position = channel.rawPosition;
      const oldName = channel.name;
      const oldId = channel.id;

      // Clone channel with identical attributes (permissions, topic, parent category, nsfw, slowmode)
      const newChannel = await channel.clone({
        reason: `Salon vidé (/clean) par ${interaction.user.tag}`
      });

      // Maintain exact channel order/position
      await newChannel.setPosition(position).catch(() => {});

      // Update system channel if needed
      if (guild.systemChannelId === oldId) {
        await guild.setSystemChannel(newChannel).catch(() => {});
      }

      // Update log channel setting in DB if needed
      const currentLogChannelId = getSetting(`logs:${guild.id}`);
      if (currentLogChannelId === oldId) {
        setSetting(`logs:${guild.id}`, newChannel.id);
      }

      // Delete old channel
      await channel.delete(`Salon vidé (/clean) par ${interaction.user.tag}`);

      // Send confirmation embed in the newly cleaned channel
      const cleanEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("🧹 Salon Nettoyé")
        .setDescription(`Ce salon a été entièrement vidé et réinitialisé avec succès.\nAction exécutée par <@${interaction.user.id}>.`)
        .setFooter({ text: "Bot Tout-en-Un • Nettoyage" })
        .setTimestamp();

      await newChannel.send({ embeds: [cleanEmbed] }).catch(() => {});

      // Record in moderation actions
      addModerationAction({
        guildId: guild.id,
        actionType: "clean",
        targetId: newChannel.id,
        targetTag: `#${newChannel.name}`,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason: "Nettoyage complet du salon (/clean)",
        details: `Salon recréé (ancien ID: ${oldId}, nouveau ID: ${newChannel.id})`
      });

      // Log in audit logs
      await log(guild, "Salon Nettoyé (/clean)", `🧹 Le salon **#${oldName}** a été entièrement vidé et recréé par **${interaction.user.tag}** (${interaction.user.id}).`, 0x5865F2, {
        category: "moderation",
        userId: interaction.user.id
      });
    };

    const forcer = interaction.options.getBoolean("forcer") || false;

    if (forcer) {
      await interaction.reply({
        content: "⏳ Nettoyage et réinitialisation du salon en cours...",
        ephemeral: true
      });
      try {
        await executeClean();
      } catch (err) {
        console.error("Erreur /clean:", err);
        return interaction.followUp({
          content: `❌ Erreur lors du nettoyage du salon : ${err.message}`,
          ephemeral: true
        }).catch(() => {});
      }
      return;
    }

    // Confirmation buttons
    const confirmButton = new ButtonBuilder()
      .setCustomId(`clean_confirm_${interaction.id}`)
      .setLabel("Confirmer le nettoyage")
      .setEmoji("🧹")
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`clean_cancel_${interaction.id}`)
      .setLabel("Annuler")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const warningEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("⚠️ Confirmation requise : Nettoyage du salon")
      .setDescription(
        `Êtes-vous sûr de vouloir **vider entièrement** le salon <#${channel.id}> ?\n\n` +
        `• **Tous les messages seront définitivement effacés** (même ceux datant de plus de 14 jours)\n` +
        `• Le salon sera recréé avec les mêmes permissions, nom, catégorie et position\n` +
        `• Cette action est **irréversible**`
      )
      .setFooter({ text: "Vous avez 30 secondes pour valider" });

    const response = await interaction.reply({
      embeds: [warningEmbed],
      components: [row],
      ephemeral: true,
      fetchReply: true
    });

    try {
      const confirmation = await response.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 30000
      });

      if (confirmation.customId === `clean_confirm_${interaction.id}`) {
        await confirmation.update({
          content: "⏳ Nettoyage et réinitialisation du salon en cours...",
          embeds: [],
          components: []
        });
        await executeClean();
      } else {
        await confirmation.update({
          content: "❌ Nettoyage annulé. Aucune modification n'a été apportée au salon.",
          embeds: [],
          components: []
        });
      }
    } catch (err) {
      if (err.message && err.message.includes("time")) {
        await interaction.editReply({
          content: "⏱️ Temps écoulé (30s). Nettoyage annulé par sécurité.",
          embeds: [],
          components: []
        }).catch(() => {});
      } else if (!channel.deleted) {
        console.error("Erreur confirmation clean:", err);
      }
    }
    return;
  }

  // --- /setup-server ---
  if (name === "setup-server") {
    if (!guild) return interaction.reply({ content: "Cette commande doit être exécutée dans un serveur.", ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    try {
      // 1. Role Staff
      let staffRole = guild.roles.cache.find(r => r.name === "🛡️ Staff" || r.name.toLowerCase().includes("staff"));
      if (!staffRole) {
        staffRole = await guild.roles.create({
          name: "🛡️ Staff",
          color: 0x5865F2,
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.ModerateMembers
          ],
          reason: "Configuration automatique de l'architecture serveur"
        });
      }

      // 2. Category: INFORMATIONS
      const infoCat = await guild.channels.create({
        name: "📢 ┃ INFORMATIONS",
        type: ChannelType.GuildCategory
      });

      await guild.channels.create({
        name: "📌・règlement",
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
        ]
      });

      await guild.channels.create({
        name: "📢・annonces",
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
        ]
      });

      await guild.channels.create({
        name: "🎁・giveaways-redeem",
        type: ChannelType.GuildText,
        parent: infoCat.id
      });

      // 3. Category: COMMUNAUTÉ
      const commCat = await guild.channels.create({
        name: "💬 ┃ COMMUNAUTÉ",
        type: ChannelType.GuildCategory
      });

      await guild.channels.create({
        name: "💬・général",
        type: ChannelType.GuildText,
        parent: commCat.id
      });

      await guild.channels.create({
        name: "🤖・commandes-bot",
        type: ChannelType.GuildText,
        parent: commCat.id
      });

      await guild.channels.create({
        name: "💰・casino-économie",
        type: ChannelType.GuildText,
        parent: commCat.id
      });

      // 4. Category: SUPPORT & TICKETS
      const ticketCat = await guild.channels.create({
        name: "🎫 ┃ SUPPORT & TICKETS",
        type: ChannelType.GuildCategory
      });

      const ticketNoticeChan = await guild.channels.create({
        name: "🎫・ouvrir-un-ticket",
        type: ChannelType.GuildText,
        parent: ticketCat.id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
        ]
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🎫 Centre de Support & Tickets")
        .setDescription("Besoin d'aide ou d'une question pour l'équipe ?\n\nTapez la commande **/ticket** pour ouvrir instantanément un salon privé avec le staff !")
        .setFooter({ text: "Système de tickets sécurisé • mazoodev.com" });

      await ticketNoticeChan.send({ embeds: [ticketEmbed] }).catch(() => {});

      // 5. Category: ADMINISTRATION (Private)
      const adminCat = await guild.channels.create({
        name: "🛡️ ┃ ADMINISTRATION",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
        ]
      });

      const logChan = await guild.channels.create({
        name: "🚨・logs-audit",
        type: ChannelType.GuildText,
        parent: adminCat.id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
          { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
        ]
      });

      await guild.channels.create({
        name: "💼・salon-staff",
        type: ChannelType.GuildText,
        parent: adminCat.id
      });

      // Automatically configure database settings for this server
      setSetting(`logs:${guild.id}`, logChan.id);
      setSetting(`ticket_category:${guild.id}`, ticketCat.id);

      const successEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("✨ Serveur Discord Stylisé et Configuré !")
        .setDescription([
          "L'architecture complète de votre serveur a été générée avec succès :",
          "• **Catégories créées :** Informations, Communauté, Support & Tickets, Administration",
          "• **Salons créés :** Règlement, Annonces, Général, Commandes, Économie, Tickets, Logs Staff",
          `• **Salon des logs configuré :** <#${logChan.id}>`,
          `• **Catégorie des tickets configurée :** ${ticketCat.name}`,
          `• **Rôle Staff configuré :** <@&${staffRole.id}>`
        ].join("\n"))
        .setFooter({ text: "Génération automatique par Mazoodev Bot" })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      return log(guild, "Architecture Serveur", `L'architecture complète du serveur a été configurée par ${interaction.user.tag}`, 0x57F287, {
        category: "config",
        userId: interaction.user.id
      });
    } catch (err) {
      console.error("Erreur setup-server:", err);
      return interaction.editReply({ content: `❌ Erreur lors de la configuration automatique : ${err.message}. Assurez-vous que le rôle du bot possède les permissions Administrateur ou Gérer les salons / rôles.` });
    }
  }

  // --- /voice-24-7 ---
  if (name === "voice-24-7") {
    if (!guild) return interaction.reply({ content: "Cette commande doit être exécutée dans un serveur.", ephemeral: true });

    let targetVoice = interaction.options.getChannel("salon");
    if (!targetVoice) {
      targetVoice = interaction.member.voice?.channel;
    }

    if (!targetVoice || !targetVoice.isVoiceBased()) {
      return interaction.reply({
        content: "❌ Vous devez soit vous connecter à un salon vocal, soit mentionner un salon vocal cible dans la commande (`/voice-24-7 salon: #nom`).",
        ephemeral: true
      });
    }

    const botMember = guild.members.me;
    if (!targetVoice.permissionsFor(botMember)?.has([PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel])) {
      return interaction.reply({
        content: `❌ Le bot n'a pas la permission de se connecter au salon vocal ${targetVoice}. Vérifiez les permissions de ce salon.`,
        ephemeral: true
      });
    }

    const connection = await enable247Voice(guild, targetVoice.id);
    if (!connection) {
      return interaction.reply({
        content: `❌ Impossible de rejoindre le salon vocal ${targetVoice}.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("🔊 Mode Vocal 24/7 Activé")
      .setDescription([
        `Le bot est désormais connecté en permanence dans : ${targetVoice}`,
        "",
        "• **Persistance :** Le bot restera dans ce salon 24h/24 7j/7.",
        "• **Auto-reconnexion :** En cas de redémarrage ou déconnexion, il rejoindra automatiquement ce salon.",
        "• **Pour le retirer :** Utilisez la commande `/voice-leave`."
      ].join("\n"))
      .setFooter({ text: "Système Vocal Persistant 24/7 • mazoodev.com" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    return log(guild, "Mode Vocal 24/7", `Le bot a été configuré en vocal 24/7 dans ${targetVoice} par ${interaction.user.tag}`, 0x57F287, {
      category: "config",
      userId: interaction.user.id
    });
  }

  // --- /voice-leave ---
  if (name === "voice-leave") {
    if (!guild) return interaction.reply({ content: "Cette commande doit être exécutée dans un serveur.", ephemeral: true });

    disable247Voice(guild);

    await interaction.reply({
      content: "🔇 Le bot a quitté le salon vocal et le mode 24/7 a été désactivé pour ce serveur.",
      ephemeral: true
    });

    return log(guild, "Vocal déconnecté", `Le mode vocal 24/7 a été désactivé par ${interaction.user.tag}`, 0xFEE75C, {
      category: "config",
      userId: interaction.user.id
    });
  }
}

module.exports = { commands, handleCommand, checkRoleHierarchy };
