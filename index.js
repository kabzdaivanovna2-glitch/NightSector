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

// 🎧 QUEUE SYSTEM
const queue = new Map();

// ================= NOW PLAYING =================
function nowPlaying(track, user) {
  return new EmbedBuilder()
    .setTitle("🎵 Now Playing - NightSector")
    .setDescription(`**${track.info.title}**`)
    .addFields(
      { name: "Duration", value: `${Math.floor(track.info.length / 60000)} min`, inline: true },
      { name: "Requested by", value: user, inline: true }
    )
    .setColor("#6a0dad");
}

// ================= BUTTONS =================
function controls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("pause").setLabel("⏸").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("resume").setLabel("▶").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("skip").setLabel("⏭").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("stop").setLabel("⏹").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("loop").setLabel("🔁").setStyle(ButtonStyle.Secondary)
  );
}

// ================= READY =================
client.once("ready", () => {
  console.log(`🌙 NightSector PRO Online: ${client.user.tag}`);
});

// ================= PLAY NEXT =================
async function playNext(guildId, channel) {
  const server = queue.get(guildId);
  if (!server) return;

  const track = server.songs.shift();
  if (!track) {
    queue.delete(guildId);
    return;
  }

  try {
    await server.player.playTrack(track);

    channel.send({
      embeds: [nowPlaying(track, server.user)],
      components: [controls()]
    });
  } catch (e) {
    console.log(e);
  }
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async (interaction) => {
  const voice = interaction.member.voice.channel;

  // ================= PLAY =================
  if (interaction.isChatInputCommand() && interaction.commandName === "play") {
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

    if (server.songs.length === 1) {
      await player.playTrack(track);

      return interaction.editReply({
        embeds: [nowPlaying(track, interaction.user.tag)],
        components: [controls()]
      });
    }

    return interaction.editReply(`➕ добавлено в очередь: **${track.info.title}**`);
  }

  // ================= BUTTONS =================
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

  if (interaction.customId === "loop") {
    server.loop = !server.loop;
    return interaction.reply(`🔁 loop: ${server.loop}`);
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
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log("✅ NightSector PRO commands loaded");
})();

client.login(TOKEN);
