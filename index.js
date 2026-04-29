const { Client, GatewayIntentBits } = require('discord.js');

console.log("🚀 BOT STARTING...");

console.log("TOKEN CHECK:", process.env.TOKEN ? "OK" : "MISSING");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log("✅ BOT IS ONLINE:", client.user.tag);
});

client.login(process.env.TOKEN);
