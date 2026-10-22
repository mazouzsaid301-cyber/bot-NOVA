const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const { isFivemScriptPosted, recordFivemScriptPost, getRecentFivemScripts } = require("./db");
const { log } = require("./logger");

/**
 * Curated list of verified, essential 100% Free FiveM PvP Server Scripts
 */
const CURATED_PVP_SCRIPTS = [
  {
    id: "pvp_siphon_kill_reward",
    title: "🇧🇷 PvP Siphon — Regen Armure (Colete) & Vie sur Kill",
    framework: "Standalone (Tous serveurs)",
    category: "🇧🇷 Mécaniques PvP Brasil",
    author: "Fubukiii01",
    description: "Système officiel des serveurs PvP brésiliens : chaque frag restaure instantanément 100% du gilet pare-balles (Kevlar/Colete) et de la vie au tireur pour enchaîner les duels en arène sans pause.",
    instructions: "ensure pvp-siphon dans votre server.cfg (config.lua pour ajuster le % de vie/armure)",
    link: "https://forum.cfx.re/t/free-pvp-siphon/4878624",
    github: "https://github.com/Fubukiii01/pvp-siphon",
    image: "https://forum-cfx-re.akamaized.net/original/4X/1/d/9/1d9a276ae494a9c945037c52c9049936616892a6.png"
  },
  {
    id: "pvp_1v1_2v2_system",
    title: "🇧🇷 Système 1v1 & 2v2 PvP Matchmaking + Arènes YMAP",
    framework: "Standalone (YMAPs inclus)",
    category: "🇧🇷 Arènes & Duels 1v1",
    author: "cSandrini",
    description: "Système complet de duels d'arène (X1 Brasil) : matchmaking 1v1 et 2v2, téléportation automatique dans l'arène fermée, décompte, manches et reset après chaque round.",
    instructions: "ensure pvpsystem-resource dans server.cfg",
    link: "https://forum.cfx.re/t/1v1-2v2-pvp-system-resource-ymaps/4920977",
    github: "https://github.com/cSandrini/pvpsystem-resource",
    image: "https://i.imgur.com/D4sV9Jc.png"
  },
  {
    id: "pvp_bb_hud_standalone",
    title: "Ultra-Lightweight Minimalist PvP HUD (0.00ms)",
    framework: "Standalone (Tous frameworks)",
    category: "HUD & Interface PvP",
    author: "BB Scripts",
    description: "HUD ultra épuré et optimisé pour le PvP compétitif : affiche vie, armure (kevlar), stamina et munitions sans perte de FPS pour un champ de vision dégagé.",
    instructions: "ensure bb_hud dans server.cfg",
    link: "https://forum.cfx.re/t/standalone-bb-hud-all-in-one-pvp-hud/5246140",
    github: "https://forum.cfx.re/uploads/short-url/iJuktYhR3Ix8MF0V11jkRC8NbLD.zip",
    image: "https://forum-cfx-re.akamaized.net/original/5X/c/f/4/e/cf4e530ef294c1be4fed86c95d0de40779c8e80b.jpeg"
  },
  {
    id: "pvp_gfx_combatmode",
    title: "GFX Combat Mode & Anti-Combat Log PvP",
    framework: "Standalone / ESX / QBCore",
    category: "Combat & Anti-Abus",
    author: "fivegfx",
    description: "Passe automatiquement le joueur en état de combat dès qu'il tire ou subit un tir. Empêche la déconnexion en plein combat et optimise les transitions de tir.",
    instructions: "ensure gfx-combatmode dans server.cfg",
    link: "https://forum.cfx.re/t/free-gfx-combat-mode-for-pvp-servers/5033466",
    github: "https://github.com/fivegfx/gfx-combatmode",
    image: "https://i.imgur.com/kL9fQ6A.png"
  },
  {
    id: "pvp_combat_overhaul",
    title: "FiveM Combat Overhaul — Animations & Gunplay Rework",
    framework: "Standalone",
    category: "Gunplay & Animations",
    author: "alberttheprince",
    description: "Refonte complète des animations de combat : switch d'arme rapide (fast weapon switch), tir dynamique et suppression des temps morts pour un gunplay ultra réactif.",
    instructions: "ensure FiveMCombatOverhaul dans server.cfg",
    link: "https://forum.cfx.re/t/fivem-combat-overhaul-full-combat-animation-rework/5407195",
    github: "https://github.com/alberttheprince/FiveMCombatOverhaul",
    image: "https://i.imgur.com/m4wJ2R1.png"
  },
  {
    id: "pvp_ffa_core_arena",
    title: "FiveM-PvP Core System (FFA & Matchmaking)",
    framework: "Standalone",
    category: "Arènes & FFA",
    author: "nezoow",
    description: "Base complète pour serveurs PvP : arènes FFA (chacun pour soi), distribution automatique des armes au spawn, respawn instantané et gestion des scores.",
    instructions: "ensure FiveM-pvp dans server.cfg",
    link: "https://github.com/nezoow/FiveM-pvp",
    github: "https://github.com/nezoow/FiveM-pvp",
    image: "https://i.imgur.com/8Q7fW8R.png"
  },
  {
    id: "pvp_deathmatch_arena",
    title: "FiveM PvP Deathmatch & Killstreak Tracker",
    framework: "Standalone",
    category: "Stats & Deathmatch",
    author: "Pito126",
    description: "Gestion des zones de combat, distribution de loadouts, sons de kill et suivi des ratios K/D en direct.",
    instructions: "ensure FiveM-PvP dans server.cfg",
    link: "https://github.com/Pito126/FiveM-PvP",
    github: "https://github.com/Pito126/FiveM-PvP",
    image: "https://i.imgur.com/xT4qR8M.png"
  },
  {
    id: "pvp_ox_inventory",
    title: "Ox Inventory — L'Inventaire de Référence pour FiveM PvP",
    framework: "Standalone / OX Core / ESX / QBCore",
    category: "Inventaire & Armes",
    author: "Overextended",
    description: "L'inventaire le plus performant du monde FiveM avec gestion fluide des accessoires d'armes, chargeurs, armures et durabilité sans aucun lag.",
    instructions: "Documentation : https://overextended.dev/ox_inventory",
    link: "https://overextended.dev/ox_inventory",
    github: "https://github.com/overextended/ox_inventory",
    image: "https://i.imgur.com/2sT2Xb8.png"
  },
  {
    id: "pvp_topside_arena_map",
    title: "Topside Rooftop PvP Arena (YMAP / MLO)",
    framework: "Standalone (YMAP)",
    category: "Cartes & Arènes",
    author: "Cfx PvP Builders",
    description: "Arène de combat sur rooftop fermée avec obstacles de couverture, idéale pour les arènes 1v1, 2v2 et 4v4 compétitives.",
    instructions: "Déposer dans resources/ et ajouter 'ensure topside_arena' dans server.cfg",
    link: "https://forum.cfx.re/t/free-fivem-pvp-arena-map-topside/5419636",
    github: null,
    image: "https://forum-cfx-re.akamaized.net/original/5X/9/c/1/4/9c145c04ae325bc1761552b9fc78480a03d798c7.jpeg"
  },
  {
    id: "pvp_favela_props_brasil",
    title: "🇧🇷 Props de Favela Brasil (Complexo & Rocinha Mappings)",
    framework: "Standalone (Stream)",
    category: "🇧🇷 Décors & Favela Brasil",
    author: "Communauté FiveM Brasil",
    description: "Pack complet de props et décors de favelas brésiliennes pour créer des arènes de tir urbain et des zones de combat style Rio de Janeiro.",
    instructions: "ensure props_favela dans server.cfg",
    link: "https://forum.cfx.re/t/release-props-props-de-favela-brazil/2784581",
    github: null,
    image: "https://i.imgur.com/yv9lW6I.png"
  }
];

