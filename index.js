const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { Shoukaku, Connectors } = require('shoukaku');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1499113326020399276";

// 👉 Lavalink сервер (публичный тестовый)
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

client.on('ready', () => {
  console.log(`✅ Бот онлайн: ${client.user.tag}`);
});

// 🎵 PLAY COMMAND
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'play') {
    await interaction.deferReply();

    const query = interaction.options.getString('url');
    const voice = interaction.member.voice.channel;

    if (!voice) return interaction.editReply("❌ зайди в войс");

    const player = await shoukaku.joinVoiceChannel({
      guildId: interaction.guild.id,
      channelId: voice.id,
      shardId: 0
    });

    const result = await shoukaku.rest.resolve(query);

    if (!result?.tracks.length)
      return interaction.editReply("❌ трек не найден");

    const track = result.tracks[0];

    player.playTrack(track);

    return interaction.editReply("🎵 играет музыка");
  }
});

// 🔥 slash команда
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('играть музыку')
    .addStringOption(opt =>
      opt.setName('url')
        .setDescription('ссылка или название')
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log("✅ Slash команды загружены");
})();

client.login(TOKEN);
