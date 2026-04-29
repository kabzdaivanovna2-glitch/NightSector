const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { Shoukaku, Connectors } = require('shoukaku');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1499113326020399276";

/* 🔥 СТАБИЛЬНЫЙ NODE (замена) */
const nodes = [
  {
    name: "main",
    url: "lava.link:80",
    auth: "youshallnotpass",
    secure: false
  }
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes);

// 📡 Lavalink events
shoukaku.on('ready', (name) => {
  console.log(`✅ Lavalink подключен: ${name}`);
});

shoukaku.on('error', (name, error) => {
  console.log(`❌ Lavalink ошибка [${name}]:`, error);
});

client.once('ready', () => {
  console.log(`✅ Бот онлайн: ${client.user.tag}`);
});

// 🎵 PLAY COMMAND
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'play') {
    await interaction.deferReply();

    try {
      const query = interaction.options.getString('url');
      const voice = interaction.member.voice.channel;

      if (!voice) {
        return interaction.editReply("❌ зайди в войс");
      }

      const player = await shoukaku.joinVoiceChannel({
        guildId: interaction.guild.id,
        channelId: voice.id,
        shardId: 0
      });

      /* 🔥 ВАЖНО: теперь правильный поиск */
      const result = await shoukaku.rest.resolve(`ytsearch:${query}`);

      if (!result?.tracks?.length) {
        return interaction.editReply("❌ трек не найден");
      }

      const track = result.tracks[0];

      await player.playTrack(track);

      return interaction.editReply(`🎵 играет: **${track.info.title}**`);

    } catch (err) {
      console.log("PLAY ERROR:", err);
      return interaction.editReply("❌ ошибка воспроизведения");
    }
  }
});

// 🔥 slash команда
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('включить музыку')
    .addStringOption(opt =>
      opt.setName('url')
        .setDescription('название или ссылка')
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash команды загружены");
  } catch (err) {
    console.log("COMMAND ERROR:", err);
  }
});

client.login(TOKEN);
