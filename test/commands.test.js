const test = require("node:test");
const assert = require("node:assert/strict");
const { commands, checkRoleHierarchy, isValidHttpUrl, isVideoUrl, isImageUrl, handleCommand, handleModalSubmit } = require("../src/commands");
const { formatFreeGameEmbed, formatGamingNewsEmbed } = require("../src/gaming");
const { formatFivemScriptEmbed, formatFivemClothingEmbed, CURATED_PVP_SCRIPTS, BRAZIL_PVP_CLOTHING_PACKS } = require("../src/fivemScripts");
const { formatCitizenEmbed, CURATED_FIVEM_CITIZENS } = require("../src/fivemCitizens");
const { isGamingFeedPosted, recordGamingFeedPost, isFivemScriptPosted, recordFivemScriptPost, isFivemCitizenPosted, recordFivemCitizenPost } = require("../src/db");

test("Commands: all 22 required commands are defined", () => {
  const expected = [
    "help", "ping", "dashboard", "ticket", "ticket-close",
    "setup-logs", "redeem-create", "redeem", "balance",
    "daily", "pay", "leaderboard", "mod-ban", "mod-kick",
    "mod-timeout", "purge", "clean", "rank", "rewards-info",
    "ticket-panel", "roles-panel", "setup-nova"
  ];

  const actualNames = commands.map(c => c.name);
  for (const cmd of expected) {
    assert.ok(actualNames.includes(cmd), `La commande /${cmd} doit être enregistrée`);
  }
});

test("Commands: NOVA PVP commands are properly configured", () => {
  const cleanCmd = commands.find(c => c.name === "clean");
  assert.ok(cleanCmd, "La commande /clean doit exister");
  assert.ok(cleanCmd.options.some(o => o.name === "forcer"), "L'option 'forcer' doit exister sur /clean");

  const rankCmd = commands.find(c => c.name === "rank");
  assert.ok(rankCmd, "La commande /rank doit exister");

  const ticketPanelCmd = commands.find(c => c.name === "ticket-panel");
  assert.ok(ticketPanelCmd, "La commande /ticket-panel doit exister");

  const rolesPanelCmd = commands.find(c => c.name === "roles-panel");
  assert.ok(rolesPanelCmd, "La commande /roles-panel doit exister");

  const setupNovaCmd = commands.find(c => c.name === "setup-nova");
  assert.ok(setupNovaCmd, "La commande /setup-nova doit exister");
});

test("Commands: checkRoleHierarchy blocks self-moderation", () => {
  const interaction = {
    user: { id: "user-123" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 10 } } } } },
    member: { roles: { highest: { position: 5 } } }
  };
  const targetMember = { id: "user-123", roles: { highest: { position: 5 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, false);
  assert.match(result.reason, /sur vous-même/i);
});

test("Commands: checkRoleHierarchy blocks bot moderation", () => {
  const interaction = {
    user: { id: "user-123" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 10 } } } } },
    member: { roles: { highest: { position: 5 } } }
  };
  const targetMember = { id: "bot-999", roles: { highest: { position: 10 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, false);
  assert.match(result.reason, /auto-sanctionner/i);
});

test("Commands: checkRoleHierarchy blocks owner moderation", () => {
  const interaction = {
    user: { id: "user-123" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 10 } } } } },
    member: { roles: { highest: { position: 5 } } }
  };
  const targetMember = { id: "owner-000", roles: { highest: { position: 15 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, false);
  assert.match(result.reason, /propriétaire/i);
});

test("Commands: checkRoleHierarchy blocks action if target has higher role than executor", () => {
  const interaction = {
    user: { id: "mod-1" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 20 } } } } },
    member: { roles: { highest: { position: 5 } } }
  };
  const targetMember = { id: "target-1", roles: { highest: { position: 8 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, false);
  assert.match(result.reason, /hiérarchie/i);
});

test("Commands: checkRoleHierarchy blocks action if target has higher role than bot", () => {
  const interaction = {
    user: { id: "admin-1" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 10 } } } } },
    member: { roles: { highest: { position: 25 } } }
  };
  const targetMember = { id: "target-1", roles: { highest: { position: 15 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, false);
  assert.match(result.reason, /rôle du bot/i);
});

