const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { Shoukaku, Connectors } = require('shoukaku');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1499113326020399276";

// ⚠️ ВРЕМЕННОЙ NODE (если он мёртв — всё равно будет ошибка, но бот не упадёт)
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

// 📡 статус Lavalink
shoukaku.on("ready", () => {
  console.log("✅ Lavalink подключен");
});

shoukaku.on("error", (name, err) => {
  console.log("❌ Lavalink error:", err.message || err);
});

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// 🎵 PLAY
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "play") {
    await interaction.deferReply();

    const query = interaction.options.getString("url");
    const voice = interaction.member.voice.channel;

    if (!voice) {
      return interaction.editReply("❌ зайди в войс");
    }

    let player;

    try {
      player = await shoukaku.joinVoiceChannel({
        guildId: interaction.guild.id,
        channelId: voice.id,
        shardId: 0
      });
    } catch (e) {
      console.log("VOICE JOIN ERROR:", e);
      return interaction.editReply("❌ не удалось зайти в войс (Lavalink не отвечает)");
    }

    let result;

    try {
      result = await shoukaku.rest.resolve(`ytsearch:${query}`);
    } catch (e) {
      console.log("RESOLVE ERROR:", e);
      return interaction.editReply("❌ поиск трека не работает (Lavalink)");
    }

    if (!result?.tracks?.length) {
      return interaction.editReply("❌ трек не найден");
    }

    const track = result.tracks[0];

    try {
      await player.playTrack(track);
    } catch (e) {
      console.log("PLAY ERROR:", e);
      return interaction.editReply("❌ ошибка воспроизведения (сервер недоступен)");
    }

    return interaction.editReply(`🎵 играет: **${track.info.title}**`);
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
