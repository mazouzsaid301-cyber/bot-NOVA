const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

async function run() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  await client.login(process.env.DISCORD_TOKEN);
  console.log(`[Brotherhood Setup] Connecté en tant que ${client.user.tag}`);

  const guild = client.guilds.cache.get(process.env.GUILD_ID || "1045720459821453313");
  if (!guild) {
    console.error("[Brotherhood Setup] Serveur introuvable");
    process.exit(1);
  }

  // 1. Update Category Name
  const cat = guild.channels.cache.get("1448446718348886177");
  if (cat) {
    console.log(`[Brotherhood Setup] Mise à jour du nom de la catégorie...`);
    await cat.setName("🛡️ · 〢 BROTHERHOODS HUB");
  }

  // 2. Mapping of channels to their new clean names
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

  console.log(`[Brotherhood Setup] Mise à jour des salons...`);
  for (const item of channelUpdates) {
    const ch = guild.channels.cache.get(item.id) || await guild.channels.fetch(item.id).catch(() => null);
    if (ch) {
      if (ch.name !== item.name) {
        await ch.setName(item.name);
        console.log(`  ✓ Mis à jour : ${ch.name} -> ${item.name}`);
      } else {
        console.log(`  - Déjà à jour : ${item.name}`);
      }
    }
  }

  console.log("==================================================================");
  console.log("[Brotherhood Setup] ✨ Espace BROTHERHOODS HUB harmonisé avec succès !");
  console.log("==================================================================");
  process.exit(0);
}

run().catch(err => {
  console.error("[Brotherhood Setup] Erreur :", err);
  process.exit(1);
});