test("Commands: checkRoleHierarchy allows action when hierarchy is respected", () => {
  const interaction = {
    user: { id: "mod-1" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 20 } } } } },
    member: { roles: { highest: { position: 15 } } }
  };
  const targetMember = { id: "target-1", roles: { highest: { position: 5 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, true);
});

test("Commands: /announce and /annonce are properly defined with modal trigger", () => {
  const announceCmd = commands.find(c => c.name === "announce");
  const annonceCmd = commands.find(c => c.name === "annonce");

  assert.ok(announceCmd, "La commande /announce doit être définie");
  assert.ok(annonceCmd, "La commande /annonce (alias) doit être définie");

  assert.ok(announceCmd.options.some(o => o.name === "salon"), "L'option 'salon' doit exister");
  assert.ok(announceCmd.options.some(o => o.name === "mention"), "L'option 'mention' doit exister");
  assert.ok(announceCmd.options.some(o => o.name === "couleur"), "L'option 'couleur' doit exister");
});

test("Commands: isValidHttpUrl correctly validates URLs", () => {
  assert.equal(isValidHttpUrl("https://example.com/image.png"), true);
  assert.equal(isValidHttpUrl("http://cdn.discordapp.com/logo.gif"), true);
  assert.equal(isValidHttpUrl("not-a-url"), false);
  assert.equal(isValidHttpUrl("ftp://invalid.com"), false);
  assert.equal(isValidHttpUrl(""), false);
  assert.equal(isValidHttpUrl(null), false);
});

test("Commands: handleCommand shows modal for /announce", async () => {
  let modalShown = null;
  const mockInteraction = {
    commandName: "announce",
    guild: {
      id: "guild-1",
      name: "NOVA PVP",
      members: {
        me: {
          roles: { highest: { position: 10 } }
        }
      }
    },
    channel: {
      id: "chan-1",
      permissionsFor: () => ({
        has: () => true
      })
    },
    options: {
      getString: (key) => key === "mention" ? "everyone" : "8B5CF6",
      getChannel: () => null
    },
    showModal: async (m) => {
      modalShown = m;
    }
  };

  await handleCommand(mockInteraction, {}, {});
  assert.ok(modalShown, "Un modal doit être affiché");
  assert.equal(modalShown.data.title, "📢 Créer une Annonce");
  assert.ok(modalShown.data.custom_id.startsWith("modal_announce:chan-1:everyone:8B5CF6"));
  assert.equal(modalShown.components.length, 5, "Le modal doit comporter 5 champs");
});

test("Commands: handleModalSubmit sends formatted announcement with image and button", async () => {
  let sentPayload = null;
  let deferred = false;
  let replyEdited = null;

  const mockTargetChannel = {
    id: "chan-annonces",
    isTextBased: () => true,
    permissionsFor: () => ({
      has: () => true
    }),
    send: async (payload) => {
      sentPayload = payload;
      return { url: "https://discord.com/channels/123/456/789" };
    }
  };

  const mockInteraction = {
    customId: "modal_announce:chan-annonces:everyone:8B5CF6",
    guild: {
      id: "guild-1",
      name: "NOVA PVP",
      iconURL: () => "https://example.com/server-icon.png",
      channels: {
        cache: new Map([["chan-annonces", mockTargetChannel]]),
        fetch: async () => null
      },
      members: {
        me: {}
      }
    },
    user: {
      id: "user-1",
      tag: "Admin#0001",
      displayAvatarURL: () => "https://example.com/avatar.png"
    },
    client: {
      user: {
        displayAvatarURL: () => "https://example.com/bot.png"
      }
    },
    fields: {
      getTextInputValue: (id) => {
        const values = {
          announce_title: "Tournoi NOVA PVP",
          announce_message: "Les inscriptions sont ouvertes !",
          announce_image: "https://example.com/tournament-banner.png",
          announce_thumbnail: "https://example.com/trophy.png",
          announce_link: "https://mazoodev.com"
        };
        return values[id] || "";
      }
    },
    deferReply: async () => { deferred = true; },
    editReply: async (data) => { replyEdited = data; }
  };

  await handleModalSubmit(mockInteraction, mockInteraction.client, {});

  assert.equal(deferred, true, "L'interaction doit être différée");
  assert.ok(sentPayload, "Le message doit être envoyé dans le salon cible");
  assert.equal(sentPayload.content, "@everyone", "La mention @everyone doit être présente");
  assert.equal(sentPayload.embeds.length, 1);

  const embedData = sentPayload.embeds[0].data;
  assert.equal(embedData.title, "Tournoi NOVA PVP");
  assert.equal(embedData.description, "Les inscriptions sont ouvertes !");
  assert.equal(embedData.image.url, "https://example.com/tournament-banner.png");
  assert.equal(embedData.thumbnail.url, "https://example.com/trophy.png");
  assert.ok(sentPayload.components.length > 0, "Un bouton cliquable doit être généré pour le lien");
  assert.ok(replyEdited.content.includes("Annonce publiée avec succès"), "L'utilisateur doit recevoir une confirmation avec lien");
});

