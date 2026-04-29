const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { Shoukaku, Connectors } = require('shoukaku');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1499113326020399276";

// 🔥 СТАБИЛЬНЫЙ NODE (оставляем твой, но логика теперь безопаснее)
const nodes = [
  {
    name: "main",
    url: "lavalink.oops.wtf:443",
    auth: "www.freelavalink.ga",
    secure: true
  }
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes);

// 📡 лог подключения
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

      // 🔥 поиск трека
      const result = await shoukaku.rest.resolve(query);

      if (!result || !result.tracks || result.tracks.length === 0) {
        return interaction.editReply("❌ трек не найден (попробуй название или ссылку)");
      }

      const track = result.tracks[0];

      await player.playTrack(track);

      return interaction.editReply(`🎵 играет: **${track.info.title}**`);

    } catch (err) {
      console.log("PLAY ERROR:", err);
      return interaction.editReply("❌ ошибка воспроизведения (Lavalink)");
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
        .setDescription('ссылка или название')
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
