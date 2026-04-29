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

// 🔥 Lavalink (может быть заменён позже на свой)
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

// 🎧 QUEUE
const queue = new Map();

// ================= READY =================
client.once("ready", () => {
  console.log(`🌙 NightSector Online: ${client.user.tag}`);
});

// ================= UI =================
function nowPlayingEmbed(track, user) {
  return new EmbedBuilder()
    .setTitle("🎵 Now Playing")
    .setDescription(`**${track.info.title}**`)
    .addFields(
      { name: "Duration", value: `${Math.floor(track.info.length / 60000)}m`, inline: true },
      { name: "Requested by", value: user, inline: true }
    )
    .setColor("#6a0dad")
}

// ================= BUTTONS =================
function controls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pause")
      .setLabel("⏸ Pause")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("resume")
      .setLabel("▶ Resume")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("skip")
      .setLabel("⏭ Skip")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("stop")
      .setLabel("⏹ Stop")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("like")
      .setLabel("❤️ Like")
      .setStyle(ButtonStyle.Secondary)
  );
}

// ================= INTERACTION =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const voice = interaction.member.voice.channel;

  // ================= PLAY =================
  if (interaction.commandName === "play") {
    await interaction.deferReply();

    if (!voice) return interaction.editReply("❌ зайди в войс");

    const query = interaction.options.getString("url");

    const player = await shoukaku.joinVoiceChannel({
      guildId: interaction.guild.id,
      channelId: voice.id,
      shardId: 0
    });

    const result = await shoukaku.rest.resolve(`ytsearch:${query}`);

    if (!result?.tracks?.length)
      return interaction.editReply("❌ трек не найден");

    const track = result.tracks[0];

    queue.set(interaction.guild.id, {
      player,
      track
    });

    await player.playTrack(track);

    return interaction.editReply({
      embeds: [nowPlayingEmbed(track, interaction.user.tag)],
      components: [controls()]
    });
  }

  // ================= BUTTONS =================
  if (interaction.isButton()) {
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

    if (interaction.customId === "like") {
      return interaction.reply("❤️ added to likes");
    }
  }
});

// ================= SLASH =================
const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("play music")
    .addStringOption(o =>
      o.setName("url")
        .setDescription("song or link")
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log("✅ NightSector commands loaded");
})();

client.login(TOKEN);
