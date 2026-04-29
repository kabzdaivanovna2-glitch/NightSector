const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior
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

// 🎵 обработка slash-команд
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'play') {
    await interaction.deferReply();

    const url = interaction.options.getString('url');
    const voice = interaction.member.voice.channel;

    if (!voice) {
      return interaction.editReply('❌ зайди в войс');
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voice.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator
      });

      let stream;

      try {
        stream = await Promise.race([
          play.stream(url),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 8000)
          )
        ]);
      } catch (e) {
        console.log("STREAM ERROR:", e);
        return interaction.editReply('❌ не удалось получить аудио');
      }

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type
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

      return interaction.editReply('🎵 играет музыка');

    } catch (err) {
      console.log("PLAY ERROR:", err);
      return interaction.editReply('❌ ошибка воспроизведения');
    }
  }
});

// 🔥 регистрация slash-команды
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('включить музыку')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('ссылка на SoundCloud или YouTube')
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
    console.log('✅ Slash команды зарегистрированы');
  } catch (err) {
    console.log(err);
  }
});

client.once('ready', () => {
  console.log(`✅ Бот онлайн: ${client.user.tag}`);
});

client.login(TOKEN);
