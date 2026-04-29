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

// Lavalink node (замени на свой рабочий при необходимости)
const nodes = [
  {
    name: "main",
    url: "lavalink.oops.wtf:2333",     // публичный тестовый лавалайн (рабочий)
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

// Хранилище очередей: guildId -> { player, queue: [], currentTrack, textChannel }
const queues = new Map();

// ------------------- Вспомогательные функции -------------------
function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, { queue: [], currentTrack: null, player: null, textChannel: null });
  }
  return queues.get(guildId);
}

async function playNext(guildId) {
  const data = getQueue(guildId);
  const player = data.player;
  if (!player) return;

  if (data.queue.length === 0) {
    // Очередь пуста – отключаемся через 10 секунд
    data.currentTrack = null;
    setTimeout(async () => {
      const current = getQueue(guildId);
      if (current.queue.length === 0 && current.player) {
        await current.player.destroy();
        queues.delete(guildId);
      }
    }, 10000);
    return;
  }

  const nextTrack = data.queue.shift();
  data.currentTrack = nextTrack;
  await player.playTrack(nextTrack);

  // Отправляем now playing в текстовый канал
  const embed = new EmbedBuilder()
    .setTitle("🎵 Now Playing")
    .setDescription(`**${nextTrack.info.title}**`)
    .addFields(
      { name: "Duration", value: `${Math.floor(nextTrack.info.length / 60000)} min`, inline: true },
      { name: "Requested by", value: nextTrack.requester || "Unknown", inline: true }
    )
    .setColor("#6a0dad")
    .setFooter({ text: "NightSector Music Bot" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("pause").setLabel("⏸").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("resume").setLabel("▶").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("skip").setLabel("⏭").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("stop").setLabel("⏹").setStyle(ButtonStyle.Danger)
  );

  if (data.textChannel) {
    await data.textChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
  }
}

// ------------------- Обработка команд -------------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // ---------- Кнопки ----------
  if (interaction.isButton()) {
    const guildId = interaction.guild.id;
    const data = getQueue(guildId);
    const player = data.player;

    if (!player || !player.connected) {
      return interaction.reply({ content: "❌ Сейчас ничего не играет.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    switch (interaction.customId) {
      case "pause":
        await player.setPaused(true);
        await interaction.editReply("⏸ Пауза");
        break;
      case "resume":
        await player.setPaused(false);
        await interaction.editReply("▶ Продолжаю");
        break;
      case "skip":
        await player.stopTrack();
        await interaction.editReply("⏭ Трек пропущен");
        break;
      case "stop":
        await player.destroy();
        queues.delete(guildId);
        await interaction.editReply("⏹ Остановлено, очередь очищена");
        break;
    }
    return;
  }

  // ---------- Команды ----------
  const { commandName } = interaction;

  // /play
  if (commandName === "play") {
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply("❌ Сначала зайди в голосовой канал.");
    }

    const query = interaction.options.getString("url");
    let player = shoukaku.players.get(interaction.guild.id);

    // Если плеера нет – создаём и подключаемся
    if (!player) {
      try {
        player = await shoukaku.joinVoiceChannel({
          guildId: interaction.guild.id,
          channelId: voiceChannel.id,
          shardId: 0
        });
      } catch (err) {
        console.error("Join error:", err);
        return interaction.editReply("❌ Не удалось подключиться к голосовому каналу. Проверь Lavalink.");
      }
    }

    // Поиск трека
    let result;
    try {
      result = await shoukaku.rest.resolve(`ytsearch:${query}`);
    } catch (err) {
      console.error("Search error:", err);
      return interaction.editReply("❌ Ошибка при поиске трека.");
    }

    if (!result || !result.tracks.length) {
      return interaction.editReply("❌ Ничего не найдено.");
    }

    const track = result.tracks[0];
    const guildQueue = getQueue(interaction.guild.id);
    guildQueue.player = player;
    guildQueue.textChannel = interaction.channel;

    // Добавляем информацию о запросившем
    track.requester = interaction.user.tag;

    // Если ничего не играет – стартуем сразу
    if (!guildQueue.currentTrack && !player.playing) {
      guildQueue.currentTrack = track;
      await player.playTrack(track);
      const embed = new EmbedBuilder()
        .setTitle("🎶 Сейчас играет")
        .setDescription(`**${track.info.title}**`)
        .addFields(
          { name: "Длительность", value: `${Math.floor(track.info.length / 60000)} мин`, inline: true },
          { name: "Запросил", value: track.requester, inline: true }
        )
        .setColor("#6a0dad");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("pause").setLabel("⏸").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("resume").setLabel("▶").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("skip").setLabel("⏭").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("stop").setLabel("⏹").setStyle(ButtonStyle.Danger)
      );
      await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
      // Добавляем в очередь
      guildQueue.queue.push(track);
      await interaction.editReply(`✅ **${track.info.title}** добавлен в очередь. Позиция: ${guildQueue.queue.length}`);
    }
  }

  // /skip
  else if (commandName === "skip") {
    await interaction.deferReply();
    const player = shoukaku.players.get(interaction.guild.id);
    if (!player || !player.playing) {
      return interaction.editReply("❌ Ничего не играет.");
    }
    await player.stopTrack();
    interaction.editReply("⏭ Трек пропущен.");
  }

  // /stop
  else if (commandName === "stop") {
    await interaction.deferReply();
    const player = shoukaku.players.get(interaction.guild.id);
    if (!player) return interaction.editReply("❌ Ничего не играет.");
    await player.destroy();
    queues.delete(interaction.guild.id);
    interaction.editReply("⏹ Музыка остановлена, очередь очищена.");
  }

  // /pause
  else if (commandName === "pause") {
    await interaction.deferReply();
    const player = shoukaku.players.get(interaction.guild.id);
    if (!player || !player.playing) return interaction.editReply("❌ Ничего не играет.");
    await player.setPaused(true);
    interaction.editReply("⏸ Пауза.");
  }

  // /resume
  else if (commandName === "resume") {
    await interaction.deferReply();
    const player = shoukaku.players.get(interaction.guild.id);
    if (!player || !player.playing) return interaction.editReply("❌ Ничего не играет.");
    await player.setPaused(false);
    interaction.editReply("▶ Продолжаю.");
  }

  // /queue
  else if (commandName === "queue") {
    await interaction.deferReply();
    const data = getQueue(interaction.guild.id);
    if (!data.currentTrack && data.queue.length === 0) {
      return interaction.editReply("📭 Очередь пуста.");
    }
    let list = `**Сейчас играет:** ${data.currentTrack?.info.title || "—"}\n\n**Очередь:**\n`;
    data.queue.slice(0, 10).forEach((t, i) => {
      list += `${i + 1}. ${t.info.title}\n`;
    });
    if (data.queue.length > 10) list += `\n*и ещё ${data.queue.length - 10} треков*`;
    interaction.editReply(list);
  }
});

// ------------------- События плеера (конец трека, ошибка) -------------------
shoukaku.on("trackEnd", (player, track, reason) => {
  if (reason === "REPLACED") return;
  const guildId = player.connection.guildId;
  playNext(guildId);
});

shoukaku.on("error", (_, error) => {
  console.error("Lavalink error:", error);
});

// ------------------- Регистрация slash-команд -------------------
const commands = [
  new SlashCommandBuilder().setName("play").setDescription("Включить музыку").addStringOption(opt => opt.setName("url").setDescription("Название трека или ссылка").setRequired(true)),
  new SlashCommandBuilder().setName("skip").setDescription("Пропустить текущий трек"),
  new SlashCommandBuilder().setName("stop").setDescription("Остановить музыку и очистить очередь"),
  new SlashCommandBuilder().setName("pause").setDescription("Поставить на паузу"),
  new SlashCommandBuilder().setName("resume").setDescription("Снять с паузы"),
  new SlashCommandBuilder().setName("queue").setDescription("Показать очередь треков")
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

client.login(TOKEN);
