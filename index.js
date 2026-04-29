const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Shoukaku, Connectors } = require("shoukaku");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || "1499113326020399276";

const nodes = [
  { name: "Node1", url: "lava-v4.rauf.wtf:2333", auth: "https://discord.gg/zZJhGjUuUN", secure: false },
  { name: "Node2", url: "lavalink-v4.radiopanel.dev:80", auth: "dasgamer", secure: false },
  { name: "Node3", url: "lavalink.kazury.cc:2333", auth: "youshallnotpass", secure: false }
];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes);
const queues = new Map();

function getQueue(guildId) {
  if (!queues.has(guildId)) queues.set(guildId, { queue: [], currentTrack: null, player: null, textChannel: null });
  return queues.get(guildId);
}

async function playNext(guildId) {
  const data = getQueue(guildId);
  const player = data.player;
  if (!player) return;
  if (data.queue.length === 0) {
    data.currentTrack = null;
    setTimeout(async () => {
      const cur = getQueue(guildId);
      if (cur.queue.length === 0 && cur.player) { await cur.player.destroy(); queues.delete(guildId); }
    }, 10000);
    return;
  }
  const nextTrack = data.queue.shift();
  data.currentTrack = nextTrack;
  await player.playTrack(nextTrack);
  const embed = new EmbedBuilder().setTitle("🎵 Now Playing").setDescription(`**${nextTrack.info.title}**`).addFields({ name: "Duration", value: `${Math.floor(nextTrack.info.length/60000)} min`, inline: true }, { name: "Requested by", value: nextTrack.requester || "Unknown", inline: true }).setColor("#6a0dad");
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("pause").setLabel("⏸").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId("resume").setLabel("▶").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("skip").setLabel("⏭").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId("stop").setLabel("⏹").setStyle(ButtonStyle.Danger));
  if (data.textChannel) await data.textChannel.send({ embeds: [embed], components: [row] }).catch(()=>{});
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
  if (interaction.isButton()) {
    const guildId = interaction.guild.id;
    const data = getQueue(guildId);
    const player = data.player;
    if (!player || !player.connected) return interaction.reply({ content: "❌ Ничего не играет.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    switch (interaction.customId) {
      case "pause": await player.setPaused(true); await interaction.editReply("⏸ Пауза"); break;
      case "resume": await player.setPaused(false); await interaction.editReply("▶ Продолжаю"); break;
      case "skip": await player.stopTrack(); await interaction.editReply("⏭ Трек пропущен"); break;
      case "stop": await player.destroy(); queues.delete(guildId); await interaction.editReply("⏹ Остановлено"); break;
    }
    return;
  }
  const { commandName } = interaction;
  if (commandName === "play") {
    await interaction.deferReply();
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.editReply("❌ Зайди в голосовой канал.");
    const query = interaction.options.getString("url");
    let player = shoukaku.players.get(interaction.guild.id);
    if (!player) {
      try { player = await shoukaku.joinVoiceChannel({ guildId: interaction.guild.id, channelId: voiceChannel.id, shardId: 0 }); }
      catch (err) { return interaction.editReply("❌ Lavalink не отвечает."); }
    }
    let result;
    try { result = await shoukaku.rest.resolve(`ytsearch:${query}`); }
    catch (err) { return interaction.editReply("❌ Ошибка поиска."); }
    if (!result?.tracks?.length) return interaction.editReply("❌ Трек не найден");
    const track = result.tracks[0];
    const guildQueue = getQueue(interaction.guild.id);
    guildQueue.player = player;
    guildQueue.textChannel = interaction.channel;
    track.requester = interaction.user.tag;
    if (!guildQueue.currentTrack && !player.playing) {
      guildQueue.currentTrack = track;
      await player.playTrack(track);
      const embed = new EmbedBuilder().setTitle("🎶 Сейчас играет").setDescription(`**${track.info.title}**`).addFields({ name: "Длительность", value: `${Math.floor(track.info.length/60000)} мин`, inline: true }, { name: "Запросил", value: track.requester, inline: true }).setColor("#6a0dad");
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("pause").setLabel("⏸").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId("resume").setLabel("▶").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("skip").setLabel("⏭").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId("stop").setLabel("⏹").setStyle(ButtonStyle.Danger));
      await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
      guildQueue.queue.push(track);
      await interaction.editReply(`✅ **${track.info.title}** добавлен в очередь. Позиция: ${guildQueue.queue.length}`);
    }
  }
  else if (commandName === "skip") {
    await interaction.deferReply();
    const player = shoukaku.players.get(interaction.guild.id);
    if (!player || !player.playing) return interaction.editReply("❌ Ничего не играет.");
    await player.stopTrack();
    interaction.editReply("⏭ Пропущено.");
  }
  else if (commandName === "stop") {
    await interaction.deferReply();
    const player = shoukaku.players.get(interaction.guild.id);
    if (!player) return interaction.editReply("❌ Ничего не играет.");
    await player.destroy();
    queues.delete(interaction.guild.id);
    interaction.editReply("⏹ Остановлено.");
  }
  else if (commandName === "pause") {
    await interaction.deferReply();
    const player = shoukaku.players.get(interaction.guild.id);
    if (!player || !player.playing) return interaction.editReply("❌ Ничего не играет.");
    await player.setPaused(true);
    interaction.editReply("⏸ Пауза.");
  }
  else if (commandName === "resume") {
    await interaction.deferReply();
    const player = shoukaku.players.get(interaction.guild.id);
    if (!player || !player.playing) return interaction.editReply("❌ Ничего не играет.");
    await player.setPaused(false);
    interaction.editReply("▶ Продолжаю.");
  }
  else if (commandName === "queue") {
    await interaction.deferReply();
    const data = getQueue(interaction.guild.id);
    if (!data.currentTrack && data.queue.length === 0) return interaction.editReply("📭 Очередь пуста.");
    let list = `**Сейчас играет:** ${data.currentTrack?.info.title || "—"}\n\n**Очередь:**\n`;
    data.queue.slice(0,10).forEach((t,i)=>{ list += `${i+1}. ${t.info.title}\n`; });
    if (data.queue.length > 10) list += `\n*и ещё ${data.queue.length-10} треков*`;
    interaction.editReply(list);
  }
});

shoukaku.on("trackEnd", (player, track, reason) => { if (reason !== "REPLACED") playNext(player.connection.guildId); });
shoukaku.on("error", (_, err) => console.error("Lavalink error:", err));

const commands = [
  new SlashCommandBuilder().setName("play").setDescription("Включить музыку").addStringOption(opt => opt.setName("url").setDescription("Название или ссылка").setRequired(true)),
  new SlashCommandBuilder().setName("skip").setDescription("Пропустить трек"),
  new SlashCommandBuilder().setName("stop").setDescription("Остановить музыку"),
  new SlashCommandBuilder().setName("pause").setDescription("Пауза"),
  new SlashCommandBuilder().setName("resume").setDescription("Снять паузу"),
  new SlashCommandBuilder().setName("queue").setDescription("Показать очередь")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); console.log("✅ Слэш-команды загружены"); } 
  catch (err) { console.error("Ошибка команд:", err); }
})();

client.once("ready", () => console.log(`🌙 ${client.user.tag} готов`));
client.login(TOKEN);
