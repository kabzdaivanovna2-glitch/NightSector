const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { Shoukaku, Connectors } = require('shoukaku');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1499113326020399276";

// 🔥 Lavalink node
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

// 📡 Lavalink status
shoukaku.on("ready", () => {
  console.log("✅ Lavalink подключен");
});

shoukaku.on("error", (name, err) => {
  console.log("❌ Lavalink error:", err);
});

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// 🎵 PLAY COMMAND
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "play") {
    await interaction.deferReply();

    const query = interaction.options.getString("url");
    const voice = interaction.member.voice.channel;

    if (!voice) {
      return interaction.editReply("❌ зайди в войс");
    }

    try {
      const player = await shoukaku.joinVoiceChannel({
        guildId: interaction.guild.id,
        channelId: voice.id,
        shardId: 0
      });

      // 🔥 УЛУЧШЕННЫЙ ПОИСК (ВАЖНО)
      const result = await shoukaku.rest.resolve(`ytsearch:${query}`);

      if (!result || !result.tracks || result.tracks.length === 0) {
        return interaction.editReply("❌ трек не найден (попробуй другое название)");
      }

      const track = result.tracks[0];

      await player.playTrack(track);

      return interaction.editReply(`🎵 играет: **${track.info.title}**`);

    } catch (err) {
      console.log("PLAY ERROR:", err);
      return interaction.editReply("❌ не удалось запустить трек (ошибка Lavalink)");
    }
  }
});

// slash command
const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("музыка")
    .addStringOption(o =>
      o.setName("url")
        .setDescription("название или ссылка")
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("✅ slash готов");
  } catch (e) {
    console.log("SLASH ERROR:", e);
  }
})();

client.login(TOKEN);