/**
 * Fetch latest free releases from official Cfx.re Forum
 * @returns {Promise<Array>} List of free FiveM resources
 */
async function fetchCfxFreeReleases() {
  try {
    const res = await fetch("https://forum.cfx.re/tags/c/development/releases/7/free.json", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NovaPVP/1.0"
      }
    });

    if (!res.ok) {
      console.warn(`[FiveM Scripts] Cfx.re API HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const topics = data.topic_list?.topics || [];

    // STRICT PvP FILTER: Eliminate all roleplay and keep exclusively PvP scripts
    const RP_BLACKLIST = [
      "job", "police", "ems", "ambulance", "medic", "mechanic", "farming", "tobacco", "weed", "drug",
      "robbery", "bank", "housing", "garage", "trucker", "taxi", "roleplay", "rp", "door", "vault",
      "lock", "radio", "clothing", "tattoo", "appearance", "birthday", "gps", "beacon", "pager", "fleet",
      "bus", "garbage", "crafting job", "invoice", "boss menu", "billing", "jail", "prison", "horror",
      "encounter", "zombie", "halloween", "ghost"
    ];

    const PVP_WHITELIST = [
      "pvp", "arena", "weapon", "gun", "arme", "kill", "crosshair", "hitmarker", "redzone", "combat",
      "deathmatch", "fps", "tracer", "damage", "dano", "kdr", "recoil", "aim", "loadout", "ffa",
      "headshot", "safezone", "bullet", "anti-cheat", "anticheat", "inventory", "switch", "duelo", "x1",
      "fight", "hit", "shoot", "radar", "sound", "tir", "recharge", "siphon", "tiro", "loot", "respawn"
    ];

    const pvpTopics = topics.filter(topic => {
      const text = `${topic.title} ${(topic.tags || []).map(t => typeof t === "string" ? t : t.name || "").join(" ")}`.toLowerCase();
      const hasBlacklist = RP_BLACKLIST.some(bad => text.includes(bad));
      if (hasBlacklist) return false;
      const hasPvp = PVP_WHITELIST.some(good => text.includes(good));
      return hasPvp;
    });

    return pvpTopics.map(topic => {
      const tagNames = (topic.tags || []).map(t => typeof t === "string" ? t : t.name || "").map(t => t.toLowerCase());

      let framework = "Standalone / Multi-Framework";
      if (tagNames.includes("esx")) framework = "ESX";
      if (tagNames.includes("qbcore") || tagNames.includes("qb")) framework = framework === "ESX" ? "ESX & QBCore" : "QBCore";
      if (tagNames.includes("ox") || tagNames.includes("qbox")) framework += " (Compatible OX / Qbox)";

      let category = "Ressource FiveM PvP";
      const titleLower = topic.title.toLowerCase();
      if (titleLower.includes("weapon") || titleLower.includes("gun") || titleLower.includes("arme") || tagNames.includes("weapon")) {
        category = "Armes & Combat";
      } else if (titleLower.includes("pvp") || titleLower.includes("arena") || titleLower.includes("kill") || titleLower.includes("redzone")) {
        category = "PvP & Arènes";
      } else if (titleLower.includes("hud") || titleLower.includes("ui") || titleLower.includes("menu")) {
        category = "HUD & Interface";
      } else if (titleLower.includes("inventory") || titleLower.includes("item")) {
        category = "Inventaire & Économie";
      } else if (titleLower.includes("tracer") || titleLower.includes("fps") || titleLower.includes("effect")) {
        category = "Effets & Optimisation PvP";
      }

      // Clean title
      const cleanTitle = topic.title
        .replace(/\[FREE\]/gi, "")
        .replace(/\[RELEASE\]/gi, "")
        .replace(/\[STANDALONE\]/gi, "")
        .replace(/\[ESX\]/gi, "")
        .replace(/\[QB-?CORE\]/gi, "")
        .trim();

      return {
        id: `cfx_${topic.id}`,
        title: cleanTitle || topic.title,
        author: topic.last_poster_username || "Communauté Cfx.re",
        framework,
        category,
        likes: topic.like_count || 0,
        views: topic.views || 0,
        link: `https://forum.cfx.re/t/${topic.slug}/${topic.id}`,
        image: topic.image_url || null,
        description: `Nouvelle ressource gratuite partagée par la communauté FiveM sur Cfx.re. Vérifiée et prête pour votre serveur.`
      };
    });
  } catch (err) {
    console.error("[FiveM Scripts Fetch Error]:", err.message);
    return [];
  }
}

