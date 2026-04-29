const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType
} = require('@discordjs/voice');

const play = require('play-dl');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1499113326020399276";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once('ready', () => {
  console.log(`✅ Бот онлайн: ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'play') {
    await interaction.deferReply();

    const query = interaction.options.getString('url');
    const voice = interaction.member.voice.channel;

    if (!voice) {
      return interaction.editReply("❌ зайди в войс");
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voice.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator
      });

      // 🔥 ИСПРАВЛЕННЫЙ ПОЛУЧАТЕЛЬ АУДИО
      let streamData;

      try {
        const search = await play.search(query, { limit: 1 });

        if (!search.length) {
          return interaction.editReply("❌ трек не найден");
        }

        streamData = await play.stream(search[0].url);

      } catch (e) {
        console.log("STREAM ERROR:", e);
        return interaction.editReply("❌ не удалось загрузить трек");
      }

      const resource = createAudioResource(streamData.stream, {
        inputType: StreamType.Arbitrary
      });

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play
        }
      });

      player.play(resource);
      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      return interaction.editReply(`🎵 играет: **${search[0].title}**`);

    } catch (err) {
      console.log("PLAY ERROR:", err);
      return interaction.editReply("❌ ошибка воспроизведения");
    }
  }
});

// 🔥 slash команда
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('включить музыку')
    .addStringOption(opt =>
      opt.setName('url')
        .setDescription('название или ссылка')
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash команды зарегистрированы");
  } catch (err) {
    console.log(err);
  }
});

client.login(TOKEN);
