const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

async function run() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  await client.login(process.env.DISCORD_TOKEN);
  const guild = client.guilds.cache.get(process.env.GUILD_ID || "1045720459821453313");
  const channel = await guild.channels.fetch("1561275750793871480");
  const roleId = "1448445508090597437";

  console.log(`[Perms] En attente des permissions ou application directe pour le rôle ${roleId}...`);

  const apply = async () => {
    try {
      await channel.permissionOverwrites.edit(roleId, {
        ViewChannel: true,
        Connect: false
      });
      console.log("==================================================================");
      console.log("[Perms] ✅ Succès ! Le rôle ʙʀᴏᴛʜᴇʀꜱʜᴏᴏᴅ peut désormais VOIR le salon mais NE PEUT PAS s'y connecter.");
      console.log("==================================================================");
      process.exit(0);
    } catch (err) {
      if (!err.message.includes("Missing Permissions")) {
        console.error("[Perms] Erreur :", err.message);
      }
    }
  };

  await apply();
  const interval = setInterval(async () => {
    await apply();
  }, 3000);
}

run();