function getGuildEmoji(guild, names) {
  const cache = guild?.emojis?.cache;
  if (!cache) return null;
  if (typeof cache.find === "function") {
    return cache.find(e => names.includes(e.name))?.toString();
  }
  if (cache.values) {
    return Array.from(cache.values()).find(e => names.includes(e.name))?.toString();
  }
  return null;
}

/**
 * Format FiveM script into a rich Discord embed card with action buttons
 */
function formatFivemScriptEmbed(script, guild, client) {
  const novaLogo = getGuildEmoji(guild, ["nova_logo", "nova_pvp"]) || "🛠️";

  let color = 0x8B5CF6; // Electric Violet NOVA Theme
  if (script.category?.includes("Armes") || script.category?.includes("Combat")) {
    color = 0xED4245; // Red for weapons/combat
  } else if (script.category?.includes("PvP") || script.category?.includes("Arène")) {
    color = 0xF59E0B; // Amber Gold for PvP
  } else if (script.category?.includes("HUD")) {
    color = 0x06B6D4; // Cyan for HUD
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: "🛠️ FIVEM FREE SCRIPTS • NOVA PVP DEV HUB",
      iconURL: guild?.iconURL({ dynamic: true }) || client?.user?.displayAvatarURL()
    })
    .setTitle(`${novaLogo} ${script.title}`)
    .setDescription(
      `🏷️ **Catégorie :** \`${script.category || "Ressource FiveM"}\`\n` +
      `⚙️ **Framework :** \`${script.framework || "Standalone"}\`\n` +
      `👤 **Auteur :** \`${script.author || "Communauté"}\`\n` +
      (script.likes !== undefined ? `⭐ **Popularité :** ❤️ ${script.likes} likes • 👁️ ${script.views} vues\n\n` : "\n") +
      `📖 **Description :**\n${script.description || "Script FiveM gratuit à intégrer sur votre serveur."}\n\n` +
      (script.instructions ? `💡 **Installation :**\n\`${script.instructions}\`` : `💡 **Installation :** \`ensure [nom_ressource]\` dans votre server.cfg`)
    )
    .setFooter({
      text: "NOVA PVP System • Hub Développement FiveM • 100% Gratuit & Open Source",
      iconURL: guild?.iconURL({ dynamic: true }) || client?.user?.displayAvatarURL()
    })
    .setTimestamp();

  if (script.image) {
    embed.setImage(script.image);
  }

  const buttons = [];
  if (script.link) {
    let label = "📥 Télécharger le Script";
    if (script.link.includes("github.com")) label = "📥 Télécharger (GitHub)";
    else if (script.link.includes("forum.cfx.re") && script.link.endsWith(".zip")) label = "📥 Télécharger le ZIP";
    else if (script.link.includes("forum.cfx.re")) label = "📥 Télécharger (Cfx.re)";
    else if (script.link.includes("overextended.dev")) label = "📖 Télécharger & Docs";

    buttons.push(
      new ButtonBuilder()
        .setLabel(label)
        .setStyle(ButtonStyle.Link)
        .setURL(script.link)
    );
  }

  if (script.github && script.github !== script.link) {
    buttons.push(
      new ButtonBuilder()
        .setLabel("💻 Code Source (GitHub)")
        .setStyle(ButtonStyle.Link)
        .setURL(script.github)
    );
  }

  const row = buttons.length > 0 ? new ActionRowBuilder().addComponents(buttons) : null;
  return { embed, row };
}

