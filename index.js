const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { DisTube } = require("distube");
const { YtDlpPlugin } = require("@distube/ytdl-core");
const { SpotifyPlugin } = require("@distube/spotify");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || "1499113326020399276";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Настройка DisTube (без внешнего Lavalink!)
client.distube = new DisTube(client, {
  leaveOnStop: true,
  leaveOnFinish: true,
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: false,
  emitAddListWhenCreatingQueue: false,
  plugins: [
    new YtDlpPlugin(),
    new SpotifyPlugin()
  ]
});

// ------------------- Обработка команд -------------------
const commands = [
  new SlashCommandBuilder().setName("play").setDescription("Включить музыку").addStringOption(opt => opt.setName("query").setDescription("Название трека или ссылка").setRequired(true)),
  new SlashCommandBuilder().setName("skip").setDescription("Пропустить текущий трек"),
  new SlashCommandBuilder().setName("stop").setDescription("Остановить музыку и очистить очередь"),
  new SlashCommandBuilder().setName("pause").setDescription("Пауза"),
  new SlashCommandBuilder().setName("resume").setDescription("Снять паузу"),
  new SlashCommandBuilder().setName("queue").setDescription("Показать очередь")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Слэш-команды загружены");
  } catch (err) {
    console.error("Ошибка регистрации команд:", err);
  }
})();

client.once("ready", () => {
  console.log(`🌙 NightSector Online: ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === "play") {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply("❌ Зайди в голосовой канал!");
    await interaction.deferReply();
    const query = interaction.options.getString("query");
    try {
      await client.distube.play(voiceChannel, query, { textChannel: interaction.channel, member: interaction.member });
      interaction.editReply(`🎵 Ищу и играю: **${query}**`);
    } catch (err) {
      console.error(err);
      interaction.editReply("❌ Ошибка воспроизведения.");
    }
  }
  else if (commandName === "skip") {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue) return interaction.reply("❌ Ничего не играет.");
    await client.distube.skip(interaction.guild);
    interaction.reply("⏭ Пропущено.");
  }
  else if (commandName === "stop") {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue) return interaction.reply("❌ Ничего не играет.");
    await client.distube.stop(interaction.guild);
    interaction.reply("⏹ Остановлено.");
  }
  else if (commandName === "pause") {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue) return interaction.reply("❌ Ничего не играет.");
    await client.distube.pause(interaction.guild);
    interaction.reply("⏸ Пауза.");
  }
  else if (commandName === "resume") {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue) return interaction.reply("❌ Ничего не играет.");
    await client.distube.resume(interaction.guild);
    interaction.reply("▶ Продолжаю.");
  }
  else if (commandName === "queue") {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue) return interaction.reply("📭 Очередь пуста.");
    const embed = new EmbedBuilder()
      .setTitle("🎵 Очередь")
      .setDescription(queue.songs.map((song, id) => `${id+1}. ${song.name} - \`${song.formattedDuration}\``).slice(0, 10).join("\n") || "Пусто")
      .setColor("#6a0dad");
    interaction.reply({ embeds: [embed] });
  }
});

// События DisTube (по желанию)
client.distube.on("playSong", (queue, song) => {
  queue.textChannel.send({ embeds: [new EmbedBuilder().setTitle("🎶 Сейчас играет").setDescription(`**${song.name}**`).setColor("#6a0dad")] });
});

client.login(TOKEN);
