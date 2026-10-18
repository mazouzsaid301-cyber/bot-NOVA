const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

async function run() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  await client.login(process.env.DISCORD_TOKEN);
  console.log(`[Role Setup] Connecté en tant que ${client.user.tag}`);

  const guild = client.guilds.cache.get(process.env.GUILD_ID || "1045720459821453313");
  if (!guild) {
    console.error("[Role Setup] Serveur introuvable");
    process.exit(1);
  }

  const me = await guild.members.fetchMe();
  if (!me.permissions.has("ManageRoles") && !me.permissions.has("Administrator")) {
    console.warn("==================================================================");
    console.warn("[Role Setup] ⚠️ Le bot n'a pas la permission 'Gérer les rôles' (ManageRoles) ou 'Administrateur'.");
    console.warn("Veuillez donner le rôle 'Security' au bot dans Discord.");
    console.warn("En attente de l'attribution du rôle...");
    console.warn("==================================================================");

    // Wait until role is granted
    await new Promise((resolve) => {
      const check = setInterval(async () => {
        const updatedMe = await guild.members.fetchMe();
        if (updatedMe.permissions.has("ManageRoles") || updatedMe.permissions.has("Administrator")) {
          clearInterval(check);
          resolve();
        }
      }, 3000);
    });
  }

  console.log("[Role Setup] Permissions validées !");

  // 1. Check or create role
  let role = guild.roles.cache.find(r => r.name === "👥・Members" || r.name === "Members" || r.name === "Everyone");
  if (!role) {
    console.log("[Role Setup] Création du rôle '👥・Members'...");
    role = await guild.roles.create({
      name: "👥・Members",
      color: "#5865F2",
      hoist: true,
      mentionable: false,
      reason: "Rôle automatique pour tous les membres du serveur"
    });
    console.log(`[Role Setup] Rôle créé avec succès (ID: ${role.id})`);
  } else {
    console.log(`[Role Setup] Rôle existant trouvé : ${role.name} (ID: ${role.id})`);
  }

  // 2. Fetch all members via REST and assign role
  console.log("[Role Setup] Récupération de la liste des membres...");
  const members = await guild.members.list({ limit: 1000 });
  console.log(`[Role Setup] ${members.size} membres trouvés. Attribution du rôle en cours...`);

  let addedCount = 0;
  let alreadyHasCount = 0;
  let failedCount = 0;

  for (const [, member] of members) {
    if (member.user.bot) continue; // Optionnel : ignorer les bots
    if (member.roles.cache.has(role.id)) {
      alreadyHasCount++;
      continue;
    }
    try {
      await member.roles.add(role.id);
      addedCount++;
      process.stdout.write(`\r[Role Setup] Progression : ${addedCount + alreadyHasCount}/${members.size}`);
    } catch (err) {
      failedCount++;
    }
  }

  console.log("\n==================================================================");
  console.log(`[Role Setup] Terminé avec succès !`);
  console.log(`  - Rôle : ${role.name} (${role.id})`);
  console.log(`  - Nouveaux membres ayant reçu le rôle : ${addedCount}`);
  console.log(`  - Membres qui l'avaient déjà : ${alreadyHasCount}`);
  if (failedCount > 0) console.log(`  - Échecs (hiérarchie ou permissions) : ${failedCount}`);
  console.log("==================================================================");

  process.exit(0);
}

run().catch(err => {
  console.error("[Role Setup] Erreur :", err);
  process.exit(1);
});