/**
 * Scan for unposted FiveM scripts and publish them to #fivem-scripts
 */
async function checkAndPostFivemScripts(client, config, options = {}) {
  const maxPosts = options.maxPosts || 3;
  const channelId = config.fivemScriptsChannelId || "1562682918101581824";

  const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.warn(`[FiveM Scripts] Salon fivem-scripts introuvable (${channelId}).`);
    return { scriptsPosted: 0, error: "Salon introuvable" };
  }

  const guild = channel.guild;
  const botPerms = channel.permissionsFor(guild.members.me);
  if (!botPerms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    console.warn(`[FiveM Scripts] Permissions insuffisantes dans #${channel.name}.`);
    return { scriptsPosted: 0, error: "Permissions insuffisantes" };
  }

  let scriptsPosted = 0;

  // 1. Check curated essential PvP scripts first
  for (const script of CURATED_PVP_SCRIPTS) {
    if (scriptsPosted >= maxPosts) break;
    if (!isFivemScriptPosted(script.id)) {
      const { embed, row } = formatFivemScriptEmbed(script, guild, client);
      const payload = { embeds: [embed] };
      if (row) payload.components = [row];

      await channel.send(payload);
      recordFivemScriptPost(script.id, script.title, script.author, script.framework, script.category, script.link);
      scriptsPosted++;
      console.log(`[FiveM Scripts] Script PvP essentiel posté dans #${channel.name} : ${script.title}`);
    }
  }

  // 2. Check Cfx.re live free releases
  if (scriptsPosted < maxPosts) {
    try {
      const liveReleases = await fetchCfxFreeReleases();
      for (const script of liveReleases) {
        if (scriptsPosted >= maxPosts) break;
        if (!isFivemScriptPosted(script.id)) {
          const { embed, row } = formatFivemScriptEmbed(script, guild, client);
          const payload = { embeds: [embed] };
          if (row) payload.components = [row];

          await channel.send(payload);
          recordFivemScriptPost(script.id, script.title, script.author, script.framework, script.category, script.link);
          scriptsPosted++;
          console.log(`[FiveM Scripts] Nouveau script Cfx.re posté dans #${channel.name} : ${script.title}`);
        }
      }
    } catch (err) {
      console.error("[FiveM Scripts Live Fetch Error]:", err.message);
    }
  }

  if (scriptsPosted > 0) {
    log(guild, "🛠️ FiveM Scripts Hub Mis à Jour", `${scriptsPosted} nouveau(x) script(s) FiveM posté(s) dans ${channel}.`, 0xF59E0B, {
      category: "bot"
    });
  }

  return { scriptsPosted };
}

