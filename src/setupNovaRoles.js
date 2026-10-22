const { Client, GatewayIntentBits, PermissionFlagsBits } = require("discord.js");
require("dotenv").config();

// Parse CLI flags if provided (e.g., --prefix="ⁿᵒᵛᵃ" --symbol="𝖇")
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const match = args.find(a => a.startsWith(`--${flag}=`));
  if (match) return match.split("=")[1];
  const idx = args.indexOf(`--${flag}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return defaultValue;
}

const SERVER_PREFIX = getArg("prefix", "ⁿᵒᵛᵃ"); // Tiny superscript "nova"
const DECO_SYMBOL = getArg("symbol", "𝖇");       // Gothic fraktur "b"
const VANITY_NAME = getArg("vanity", ".gg/novapvp 👑");

/**
 * Standard Member Base Permissions
 */
const BASE_MEMBER_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AddReactions
];

/**
 * Full Role Blueprint with detailed Discord permissions for every role
 */
function getRoleDefinitions(prefix, sym, vanity) {
  return [
    // --- 1. SEPARATOR / TOP DIVIDER ---
    {
      baseName: "-.",
      name: "-.",
      color: "#FFFFFF",
      hoist: false,
      permissions: [],
      category: "DIVIDER"
    },

    // --- 2. MANAGEMENT & OWNERSHIP ---
    {
      baseName: "Owner 👑",
      name: `${prefix} ${sym} Owner 👑`,
      color: "#18181B",
      hoist: true,
      permissions: [PermissionFlagsBits.Administrator],
      category: "MANAGEMENT"
    },
    {
      baseName: "Head Staff 🐱",
      name: `${prefix} ${sym} Head Staff 🐱`,
      color: "#E05353",
      hoist: true,
      permissions: [
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ViewAuditLog,
        PermissionFlagsBits.MentionEveryone,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.PrioritySpeaker
      ],
      category: "MANAGEMENT"
    },
    {
      baseName: "Staff manager 🛡",
      name: `${prefix} ${sym} Staff manager 🛡`,
      color: "#27272A",
      hoist: true,
      permissions: [
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ViewAuditLog,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.PrioritySpeaker
      ],
      category: "MANAGEMENT"
    },
    {
      baseName: "Master Admin 🪽",
      name: `${prefix} ${sym} Master Admin 🪽`,
      color: "#FFFFFF",
      hoist: true,
      permissions: [
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ViewAuditLog,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "MANAGEMENT"
    },
    {
      baseName: "Management Team ⚙",
      name: `${prefix} ${sym} Management Team ⚙`,
      color: "#C4B5FD",
      hoist: true,
      permissions: [
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ViewAuditLog,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "MANAGEMENT"
    },

    // --- 3. ACCESS / SECURITY OVERWRITES ---
    {
      baseName: "Close Acces 🔍",
      name: "Close Acces 🔍",
      color: "#1D4ED8",
      hoist: false,
      permissions: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "ACCESS"
    },
    {
      baseName: "Ticket Acces Acces",
      name: "Ticket Acces Acces",
      color: "#06B6D4",
      hoist: false,
      permissions: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.AddReactions
      ],
      category: "ACCESS"
    },
    {
      baseName: "Link perm",
      name: `${prefix} ${sym} Link perm`,
      color: "#FFFFFF",
      hoist: false,
      permissions: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.UseExternalEmojis
      ],
      category: "ACCESS"
    },
    {
      baseName: "Management ticket",
      name: `${prefix} ${sym} Management ticket`,
      color: "#FFFFFF",
      hoist: false,
      permissions: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles
      ],
      category: "ACCESS"
    },
    {
      baseName: "anticheat Management",
      name: `${prefix} ${sym} anticheat Management`,
      color: "#FFFFFF",
      hoist: false,
      permissions: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles
      ],
      category: "ACCESS"
    },

    // --- 4. STAFF TEAM & DEPARTMENTS ---
    {
      baseName: "Staff ⚒",
      name: `${prefix} ${sym} Staff ⚒`,
      color: "#22D3EE",
      hoist: true,
      permissions: [
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "STAFF"
    },
    {
      baseName: "Checker ⭐⭐🔨",
      name: `${prefix} ${sym} Checker ⭐⭐🔨`,
      color: "#06B6D4",
      hoist: false,
      permissions: [
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "STAFF"
    },
    {
      baseName: "Anticheat ⭐⭐🌊",
      name: `${prefix} ${sym} Anticheat ⭐⭐🌊`,
      color: "#0891B2",
      hoist: false,
      permissions: [
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "STAFF"
    },
    {
      baseName: "Event ⭐⭐⭐🎁",
      name: `${prefix} ${sym} Event ⭐⭐⭐🎁`,
      color: "#D8B4FE",
      hoist: false,
      permissions: [
        PermissionFlagsBits.MentionEveryone,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.PrioritySpeaker,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "STAFF"
    },
    {
      baseName: "Event ⭐",
      name: `${prefix} ${sym} Event ⭐`,
      color: "#C084FC",
      hoist: false,
      permissions: [
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "STAFF"
    },

    // --- 5. STARS / FIVEM PVP TIERS & RATINGS ---
    {
      baseName: "⭐⭐⭐⭐⭐🚩",
      name: "⭐⭐⭐⭐⭐🚩",
      color: "#FDE68A",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream
      ],
      category: "TIERS"
    },
    {
      baseName: "⭐⭐⭐⭐🚩",
      name: "⭐⭐⭐⭐🚩",
      color: "#E2E8F0",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream
      ],
      category: "TIERS"
    },
    {
      baseName: "⭐⭐⭐🚩",
      name: "⭐⭐⭐🚩",
      color: "#FEF08A",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream
      ],
      category: "TIERS"
    },
    {
      baseName: "⭐⭐🚩",
      name: "⭐⭐🚩",
      color: "#FB923C",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream
      ],
      category: "TIERS"
    },
    {
      baseName: "⭐🚩",
      name: "⭐🚩",
      color: "#38BDF8",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "TIERS"
    },

    // --- 6. VIP, STORE & REWARDS ---
    {
      baseName: "Manager Vip",
      name: `${prefix} ${sym} Manager Vip`,
      color: "#06B6D4",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "VIP"
    },
    {
      baseName: "vip diamond 🦀",
      name: `${prefix} ${sym} vip diamond 🦀`,
      color: "#00E5FF",
      hoist: true,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.ChangeNickname,
        PermissionFlagsBits.PrioritySpeaker,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "VIP"
    },
    {
      baseName: "Battlepass 🎖️",
      name: `${prefix} ${sym} Battlepass 🎖️`,
      color: "#EAB308",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.ChangeNickname,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "VIP"
    },

    // --- 7. COMMUNITY, PROMOTION & VANITY ---
    {
      baseName: "Tiktoker Tier 2 🎵",
      name: `${prefix} ${sym} Tiktoker Tier 2 🎵`,
      color: "#06B6D4",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "COMMUNITY"
    },
    {
      baseName: "Tiktoker Tier 1 🎵",
      name: `${prefix} ${sym} Tiktoker Tier 1 🎵`,
      color: "#38BDF8",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "COMMUNITY"
    },
    {
      baseName: "Server Booster",
      name: "Server Booster",
      color: "#F47FFF",
      hoist: true,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.ChangeNickname,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.Stream
      ],
      category: "COMMUNITY"
    },
    {
      baseName: vanity,
      name: vanity,
      color: "#0284C7",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.ChangeNickname
      ],
      category: "VANITY"
    },
    {
      baseName: "Melhor",
      name: "Melhor",
      color: "#00E5FF",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ],
      category: "COMMUNITY"
    },
    {
      baseName: "🛡️",
      name: "🛡️",
      color: "#94A3B8",
      hoist: false,
      permissions: [
        ...BASE_MEMBER_PERMS
      ],
      category: "VERIFICATION"
    }
  ];
}

async function setupRoles() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  console.log("==================================================================");
  console.log("🚀 [NOVA Setup] Application des permissions et rôles NOVA PVP");
  console.log(`   Prefix  : "${SERVER_PREFIX}"`);
  console.log(`   Symbol  : "${DECO_SYMBOL}"`);
  console.log(`   Vanity  : "${VANITY_NAME}"`);
  console.log("==================================================================");

  await client.login(process.env.DISCORD_TOKEN);
  console.log(`[NOVA Setup] Connecté en tant que ${client.user.tag}`);

  const guildId = process.env.GUILD_ID;
  let guild = null;
  try {
    guild = await client.guilds.fetch(guildId);
  } catch (err) {
    if (client.guilds.cache.size > 0) {
      guild = client.guilds.cache.first();
    }
  }

  if (!guild) {
    console.error(`⚠️ [NOVA Setup] Serveur (${guildId}) introuvable !`);
    await client.destroy();
    process.exit(1);
  }

  console.log(`[NOVA Setup] Serveur ciblé : "${guild.name}" (${guild.id})`);

  let me = await guild.members.fetchMe();
  console.log(`[NOVA Setup] Position actuelle du Bot : ${me.roles.highest.position} (${me.roles.highest.name})`);

  const existingRoles = await guild.roles.fetch();
  const roleDefs = getRoleDefinitions(SERVER_PREFIX, DECO_SYMBOL, VANITY_NAME);

  let updatedCount = 0;
  let createdCount = 0;
  const handledRoleIds = new Set();

  for (const def of roleDefs) {
    // Check if role exists with either exact name or old prefix
    let targetRole = existingRoles.find(r => r.name.trim() === def.name.trim() && !handledRoleIds.has(r.id));

    if (!targetRole) {
      targetRole = existingRoles.find(r => {
        if (handledRoleIds.has(r.id)) return false;
        const normName = r.name.toLowerCase().trim();
        const normBase = def.baseName.toLowerCase().trim();
        const cleaned = normName.replace(/^([^\s]+)\s+([^\s]+)\s+/i, "").trim();
        return cleaned === normBase || normName.endsWith(normBase);
      });
    }

    if (targetRole) {
      handledRoleIds.add(targetRole.id);
      try {
        const oldName = targetRole.name;
        await targetRole.edit({
          name: def.name,
          color: def.color,
          hoist: def.hoist,
          permissions: def.permissions,
          reason: `Configuration complète des permissions NOVA PVP (${def.category})`
        });
        console.log(`✅ [Permissions & Rôle OK] "${oldName}" ➜ "${def.name}" (${def.permissions.length} perms)`);
        updatedCount++;
        // Délai de sécurité anti-nuke
        await new Promise(r => setTimeout(r, 600));
      } catch (err) {
        console.error(`❌ [Erreur mise à jour "${targetRole.name}"]:`, err.message);
      }
    } else {
      try {
        const newRole = await guild.roles.create({
          name: def.name,
          color: def.color,
          hoist: def.hoist,
          permissions: def.permissions,
          reason: `Création avec permissions complètes NOVA PVP (${def.category})`
        });
        console.log(`🎉 [Créé + Permissions OK] "${newRole.name}" (${def.permissions.length} perms)`);
        createdCount++;
        await new Promise(r => setTimeout(r, 600));
      } catch (err) {
        console.error(`❌ [Erreur création "${def.name}"]:`, err.message);
      }
    }
  }

  console.log("\n==================================================================");
  console.log(`🎉 [NOVA Setup Terminé avec Succès]`);
  console.log(`   - Rôles configurés avec leurs permissions : ${updatedCount}`);
  console.log(`   - Rôles nouvellement créés                : ${createdCount}`);
  console.log(`   - Total des rôles traités                 : ${roleDefs.length}`);
  console.log("==================================================================");

  await client.destroy();
  process.exit(0);
}

if (require.main === module) {
  setupRoles().catch(err => {
    console.error("[NOVA Setup] Erreur fatale :", err);
    process.exit(1);
  });
}

module.exports = { setupRoles, getRoleDefinitions };
