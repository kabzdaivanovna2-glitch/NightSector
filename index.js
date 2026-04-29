const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;

client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.reply('🏓 pong');
  }

  if (message.content === '!hello') {
    message.reply('Привет 👋 я живой бот');
  }
});

client.login(TOKEN);