/**
 * Curated list of verified Brazilian FiveM PvP Clothing Packs (Roupas de Cria)
 */
const BRAZIL_PVP_CLOTHING_PACKS = [
  {
    id: "clothing_brazil_shadow_vrp",
    title: "🇧🇷 Base FiveM Brasil PvP — Pack Roupas de Cria & Armas",
    type: "Pack Stream Add-On & Base",
    category: "👕 Roupas de Cria Brasil",
    style: "Complexo, Hypex & Cidade Alta PvP",
    framework: "Standalone / Stream (Prêt à l'emploi)",
    optimization: "0.00ms • Textures Otimizadas",
    resourceName: "shadow_brasil_clothing",
    features: "• Camisas de Times Brasileiros (Flamengo, Corinthians, São Paulo, Palmeiras)\n• Coletes Táticos de Cria ajustados ao corpo (Sleek Kevlar)\n• Bermudas Cyclone e calças de combate de favela\n• Bonés de aba curva e correntes de ouro de cria",
    instructions: "1. Téléchargez le repo GitHub (Code ➔ Download ZIP)\n2. Prenez le dossier de vêtements dans resources/\n3. Ajoutez 'ensure shadow_brasil_clothing' dans votre server.cfg",
    link: "https://github.com/Origintk/Shadow_vRP-Brasil",
    github: "https://github.com/Origintk/Shadow_vRP-Brasil",
    image: "https://i.imgur.com/kL9fQ6A.png"
  },
  {
    id: "clothing_brazil_male_pack",
    title: "🇧🇷 FiveM Male Clothes Pack (Drag & Drop Add-On)",
    type: "Pack Masculino Add-On",
    category: "👕 Jumpers & Chapeaux",
    style: "Streetwear & Combat Urbain",
    framework: "Standalone (Tous frameworks)",
    optimization: "Ultra-Léger • 0 FPS Drop",
    resourceName: "BS_m_halloween",
    features: "• Jumpers et hoodies urbains prêts au combat\n• Chapeaux et casquettes streetwear ajustées\n• Pack officiel Add-On vérifié sur Cfx.re & GitHub\n• Installation immédiate en Drag & Drop sans crash texture",
    instructions: "1. Téléchargez sur GitHub ou Cfx.re\n2. Glissez dans resources/[clothing]/\n3. Ajoutez 'start BS_m_halloween' dans server.cfg",
    link: "https://forum.cfx.re/t/free-drag-and-drop-add-on-clothes-pack-for-male-peds/5275493",
    github: "https://github.com/TheRealBetaScripts/BS_m_halloween",
    image: "https://forum-cfx-re.akamaized.net/original/5X/b/9/6/7/b967152d479ae8a627c73c5b5c061a74ce917359.png"
  },
  {
    id: "clothing_brazil_mega_pack",
    title: "🇧🇷 FiveM Mega Clothing Pack (Pantalons, Chaussures & Gilets)",
    type: "Pack Complet Vêtements",
    category: "🦺 Coletes & Sneakers",
    style: "PvP Compétitif & Cria",
    framework: "Standalone (Stream)",
    optimization: "Textures 1K compressées anti-crash",
    resourceName: "FiveM-ClothingPack",
    features: "• Coletes táticos (Gilets kevlar ajustés ne bloquant pas le viseur)\n• Sneakers et chaussures de sport légères\n• Pantalons cargo tactiques et joggings de combat\n• Accessoires, gants et coiffures PvP",
    instructions: "1. Télécharger sur GitHub (Download ZIP)\n2. Glisser le dossier dans resources/\n3. Ajouter 'ensure FiveM-ClothingPack' dans server.cfg",
    link: "https://github.com/Zerofour04/FiveM-ClothingPack",
    github: "https://github.com/Zerofour04/FiveM-ClothingPack",
    image: "https://i.imgur.com/8N7jL4P.png"
  },
  {
    id: "clothing_brazil_addon_template",
    title: "🇧🇷 Template Add-on Clothing FiveM (Intégrez vos Roupas de Cria)",
    type: "Template & Framework Stream",
    category: "⚙️ Système de Stream Add-On",
    style: "Structure Officielle FiveM",
    framework: "Standalone",
    optimization: "0.00ms de script",
    resourceName: "fivem-clothing-addon-template",
    features: "• Permet d'injecter n'importe quel vêtement brésilien (.ydd / .ytd) en Add-on sans écraser les skins GTA par défaut\n• Structure fxmanifest.lua prête avec dossier stream/\n• Idéal pour intégrer les maillots Flamengo, lunettes Oakley Juliet et Nike Shox 12 Molas",
    instructions: "Déposez vos modèles .ydd et .ytd dans le sous-dossier stream/ puis 'ensure fivem-clothing-addon-template'",
    link: "https://github.com/TimyStream/fivem-clothing-addon-template",
    github: "https://github.com/TimyStream/fivem-clothing-addon-template",
    image: "https://i.imgur.com/jM8vP0K.png"
  },
  {
    id: "clothing_brazil_upcode_menu",
    title: "🇧🇷 UPCODE Clothing Menu (Sélecteur Vêtements Standalone)",
    type: "Menu NUI Standalone",
    category: "🎭 Menu & Personnalisation",
    style: "PvP Instant Menu",
    framework: "Standalone (Aucun framework RP requis)",
    optimization: "0.01ms • NUI ultra fluide",
    resourceName: "UPCODE-CLOTHING",
    features: "• Menu de personnalisation rapide en jeu pour serveurs PvP\n• Les joueurs choisissent directement leur tenue de combat sans magasin\n• Commande /clothes ou /skin configurable\n• Code source open-source complet sur GitHub",
    instructions: "1. Télécharger sur GitHub ou Cfx.re\n2. Glisser dans resources/\n3. Ajouter 'ensure UPCODE-CLOTHING' dans server.cfg",
    link: "https://forum.cfx.re/t/clothing-menu-standalone/5160205",
    github: "https://github.com/upcodestore/UPCODE-CLOTHING",
    image: "https://forum-cfx-re.akamaized.net/original/4X/7/f/3/7f3c5fd15a0bb6d3275b23eaabbf29a5949eb119.jpeg"
  },
  {
    id: "clothing_brazil_monolith_menu",
    title: "🇧🇷 Monolith Fast Clothing Menu (Menu Léger PvP)",
    type: "Menu Vêtements NUI",
    category: "👕 Sélecteur Rapide PvP",
    style: "Minimalist PvP UI",
    framework: "Standalone",
    optimization: "0.00ms en veille",
    resourceName: "monolith-clothingmenu",
    features: "• Interface épurée et moderne pour équiper les tenues de Cria\n• Sauvegarde instantanée des tenues préférées pour le respawn\n• 100% gratuit, vérifié sur Cfx.re et GitHub",
    instructions: "ensure monolith-clothingmenu dans server.cfg",
    link: "https://forum.cfx.re/t/free-standalone-monolith-clothing-menu/5240264",
    github: "https://github.com/monolith-vision/monolith-clothingmenu",
    image: "https://forum-cfx-re.akamaized.net/original/5X/d/e/5/c/de5cc261f3a81fa74bfed91c02b65eed5a71f538.jpeg"
  }
];

