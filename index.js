const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { Shoukaku, Connectors } = require("shoukaku");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1499113326020399276";

// ⚠️ твой lavalink (если он мёртв — музыка НЕ будет работать)
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

// 🎧 queue
const queue = new Map();

// ================= NOW PLAYING =================
function nowPlaying(track, user) {
  return new EmbedBuilder()
    .setTitle("🎵 Now Playing - NightSector")
    .setDescription(`**${track.info.title}**`)
    .addFields(
      {
        name: "Duration",
        value: `${Math.floor(track.info.length / 60000)} min`,
        inline: true
      },
      {
        name: "Requested by",
        value: user,
        inline: true
      }
    )
    .setColor("#6a0dad");
}

// ================= BUTTONS =================
function controls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("pause").setLabel("⏸").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("resume").setLabel("▶").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("skip").setLabel("⏭").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("stop").setLabel("⏹").setStyle(ButtonStyle.Danger)
  );
}

// ================= READY =================
client.once("ready", () => {
  console.log(`🌙 NightSector Online: ${client.user.tag}`);
});

// ================= PLAY =================
if (interaction.commandName === "play") {

  // ⚠️ СРАЗУ ОТВЕТ (ВАЖНО)
  await interaction.deferReply().catch(() => {});

  const voice = interaction.member.voice.channel;
  if (!voice) {
    return interaction.editReply("❌ зайди в войс").catch(() => {});
  }

  const query = interaction.options.getString("url");

  let player;

  try {
    player = await Promise.race([
      shoukaku.joinVoiceChannel({
        guildId: interaction.guild.id,
        channelId: voice.id,
        shardId: 0
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("JOIN_TIMEOUT")), 5000)
      )
    ]);
  } catch (e) {
    console.log("VOICE FAIL:", e);
    return interaction.editReply("❌ Lavalink не отвечает (join timeout)").catch(() => {});
  }

  let result;

  try {
    result = await Promise.race([
      shoukaku.rest.resolve(`ytsearch:${query}`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SEARCH_TIMEOUT")), 5000)
      )
    ]);
  } catch (e) {
    console.log("SEARCH FAIL:", e);
    return interaction.editReply("❌ поиск завис").catch(() => {});
  }

  if (!result?.tracks?.length) {
    return interaction.editReply("❌ трек не найден").catch(() => {});
  }

  const track = result.tracks[0];

  try {
    await player.playTrack(track);
  } catch (e) {
    console.log("PLAY FAIL:", e);
    return interaction.editReply("❌ ошибка воспроизведения").catch(() => {});
  }

  return interaction.editReply(`🎵 играет: **${track.info.title}**`).catch(() => {});
}

// ================= BUTTONS =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const server = queue.get(interaction.guild.id);
  if (!server) return interaction.reply({ content: "❌ ничего не играет", ephemeral: true });

  const player = server.player;

  if (interaction.customId === "pause") {
    await player.setPaused(true);
    return interaction.reply("⏸ paused");
  }

  if (interaction.customId === "resume") {
    await player.setPaused(false);
    return interaction.reply("▶ resumed");
  }

  if (interaction.customId === "skip") {
    await player.stopTrack();
    return interaction.reply("⏭ skipped");
  }

  if (interaction.customId === "stop") {
    await player.destroy();
    queue.delete(interaction.guild.id);
    return interaction.reply("⏹ stopped");
  }
});

// ================= SLASH =================
const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("play music")
    .addStringOption(o =>
      o.setName("url")
        .setDescription("song or name")
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
    console.log("✅ NightSector slash loaded");
  } catch (e) {
    console.log("SLASH ERROR:", e);
  }
})();

client.login(TOKEN);
