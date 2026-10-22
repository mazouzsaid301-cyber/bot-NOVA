const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const { isGamingFeedPosted, recordGamingFeedPost } = require("./db");
const { log } = require("./logger");

/**
 * Fetch active free games / giveaways from GamerPower public API
 * @param {string} platform - Optional filter: 'pc', 'steam', 'epic-games-store', etc.
 * @returns {Promise<Array>} List of free game objects
 */
async function fetchFreeGames(platform = "pc") {
  try {
    let url = "https://www.gamerpower.com/api/giveaways?type=game";
    if (platform && platform !== "all") {
      url += `&platform=${encodeURIComponent(platform)}`;
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "NovaPVP-Bot/1.0 (Discord Bot; gaming-hub)"
      }
    });

    if (!res.ok) {
      console.warn(`[Gaming Feed] GamerPower HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
      id: `gp_${item.id}`,
      title: item.title || "Jeu Gratuit",
      worth: item.worth && item.worth !== "N/A" ? item.worth : "Offert",
      thumbnail: item.thumbnail,
      image: item.image || item.thumbnail,
      description: item.description || "Aucune description fournie.",
      instructions: item.instructions || "",
      url: item.open_giveaway_url || item.open_giveaway || item.gamerpower_url,
      platforms: item.platforms || "PC",
      endDate: item.end_date,
      status: item.status
    }));
  } catch (err) {
    console.error("[Gaming Feed Error - Free Games]:", err.message);
    return [];
  }
}

/**
 * Fetch top gaming news from PC Gamer RSS
 * @returns {Promise<Array>} List of gaming news articles
 */
async function fetchGamingNews() {
  try {
    const res = await fetch("https://www.pcgamer.com/rss/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NovaPVP/1.0"
      }
    });

    if (!res.ok) return [];
    const xml = await res.text();

    const items = xml.split("<item>").slice(1, 15);
    const articles = [];

    for (const rawItem of items) {
      const titleMatch = rawItem.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || rawItem.match(/<title>(.*?)<\/title>/);
      const linkMatch = rawItem.match(/<link>(.*?)<\/link>/);
      const descMatch = rawItem.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || rawItem.match(/<description>(.*?)<\/description>/);
      const enclosureMatch = rawItem.match(/<enclosure[^>]+url=["'](.*?)["']/);
      const mediaMatch = rawItem.match(/<media:content[^>]+url=["'](.*?)["']/);

      if (!titleMatch || !linkMatch) continue;

      const title = titleMatch[1].trim();
      const link = linkMatch[1].trim();
      let description = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      if (description.length > 280) {
        description = description.slice(0, 277) + "...";
      }

      const image = enclosureMatch ? enclosureMatch[1] : (mediaMatch ? mediaMatch[1] : null);

      // Clean ID from URL slug
      const idMatch = link.match(/([a-zA-Z0-9-]+)\/?$/);
      const id = idMatch ? `news_${idMatch[1]}` : `news_${Buffer.from(link).toString("base64").slice(0, 32)}`;

      articles.push({
        id,
        title,
        link,
        description: description || "Découvrez toutes les informations sur cette nouvelle annonce de jeu vidéo.",
        image
      });
    }

    return articles;
  } catch (err) {
    console.error("[Gaming Feed Error - News]:", err.message);
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
 * Format free game embed for Discord
 */
function formatFreeGameEmbed(game, guild, client) {
  const isEpic = game.platforms.toLowerCase().includes("epic");
  const isSteam = game.platforms.toLowerCase().includes("steam");
  const isGog = game.platforms.toLowerCase().includes("gog") || game.platforms.toLowerCase().includes("drm-free");

  let color = 0x57F287; // Green for free
  let platformBadge = "🎮 JEU GRATUIT";
  if (isEpic) {
    color = 0x8B5CF6; // Violet NOVA / Epic
    platformBadge = "🟣 EPIC GAMES STORE";
  } else if (isSteam) {
    color = 0x5865F2; // Discord Blurple / Steam Blue
    platformBadge = "🟢 STEAM";
  } else if (isGog) {
    color = 0x06B6D4; // Cyan
    platformBadge = "🔵 GOG / SANS DRM";
  }

  const novaLogo = getGuildEmoji(guild, ["nova_logo", "nova_pvp"]) || "💎";

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: `🎮 NOVA GAMING HUB • ${platformBadge}`,
      iconURL: guild?.iconURL({ dynamic: true }) || client?.user?.displayAvatarURL()
    })
    .setTitle(`${novaLogo} ${game.title}`)
    .setDescription(
      `💰 **Prix d'origine :** ~~${game.worth}~~ ➔ **GRATUIT (100% OFF) !** 🎁\n` +
      `🕹️ **Plateforme(s) :** \`${game.platforms}\`\n` +
      `⏳ **Disponibilité :** ${game.endDate && game.endDate !== "N/A" ? `<t:${Math.floor(new Date(game.endDate).getTime() / 1000)}:R> (\`${game.endDate}\`)` : "Offre à durée limitée !"}\n\n` +
      `📖 **À propos du jeu :**\n${game.description}`
    )
    .setFooter({
      text: "NOVA PVP System • Hub Jeux Vidéo & Bons Plans • Récupérez-le gratuitement !",
      iconURL: guild?.iconURL({ dynamic: true }) || client?.user?.displayAvatarURL()
    })
    .setTimestamp();

  if (game.image) {
    embed.setImage(game.image);
  }

  const buttons = [];
  if (game.url) {
    const claimBtn = new ButtonBuilder()
      .setLabel(`🎮 Récupérer sur ${isEpic ? "Epic Games" : isSteam ? "Steam" : "la boutique"}`)
      .setStyle(ButtonStyle.Link)
      .setURL(game.url);
    buttons.push(claimBtn);
  }

  const row = buttons.length > 0 ? new ActionRowBuilder().addComponents(buttons) : null;
  return { embed, row };
}

/**
 * Format gaming news embed for Discord
 */
function formatGamingNewsEmbed(article, guild, client) {
  const novaLogo = getGuildEmoji(guild, ["nova_logo", "nova_pvp"]) || "⚡";

  const embed = new EmbedBuilder()
    .setColor(0x8B5CF6) // Electric Violet NOVA Theme
    .setAuthor({
      name: "📰 NOVA GAMING HUB • Actualités & Nouveautés Jeux Vidéo",
      iconURL: guild?.iconURL({ dynamic: true }) || client?.user?.displayAvatarURL()
    })
    .setTitle(`${novaLogo} ${article.title}`)
    .setDescription(
      `${article.description}\n\n` +
      `🔗 **Pour lire l'annonce officielle :** Cliquez sur le bouton ci-dessous !`
    )
    .setFooter({
      text: "NOVA PVP System • Gaming News & Sorties Récentes",
      iconURL: guild?.iconURL({ dynamic: true }) || client?.user?.displayAvatarURL()
    })
    .setTimestamp();

  if (article.image) {
    embed.setImage(article.image);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("📖 Lire l'article complet")
      .setStyle(ButtonStyle.Link)
      .setURL(article.link)
  );

  return { embed, row };
}