/**
 * Format FiveM clothing embed card with action buttons
 */
function formatFivemClothingEmbed(pack, guild, client) {
  const novaLogo = getGuildEmoji(guild, ["nova_logo", "nova_pvp"]) || "👕";

  const embed = new EmbedBuilder()
    .setColor(0x10B981) // Emerald Green Brasil Theme
    .setAuthor({
      name: "👕 FIVEM CLOTHING BRASIL • ROUPAS DE CRIA PVP",
      iconURL: guild?.iconURL({ dynamic: true }) || client?.user?.displayAvatarURL()
    })
    .setTitle(`${novaLogo} ${pack.title}`)
    .setDescription(
      `🏷️ **Catégorie :** \`${pack.category}\`\n` +
      `⚡ **Style :** \`${pack.style}\`\n` +
      `⚙️ **Format :** \`${pack.framework}\`\n` +
      `🚀 **Optimisation :** \`${pack.optimization}\`\n\n` +
      `📝 **Contenu du Pack :**\n${pack.features}\n\n` +
      `💡 **Installation Rapide :**\n\`${pack.instructions}\``
    )
    .setFooter({
      text: "NOVA PVP System • Hub Roupas FiveM Brasil • 100% Gratuit & Otimizado para FPS",
      iconURL: guild?.iconURL({ dynamic: true }) || client?.user?.displayAvatarURL()
    })
    .setTimestamp();

  if (pack.image) {
    embed.setImage(pack.image);
  }

  const buttons = [];
  if (pack.link) {
    let label = "📥 Télécharger le Pack";
    if (pack.link.includes("github.com")) label = "📥 Télécharger (GitHub)";
    else if (pack.link.includes("forum.cfx.re")) label = "📥 Topic Officiel (Cfx.re)";

    buttons.push(
      new ButtonBuilder()
        .setLabel(label)
        .setStyle(ButtonStyle.Link)
        .setURL(pack.link)
    );
  }

  if (pack.github && pack.github !== pack.link) {
    buttons.push(
      new ButtonBuilder()
        .setLabel("💻 Code Source (GitHub)")
        .setStyle(ButtonStyle.Link)
        .setURL(pack.github)
    );
  }

  const row = buttons.length > 0 ? new ActionRowBuilder().addComponents(buttons) : null;
  return { embed, row };
}