test("Boost: addCoins awards currency properly", () => {
  const { addCoins, getUser } = require("../src/db");
  const testUserId = "booster-user-test-1";
  const initialBalance = getUser(testUserId).balance;
  const newBalance = addCoins(testUserId, 500, "Test Boost Reward");

  assert.equal(newBalance, initialBalance + 500);
  assert.equal(getUser(testUserId).balance, initialBalance + 500);
});

test("Boost: /test-boost command is registered", () => {
  const testBoostCmd = commands.find(c => c.name === "test-boost");
  assert.ok(testBoostCmd, "La commande /test-boost doit exister");
  assert.ok(testBoostCmd.options.some(o => o.name === "membre"), "L'option 'membre' doit exister");
});

test("Boost: handleBoost sends celebration embed and sends DM to booster", async () => {
  const { handleBoost } = require("../src/boost");
  let sentPublicMessage = null;
  let sentDm = null;

  const mockBoostChannel = {
    id: "chan-boosters-99",
    name: "server-boosters",
    isTextBased: () => true,
    permissionsFor: () => ({
      has: () => true
    }),
    send: async (payload) => {
      if (payload.content) {
        sentPublicMessage = payload;
      }
      return { id: "msg-1" };
    }
  };

  const mockMember = {
    id: "booster-user-test-2",
    user: {
      id: "booster-user-test-2",
      tag: "Booster#0001",
      username: "Booster",
      displayAvatarURL: () => "https://example.com/booster.png"
    },
    guild: {
      id: "guild-test",
      name: "NOVA PVP",
      premiumSubscriptionCount: 5,
      premiumTier: 1,
      iconURL: () => "https://example.com/guild.png",
      channels: {
        cache: new Map([["chan-boosters-99", mockBoostChannel]]),
        fetch: async () => mockBoostChannel
      },
      members: {
        me: {
          permissionsIn: () => ({ has: () => true })
        },
        fetchMe: async () => ({ permissionsIn: () => ({ has: () => true }) })
      }
    },
    send: async (payload) => {
      sentDm = payload;
      return { id: "dm-1" };
    }
  };

  const config = { boostChannelId: "chan-boosters-99" };
  const client = { user: { displayAvatarURL: () => "https://example.com/bot.png" } };

  const success = await handleBoost(mockMember, client, config, true);

  assert.equal(success, true, "handleBoost doit réussir");
  assert.ok(sentPublicMessage, "Un message public doit être envoyé");
  assert.ok(sentPublicMessage.content.includes("NOUVEAU BOOST DÉBLOQUÉ"));
  assert.equal(sentPublicMessage.embeds.length, 1);

  const embed = sentPublicMessage.embeds[0].data;
  assert.ok(embed.title.includes("NOUVEAU BOOST SERVEUR"));
  assert.ok(embed.description.includes("CHOUKRAN BZZAF"));
  assert.ok(sentDm, "Un DM de remerciement doit être envoyé au booster");
  assert.ok(sentDm.embeds[0].data.description.includes("Bghina nchokrok bzzaf"));
});