/**
 * Scan for new free games and news, then post them to the gaming-hub channel
 * @param {Client} client
 * @param {Object} config
 * @param {Object} options
 */
async function checkAndPostGamingUpdates(client, config, options = {}) {
  const maxFreeGames = options.maxFreeGames || 3;
  const maxNews = options.maxNews || 2;
  const channelId = config.gamingChannelId || "1561442801642635496";

  const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.warn(`[Gaming Feed] Salon gaming-hub introuvable (${channelId}).`);
    return { freeGamesPosted: 0, newsPosted: 0, error: "Salon introuvable" };
  }

  const guild = channel.guild;
  const botPerms = channel.permissionsFor(guild.members.me);
  if (!botPerms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    console.warn(`[Gaming Feed] Permissions insuffisantes dans #${channel.name}.`);
    return { freeGamesPosted: 0, newsPosted: 0, error: "Permissions insuffisantes" };
  }

  let freeGamesPosted = 0;
  let newsPosted = 0;

  // 1. Process Free Games
  try {
    const freeGames = await fetchFreeGames("pc");
    for (const game of freeGames) {
      if (freeGamesPosted >= maxFreeGames) break;
      if (!isGamingFeedPosted(game.id)) {
        const { embed, row } = formatFreeGameEmbed(game, guild, client);
        const payload = { embeds: [embed] };
        if (row) payload.components = [row];

        await channel.send(payload);
        recordGamingFeedPost(game.id, "free_game", game.title, game.platforms);
        freeGamesPosted++;
        console.log(`[Gaming Feed] Nouveau jeu gratuit posté dans #${channel.name} : ${game.title}`);
      }
    }
  } catch (err) {
    console.error("[Gaming Feed Error - Free Games Process]:", err.message);
  }

  // 2. Process Gaming News
  try {
    const newsArticles = await fetchGamingNews();
    for (const article of newsArticles) {
      if (newsPosted >= maxNews) break;
      if (!isGamingFeedPosted(article.id)) {
        const { embed, row } = formatGamingNewsEmbed(article, guild, client);
        await channel.send({ embeds: [embed], components: [row] });
        recordGamingFeedPost(article.id, "news", article.title, "PC Gamer");
        newsPosted++;
        console.log(`[Gaming Feed] Nouvelle news postée dans #${channel.name} : ${article.title}`);
      }
    }
  } catch (err) {
    console.error("[Gaming Feed Error - News Process]:", err.message);
  }

  if (freeGamesPosted > 0 || newsPosted > 0) {
    log(guild, "🎮 Gaming Hub Mis à Jour", `${freeGamesPosted} jeu(x) gratuit(s) et ${newsPosted} actualité(s) postés dans ${channel}.`, 0x57F287, {
      category: "bot"
    });
  }

  return { freeGamesPosted, newsPosted };
}

/**
 * Start periodic scheduler for gaming updates (every 30 minutes)
 */
function startGamingFeedScheduler(client, config, intervalMinutes = 30) {
  // First run after 6 seconds of startup to allow bot to finish initialization
  setTimeout(async () => {
    try {
      console.log("[Gaming Feed] Vérification initiale des jeux gratuits et actualités gaming...");
      await checkAndPostGamingUpdates(client, config, { maxFreeGames: 3, maxNews: 2 });
    } catch (err) {
      console.error("[Gaming Feed] Erreur scan initial :", err.message);
    }
  }, 6000);

  // Recurring interval
  const intervalMs = Math.max(5, intervalMinutes) * 60 * 1000;
  const timer = setInterval(async () => {
    try {
      await checkAndPostGamingUpdates(client, config, { maxFreeGames: 2, maxNews: 1 });
    } catch (err) {
      console.error("[Gaming Feed] Erreur vérification périodique :", err.message);
    }
  }, intervalMs);

  return timer;
}

module.exports = {
  fetchFreeGames,
  fetchGamingNews,
  formatFreeGameEmbed,
  formatGamingNewsEmbed,
  checkAndPostGamingUpdates,
  startGamingFeedScheduler
};
