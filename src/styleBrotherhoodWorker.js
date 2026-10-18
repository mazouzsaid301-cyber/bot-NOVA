const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

async function run() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  await client.login(process.env.DISCORD_TOKEN);
  const guild = client.guilds.cache.get(process.env.GUILD_ID || "1045720459821453313");

  console.log("[Brotherhood Worker] En attente de la permission Administrateur sur le bot...");

  const attempt = async () => {
    const me = await guild.members.fetchMe();
    if (!me.permissions.has("Administrator")) {
      return false;
    }

    console.log("[Brotherhood Worker] Permission Administrateur détectée ! Application du style...");

    // 1. Rename category
    const cat = guild.channels.cache.get("1448446718348886177") || await guild.channels.fetch("1448446718348886177").catch(() => null);
    if (cat) {
      await cat.setName("🛡️ · 〢 BROTHERHOODS HUB").catch(e => console.warn("Cat error:", e.message));
      console.log("  ✓ Catégorie renommée : 🛡️ · 〢 BROTHERHOODS HUB");
    }

    // 2. Channels to rename
    const channelUpdates = [
      { id: "1448471081361997824", name: "📢︱annonces" },
      { id: "1448472752490156042", name: "📜︱family-list" },
      { id: "1448473418977771621", name: "📘︱vos-infos" },
      { id: "1448471278926303272", name: "💬︱chat-brotherhood" },
      { id: "1448471017818427505", name: "🎬︱clips" },
      { id: "1448471981748912280", name: "📸︱photos" },
      { id: "1448673293010866219", name: "🐞︱suggestions-bugs" },
      { id: "1449792779361190079", name: "⏲️︱absences" },
      { id: "1448471603255050310", name: "🔊︱Brotherhood 1" },
      { id: "1448471655734186115", name: "🔊︱Brotherhood 2" },
      { id: "1448471697111126053", name: "🔊︱Brotherhood 3" },
      { id: "1561282704123891754", name: "🔊︱Brotherhood 4" },
      { id: "1561282976170512414", name: "🔊︱Brotherhood 5" }
    ];

    for (const item of channelUpdates) {
      const ch = guild.channels.cache.get(item.id) || await guild.channels.fetch(item.id).catch(() => null);
      if (ch) {
        await ch.setName(item.name).catch(e => console.warn(`Erreur ${item.name}:`, e.message));
        console.log(`  ✓ Salon renommé : ${item.name}`);
      }
    }

    console.log("==================================================================");
    console.log("[Brotherhood Worker] ✨ Espace BROTHERHOODS HUB entièrement harmonisé !");
    console.log("==================================================================");
    return true;
  };

  const done = await attempt();
  if (done) process.exit(0);

  const interval = setInterval(async () => {
    const success = await attempt();
    if (success) {
      clearInterval(interval);
      process.exit(0);
    }
  }, 3000);
}

run();