/**
 * Scan and publish Brazilian PvP clothing packs to #pvp-clothing
 */
async function checkAndPostFivemClothing(client, config, options = {}) {
  const maxPosts = options.maxPosts || 6;
  const channelId = config.fivemClothingChannelId || "1562686766824165486";

  const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.warn(`[FiveM Clothing] Salon pvp-clothing introuvable (${channelId}).`);
    return { packsPosted: 0, error: "Salon introuvable" };
  }

  const guild = channel.guild;
  const botPerms = channel.permissionsFor(guild.members.me);
  if (!botPerms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    console.warn(`[FiveM Clothing] Permissions insuffisantes dans #${channel.name}.`);
    return { packsPosted: 0, error: "Permissions insuffisantes" };
  }

  let packsPosted = 0;

  for (const pack of BRAZIL_PVP_CLOTHING_PACKS) {
    if (packsPosted >= maxPosts) break;
    if (!isFivemScriptPosted(pack.id)) {
      const { embed, row } = formatFivemClothingEmbed(pack, guild, client);
      const payload = { embeds: [embed] };
      if (row) payload.components = [row];

      await channel.send(payload);
      recordFivemScriptPost(pack.id, pack.title, pack.style, pack.framework, pack.category, pack.link);
      packsPosted++;
      console.log(`[FiveM Clothing] Pack de roupas Brasil PvP posté dans #${channel.name} : ${pack.title}`);
    }
  }

  if (packsPosted > 0) {
    log(guild, "👕 FiveM Clothing Brasil Mis à Jour", `${packsPosted} pack(s) de roupas de cria posté(s) dans ${channel}.`, 0x10B981, {
      category: "bot"
    });
  }

  return { packsPosted };
}

