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
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName !== "play") return;

    await interaction.deferReply();

    const voice = interaction.member.voice.channel;
    if (!voice) return interaction.editReply("❌ зайди в войс");

    const query = interaction.options.getString("url");

    // 🔥 JOIN VOICE SAFE
    let player;
    try {
      player = await shoukaku.joinVoiceChannel({
        guildId: interaction.guild.id,
        channelId: voice.id,
        shardId: 0
      });
    } catch (e) {
      console.log("VOICE ERROR:", e);
      return interaction.editReply("❌ Lavalink не отвечает / не может зайти в войс");
    }

    // 🔥 SEARCH SAFE
    let result;
    try {
      result = await shoukaku.rest.resolve(`ytsearch:${query}`);
    } catch (e) {
      console.log("RESOLVE ERROR:", e);
      return interaction.editReply("❌ ошибка поиска трека");
    }

    if (!result?.tracks?.length) {
      return interaction.editReply("❌ трек не найден");
    }

    const track = result.tracks[0];

    let server = queue.get(interaction.guild.id);

    if (!server) {
      server = {
        player,
        songs: [],
        loop: false,
        user: interaction.user.tag
      };
      queue.set(interaction.guild.id, server);
    }

    server.songs.push(track);

    try {
      if (server.songs.length === 1) {
        await player.playTrack(track);

        return interaction.editReply({
          embeds: [nowPlaying(track, interaction.user.tag)],
          components: [controls()]
        });
      }

      return interaction.editReply(`➕ добавлено в очередь: **${track.info.title}**`);
    } catch (e) {
      console.log("PLAY ERROR:", e);
      return interaction.editReply("❌ ошибка воспроизведения");
    }

  } catch (err) {
    console.log("GLOBAL ERROR:", err);
    if (!interaction.replied) {
      await interaction.reply("❌ критическая ошибка");
    }
  }
});

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
