const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
require("dotenv").config();

async function run() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  await client.login(process.env.DISCORD_TOKEN);
  console.log(`[Voice Setup] Connecté en tant que ${client.user.tag}`);

  const guild = client.guilds.cache.get(process.env.GUILD_ID || "1045720459821453313");
  if (!guild) {
    console.error("[Voice Setup] Serveur introuvable");
    process.exit(1);
  }

  const me = await guild.members.fetchMe();
  if (!me.permissions.has("ManageChannels") && !me.permissions.has("Administrator")) {
    console.warn("==================================================================");
    console.warn("[Voice Setup] ⚠️ Le bot n'a pas la permission 'Gérer les salons' (ManageChannels) ou 'Administrateur'.");
    console.warn("Veuillez donner le rôle 'Security' au bot dans Discord pour appliquer l'organisation.");
    console.warn("En attente de l'attribution du rôle...");
    console.warn("==================================================================");

    await new Promise((resolve) => {
      const check = setInterval(async () => {
        const updatedMe = await guild.members.fetchMe();
        if (updatedMe.permissions.has("ManageChannels") || updatedMe.permissions.has("Administrator")) {
          clearInterval(check);
          resolve();
        }
      }, 3000);
    });
  }

  console.log("[Voice Setup] Permissions validées ! Début de l'organisation des salons vocaux...");

  // 1. Fetch all channels
  await guild.channels.fetch();

  // Find or update categories
  let voiceCategory = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && (c.name.includes("Voice") || c.name.includes("PVP")));
  if (!voiceCategory) {
    voiceCategory = await guild.channels.create({
      name: "🎮・PVP & GAMING",
      type: ChannelType.GuildCategory
    });
  } else {
    await voiceCategory.setName("🎮・PVP & GAMING").catch(() => {});
  }

  let publicCategory = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes("Public Space"));
  let brotherhoodCategory = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes("ʙʀᴏᴛʜᴇʀʜᴏᴏᴅ"));
  let vipCategory = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes("Space") && !c.name.includes("Public"));
  let afkCategory = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes("Away"));

  // 2. Define PVP / Gaming voice channels specifications
  const pvpChannels = [
    { name: "🔊︱Duo 1", userLimit: 2 },
    { name: "🔊︱Duo 2", userLimit: 2 },
    { name: "🔊︱Trio 1", userLimit: 3 },
    { name: "🔊︱Squad 1", userLimit: 4 },
    { name: "🔊︱Squad 2", userLimit: 4 },
  ];

  console.log("[Voice Setup] Configuration des salons PVP & Gaming (Duo, Trio, Squad)...");
  for (const spec of pvpChannels) {
    let existing = guild.channels.cache.find(c => c.type === ChannelType.GuildVoice && c.name === spec.name && c.parentId === voiceCategory.id);
    if (!existing) {
      existing = await guild.channels.create({
        name: spec.name,
        type: ChannelType.GuildVoice,
        parent: voiceCategory.id,
        userLimit: spec.userLimit
      });
      console.log(`  + Salon créé : ${spec.name} [limite: ${spec.userLimit}]`);
    } else {
      await existing.edit({ userLimit: spec.userLimit });
      console.log(`  ✓ Salon existant mis à jour : ${spec.name} [limite: ${spec.userLimit}]`);
    }
  }

  // 3. Clean up Public channels
  if (publicCategory) {
    console.log("[Voice Setup] Uniformisation des salons publics...");
    const publicVoices = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.parentId === publicCategory.id).toJSON();
    const publicNames = ["🎤︱Public Lounge 1", "🎤︱Public Lounge 2", "🎮︱Gaming Chill"];
    for (let i = 0; i < publicVoices.length; i++) {
      const v = publicVoices[i];
      const targetName = publicNames[i] || `🎤︱Public Lounge ${i + 1}`;
      if (v.name !== targetName) {
        await v.setName(targetName).catch(() => {});
        console.log(`  ✓ Renommé : ${v.name} -> ${targetName}`);
      }
    }
  }

  // 4. Clean up Brotherhood channels
  if (brotherhoodCategory) {
    console.log("[Voice Setup] Organisation des salons Brotherhood...");
    const bhVoices = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.parentId === brotherhoodCategory.id).toJSON();
    for (let i = 0; i < bhVoices.length; i++) {
      const v = bhVoices[i];
      const targetName = `🔊︱Brotherhood ${i + 1}`;
      if (v.name !== targetName) {
        await v.setName(targetName).catch(() => {});
        console.log(`  ✓ Renommé : ${v.name} -> ${targetName}`);
      }
    }
  }

  // 5. AFK channel
  if (afkCategory) {
    const afkVoice = guild.channels.cache.find(c => c.type === ChannelType.GuildVoice && c.parentId === afkCategory.id);
    if (afkVoice && afkVoice.name !== "🛌︱AFK Lounge") {
      await afkVoice.setName("🛌︱AFK Lounge").catch(() => {});
      console.log(`  ✓ Salon AFK mis à jour : 🛌︱AFK Lounge`);
    }
  }

  console.log("==================================================================");
  console.log("[Voice Setup] ✨ Organisation des salons vocaux PVP terminée avec succès !");
  console.log("==================================================================");
  process.exit(0);
}

run().catch(err => {
  console.error("[Voice Setup] Erreur :", err);
  process.exit(1);
});
