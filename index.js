require("dns").setDefaultResultOrder("ipv4first");

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { DisTube } = require("distube");
const { YtDlpPlugin } = require("@distube/yt-dlp");
const { SoundCloudPlugin } = require("@distube/soundcloud");
const ffmpegPath = require("ffmpeg-static");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || "1499113326020399276";

if (!TOKEN) {
  console.error("❌ TOKEN не задан. Добавь TOKEN в Secrets.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages]
});

client.distube = new DisTube(client, {
  emitNewSongOnly: true,
  ffmpeg: { path: ffmpegPath },
  plugins: [new SoundCloudPlugin(), new YtDlpPlugin()]
});

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} запущен`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === "play") {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply("❌ Зайди в голосовой канал");
    const query = interaction.options.getString("query");
    await interaction.deferReply();
    try {
      await client.distube.play(voiceChannel, query, { textChannel: interaction.channel, member: interaction.member });
      interaction.editReply(`🎵 Ищу и играю: **${query}**`);
    } catch (e) {
      console.error(e);
      interaction.editReply(`❌ Ошибка: ${e.message}`);
    }
  }

  if (commandName === "skip") {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue) return interaction.reply("❌ Ничего не играет");
    await client.distube.skip(interaction.guild);
    interaction.reply("⏭ Пропущено");
  }

  if (commandName === "stop") {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue) return interaction.reply("❌ Ничего не играет");
    await client.distube.stop(interaction.guild);
    interaction.reply("⏹ Остановлено");
  }

  if (commandName === "pause") {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue) return interaction.reply("❌ Ничего не играет");
    await client.distube.pause(interaction.guild);
    interaction.reply("⏸ Пауза");
  }

  if (commandName === "resume") {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue) return interaction.reply("❌ Ничего не играет");
    await client.distube.resume(interaction.guild);
    interaction.reply("▶ Продолжаю");
  }

  if (commandName === "queue") {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue) return interaction.reply("📭 Очередь пуста");
    const embed = new EmbedBuilder()
      .setTitle("🎵 Очередь")
      .setDescription(queue.songs.map((s, i) => `${i+1}. ${s.name} - \`${s.formattedDuration}\``).slice(0,10).join("\n") || "Пусто")
      .setColor("#6a0dad");
    interaction.reply({ embeds: [embed] });
  }
});

client.distube.on("playSong", (queue, song) => {
  const embed = new EmbedBuilder()
    .setTitle("🎶 Сейчас играет")
    .setDescription(`**${song.name}**`)
    .setColor("#6a0dad");
  queue.textChannel.send({ embeds: [embed] });
});

client.distube.on("error", (channel, error) => {
  console.error("DisTube error:", error);
  if (channel) channel.send("❌ Ошибка при воспроизведении.");
});

const commands = [
  new SlashCommandBuilder().setName("play").setDescription("Включить музыку").addStringOption(opt => opt.setName("query").setDescription("Название или ссылка").setRequired(true)),
  new SlashCommandBuilder().setName("skip").setDescription("Пропустить трек"),
  new SlashCommandBuilder().setName("stop").setDescription("Остановить музыку"),
  new SlashCommandBuilder().setName("pause").setDescription("Пауза"),
  new SlashCommandBuilder().setName("resume").setDescription("Снять паузу"),
  new SlashCommandBuilder().setName("queue").setDescription("Показать очередь")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Команды загружены");
  } catch (err) {
    console.error("Ошибка команд:", err);
  }
})();

client.login(TOKEN);