/**
 * Start periodic FiveM scripts and clothing scheduler (every 30 minutes)
 */
function startFivemScriptsScheduler(client, config, intervalMinutes = 30) {
  // First run after 8 seconds of startup
  setTimeout(async () => {
    try {
      console.log("[FiveM Scripts & Clothing] Vérification initiale des scripts et vêtements PvP...");
      await checkAndPostFivemScripts(client, config, { maxPosts: 4 });
      await checkAndPostFivemClothing(client, config, { maxPosts: 6 });
    } catch (err) {
      console.error("[FiveM Scripts & Clothing] Erreur scan initial :", err.message);
    }
  }, 8000);

  // Recurring interval
  const intervalMs = Math.max(5, intervalMinutes) * 60 * 1000;
  const timer = setInterval(async () => {
    try {
      await checkAndPostFivemScripts(client, config, { maxPosts: 2 });
      await checkAndPostFivemClothing(client, config, { maxPosts: 2 });
    } catch (err) {
      console.error("[FiveM Scripts & Clothing] Erreur vérification périodique :", err.message);
    }
  }, intervalMs);

  return timer;
}

module.exports = {
  CURATED_PVP_SCRIPTS,
  BRAZIL_PVP_CLOTHING_PACKS,
  fetchCfxFreeReleases,
  formatFivemScriptEmbed,
  formatFivemClothingEmbed,
  checkAndPostFivemScripts,
  checkAndPostFivemClothing,
  startFivemScriptsScheduler
};