test("Commands: /meme command is registered with all options", () => {
  const memeCmd = commands.find(c => c.name === "meme");
  assert.ok(memeCmd, "La commande /meme doit exister");
  assert.equal(memeCmd.description.includes("NOVA PVP"), true);

  const optionNames = memeCmd.options.map(o => o.name);
  assert.ok(optionNames.includes("fichier"), "L'option 'fichier' doit exister");
  assert.ok(optionNames.includes("lien"), "L'option 'lien' doit exister");
  assert.ok(optionNames.includes("titre"), "L'option 'titre' doit exister");
  assert.ok(optionNames.includes("salon"), "L'option 'salon' doit exister");
});

test("Commands: isVideoUrl and isImageUrl accurately identify media types", () => {
  // Video tests
  assert.equal(isVideoUrl("https://cdn.discordapp.com/attachments/123/meme.mp4"), true);
  assert.equal(isVideoUrl("https://example.com/clip.webm?token=abc"), true);
  assert.equal(isVideoUrl("https://youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assert.equal(isVideoUrl("https://youtu.be/dQw4w9WgXcQ"), true);
  assert.equal(isVideoUrl("https://www.tiktok.com/@user/video/123456789"), true);
  assert.equal(isVideoUrl("https://streamable.com/abcde"), true);
  assert.equal(isVideoUrl("https://example.com/photo.png"), false);
  assert.equal(isVideoUrl(null), false);

  // Image tests
  assert.equal(isImageUrl("https://cdn.discordapp.com/attachments/123/funny.png"), true);
  assert.equal(isImageUrl("https://example.com/meme.jpg"), true);
  assert.equal(isImageUrl("https://example.com/animation.gif"), true);
  assert.equal(isImageUrl("https://example.com/image.webp?width=500"), true);
  assert.equal(isImageUrl("https://example.com/video.mp4"), false);
  assert.equal(isImageUrl(null), false);
});

test("Commands: handleCommand successfully formats and posts meme with vote buttons", async () => {
  let sentPayload = null;
  let editReplyPayload = null;

  const mockChannel = {
    id: "chan-memes-100",
    name: "memes",
    permissionsFor: () => ({ has: () => true }),
    send: async (payload) => {
      sentPayload = payload;
      return { id: "msg-meme-1", url: "https://discord.com/channels/123/456/789" };
    }
  };

  const mockInteraction = {
    commandName: "meme",
    user: { id: "user-meme-master", username: "MemeGuy", displayAvatarURL: () => "https://example.com/avatar.png" },
    member: { displayName: "MemeGuy" },
    guild: {
      id: "guild-test",
      name: "NOVA PVP",
      iconURL: () => "https://example.com/icon.png",
      emojis: { cache: new Map() },
      channels: { cache: new Map([["chan-memes-100", mockChannel]]) },
      members: { me: { permissionsIn: () => ({ has: () => true }) } }
    },
    options: {
      getAttachment: (opt) => opt === "fichier" ? { url: "https://example.com/meme.jpg", contentType: "image/jpeg" } : null,
      getString: (opt) => opt === "titre" ? "Quand tu perds en 1v1" : null,
      getChannel: () => mockChannel
    },
    deferReply: async () => {},
    editReply: async (payload) => { editReplyPayload = payload; return payload; },
    reply: async () => {}
  };

  const mockConfig = { memesChannelId: "chan-memes-100" };
  const mockClient = { user: { displayAvatarURL: () => "https://example.com/bot.png" } };

  await handleCommand(mockInteraction, mockClient, mockConfig);

  assert.ok(sentPayload, "Un payload doit être envoyé dans le salon des memes");
  assert.equal(sentPayload.embeds.length, 1);

  const embed = sentPayload.embeds[0].data;
  assert.ok(embed.title.includes("NOVA MEMES"));
  assert.ok(embed.description.includes("Quand tu perds en 1v1"));
  assert.equal(embed.image.url, "https://example.com/meme.jpg");
  assert.equal(sentPayload.components.length, 1);

  // Check 4 vote buttons exist
  const buttons = sentPayload.components[0].components;
  assert.equal(buttons.length, 4);
  assert.equal(buttons[0].data.custom_id, "meme_vote_laugh");
  assert.equal(buttons[1].data.custom_id, "meme_vote_skull");
  assert.equal(buttons[2].data.custom_id, "meme_vote_fire");
  assert.equal(buttons[3].data.custom_id, "meme_vote_flop");

  assert.ok(editReplyPayload, "Une confirmation doit être renvoyée à l'utilisateur");
  assert.ok(editReplyPayload.content.includes("Meme publié avec succès"));
  assert.ok(editReplyPayload.content.includes("+25 Coins"));
});

test("Gaming: /free-games, /gaming-news, and /check-gaming commands are defined", () => {
  const freeGamesCmd = commands.find(c => c.name === "free-games");
  assert.ok(freeGamesCmd, "La commande /free-games doit exister");
  assert.ok(freeGamesCmd.options.some(o => o.name === "plateforme"));

  const newsCmd = commands.find(c => c.name === "gaming-news");
  assert.ok(newsCmd, "La commande /gaming-news doit exister");

  const checkGamingCmd = commands.find(c => c.name === "check-gaming");
  assert.ok(checkGamingCmd, "La commande /check-gaming doit exister");
});

test("Gaming: formatFreeGameEmbed formats Epic and Steam games properly", () => {
  const mockGuild = { iconURL: () => "https://example.com/icon.png", emojis: { cache: new Map() } };
  const mockClient = { user: { displayAvatarURL: () => "https://example.com/bot.png" } };

  const epicGame = {
    id: "gp_101",
    title: "Civilization VI",
    worth: "$59.99",
    platforms: "PC, Epic Games Store",
    endDate: "2026-10-31 23:59:00",
    description: "Build an empire that will stand the test of time.",
    image: "https://example.com/civ6.jpg",
    url: "https://epicgames.com/p/civ6"
  };

  const { embed, row } = formatFreeGameEmbed(epicGame, mockGuild, mockClient);
  const data = embed.data;

  assert.ok(data.title.includes("Civilization VI"));
  assert.ok(data.description.includes("$59.99"));
  assert.ok(data.description.includes("GRATUIT"));
  assert.ok(data.author.name.includes("EPIC GAMES STORE"));
  assert.equal(data.image.url, "https://example.com/civ6.jpg");
  assert.ok(row, "Un bouton d'action doit être généré");
  assert.equal(row.components[0].data.url, "https://epicgames.com/p/civ6");
});

test("Gaming: formatGamingNewsEmbed formats article headline and source link", () => {
  const mockGuild = { iconURL: () => "https://example.com/icon.png", emojis: { cache: new Map() } };
  const mockClient = { user: { displayAvatarURL: () => "https://example.com/bot.png" } };

  const article = {
    id: "news_mass_effect",
    title: "The Next Mass Effect Unveiled",
    description: "BioWare reveals next-gen choices and autonomous storyline.",
    link: "https://pcgamer.com/mass-effect",
    image: "https://example.com/me.jpg"
  };

  const { embed, row } = formatGamingNewsEmbed(article, mockGuild, mockClient);
  const data = embed.data;

  assert.ok(data.title.includes("The Next Mass Effect"));
  assert.ok(data.description.includes("BioWare reveals"));
  assert.equal(data.image.url, "https://example.com/me.jpg");
  assert.ok(row, "Un bouton de lien d'article doit être généré");
  assert.equal(row.components[0].data.url, "https://pcgamer.com/mass-effect");
});

test("Gaming: database tracking prevents duplicate posts", () => {
  const testId = `test_game_${Date.now()}`;
  assert.equal(isGamingFeedPosted(testId), false, "Le jeu ne doit pas être marqué posté avant insertion");

  recordGamingFeedPost(testId, "free_game", "Test Game", "PC");
  assert.equal(isGamingFeedPosted(testId), true, "Le jeu doit être marqué posté après insertion");
});

test("FiveM: /fivem-scripts and /check-scripts commands are defined", () => {
  const scriptsCmd = commands.find(c => c.name === "fivem-scripts");
  assert.ok(scriptsCmd, "La commande /fivem-scripts doit exister");
  assert.ok(scriptsCmd.options.some(o => o.name === "categorie"));

  const checkCmd = commands.find(c => c.name === "check-scripts");
  assert.ok(checkCmd, "La commande /check-scripts doit exister");
});

test("FiveM: CURATED_PVP_SCRIPTS contains essential PvP server resources", () => {
  assert.ok(CURATED_PVP_SCRIPTS.length >= 5, "Le pack doit contenir au moins 5 scripts essentiels");
  const categories = CURATED_PVP_SCRIPTS.map(s => s.category);
  assert.ok(categories.some(c => c.includes("Armes")), "Doit contenir un script d'armes/inventaire");
  assert.ok(categories.some(c => c.includes("Arènes")), "Doit contenir un script d'arènes/1v1");
  assert.ok(categories.some(c => c.includes("HUD")), "Doit contenir un script de HUD");
  assert.ok(categories.some(c => c.includes("Combat") || c.includes("Gunplay")), "Doit contenir un script de combat/gunplay");
});

test("FiveM: formatFivemScriptEmbed formats script details and download buttons", () => {
  const mockGuild = { iconURL: () => "https://example.com/icon.png", emojis: { cache: new Map() } };
  const mockClient = { user: { displayAvatarURL: () => "https://example.com/bot.png" } };

  const testScript = CURATED_PVP_SCRIPTS[0];
  const { embed, row } = formatFivemScriptEmbed(testScript, mockGuild, mockClient);
  const data = embed.data;

  assert.ok(data.title.includes(testScript.title));
  assert.ok(data.description.includes(testScript.framework));
  assert.ok(data.description.includes(testScript.category));
  assert.ok(row, "Des boutons de téléchargement doivent être générés");
  assert.ok(row.components.length >= 1);
  assert.ok(row.components[0].data.label.includes("Télécharger"));
});

test("FiveM: database tracking prevents duplicate script posts", () => {
  const testId = `test_script_${Date.now()}`;
  assert.equal(isFivemScriptPosted(testId), false, "Le script ne doit pas être marqué posté avant insertion");

  recordFivemScriptPost(testId, "Test Script PvP", "Dev", "Standalone", "PvP", "https://cfx.re");
  assert.equal(isFivemScriptPosted(testId), true, "Le script doit être marqué posté après insertion");
});

test("FiveM: /pvp-clothing and /check-clothing commands are defined", () => {
  const clothingCmd = commands.find(c => c.name === "pvp-clothing");
  assert.ok(clothingCmd, "La commande /pvp-clothing doit exister");

  const checkClothingCmd = commands.find(c => c.name === "check-clothing");
  assert.ok(checkClothingCmd, "La commande /check-clothing doit exister");
});

test("FiveM: BRAZIL_PVP_CLOTHING_PACKS contains authentic Brazilian PvP outfits", () => {
  assert.ok(BRAZIL_PVP_CLOTHING_PACKS.length >= 5, "Le pack doit contenir au moins 5 packs de vêtements");
  const titles = BRAZIL_PVP_CLOTHING_PACKS.map(p => p.title);
  assert.ok(titles.some(t => t.includes("Cria")), "Doit contenir le pack Roupas de Cria");
  assert.ok(titles.some(t => t.includes("Male") || t.includes("Packs") || t.includes("Clothing")), "Doit contenir des packs FiveM de vêtements");
  assert.ok(titles.some(t => t.includes("Template") || t.includes("Menu")), "Doit contenir un template/menu de vêtements");
});

test("FiveM: formatFivemClothingEmbed formats clothing details and download buttons", () => {
  const mockGuild = { iconURL: () => "https://example.com/icon.png", emojis: { cache: new Map() } };
  const mockClient = { user: { displayAvatarURL: () => "https://example.com/bot.png" } };

  const testPack = BRAZIL_PVP_CLOTHING_PACKS[0];
  const { embed, row } = formatFivemClothingEmbed(testPack, mockGuild, mockClient);
  const data = embed.data;

  assert.ok(data.title.includes(testPack.title));
  assert.ok(data.description.includes(testPack.category));
  assert.ok(data.description.includes(testPack.optimization));
  assert.ok(row, "Des boutons de téléchargement doivent être générés");
  assert.ok(row.components.length >= 1);
  assert.ok(row.components[0].data.label.includes("Télécharger"));
});

test("FiveM Citizens: /citizens, /check-citizens, /setup-citizens, /post-citizen commands are defined", () => {
  const citizensCmd = commands.find(c => c.name === "citizens");
  assert.ok(citizensCmd, "La commande /citizens doit exister");
  assert.ok(citizensCmd.options.some(o => o.name === "categorie"), "L'option 'categorie' doit exister sur /citizens");

  const checkCitizensCmd = commands.find(c => c.name === "check-citizens");
  assert.ok(checkCitizensCmd, "La commande /check-citizens doit exister");

  const setupCitizensCmd = commands.find(c => c.name === "setup-citizens");
  assert.ok(setupCitizensCmd, "La commande /setup-citizens doit exister");

  const postCitizenCmd = commands.find(c => c.name === "post-citizen");
  assert.ok(postCitizenCmd, "La commande /post-citizen doit exister");
  assert.ok(postCitizenCmd.options.some(o => o.name === "titre"));
  assert.ok(postCitizenCmd.options.some(o => o.name === "image"));
  assert.ok(postCitizenCmd.options.some(o => o.name === "lien"));
});

test("FiveM Citizens: CURATED_FIVEM_CITIZENS contains comprehensive in-game PvP packs", () => {
  assert.ok(CURATED_FIVEM_CITIZENS.length >= 6, "Le showroom doit contenir au moins 6 citizens essentiels");
  const categories = CURATED_FIVEM_CITIZENS.map(c => c.category);
  assert.ok(categories.some(c => c.includes("FPS")), "Doit contenir un citizen axé FPS boost");
  assert.ok(categories.some(c => c.includes("Galaxy") || c.includes("Ciel")), "Doit contenir un citizen ciel galaxy / nuit");
  assert.ok(categories.some(c => c.includes("Blood") || c.includes("Tir")), "Doit contenir un citizen blood fx / tracers");

  for (const c of CURATED_FIVEM_CITIZENS) {
    assert.ok(c.image, `Le citizen ${c.id} doit obligatoirement avoir une image in-game`);
    assert.ok(c.downloadUrl, `Le citizen ${c.id} doit avoir un lien de téléchargement`);
    assert.ok(c.fpsBoost, `Le citizen ${c.id} doit avoir une mention FPS boost`);
  }
});

test("FiveM Citizens: formatCitizenEmbed formats showcase card with in-game preview and buttons", () => {
  const mockGuild = { iconURL: () => "https://example.com/icon.png", emojis: { cache: new Map() } };
  const mockClient = { user: { displayAvatarURL: () => "https://example.com/bot.png" } };

  const testCitizen = CURATED_FIVEM_CITIZENS[0];
  const { embed, row } = formatCitizenEmbed(testCitizen, mockGuild, mockClient);
  const data = embed.data;

  assert.ok(data.title.includes(testCitizen.title));
  assert.ok(data.description.includes(testCitizen.fpsBoost));
  assert.equal(data.image.url, testCitizen.image, "L'image in-game doit être définie sur l'embed");
  assert.ok(row, "Un ActionRow avec boutons doit être généré");
  assert.ok(row.components.some(b => b.data.label.includes("Télécharger")), "Bouton de téléchargement présent");
});

test("FiveM Citizens: database tracking prevents duplicate citizen posts", () => {
  const testId = `test_citizen_${Date.now()}`;
  assert.equal(isFivemCitizenPosted(testId), false, "Le citizen ne doit pas être marqué posté avant insertion");

  recordFivemCitizenPost(testId, "Ultra Test Citizen", "FPS Boost", "+40 FPS", "https://example.com/download");
  assert.equal(isFivemCitizenPosted(testId), true, "Le citizen doit être marqué posté après insertion");
});





