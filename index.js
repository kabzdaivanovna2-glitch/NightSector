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

// 🎵 slash команда обработка
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'play') {
    await interaction.deferReply(); // 🔥 ВАЖНО (фикс "did not respond")

    try {
      const url = interaction.options.getString('url');

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.editReply('❌ зайди в войс');
      }

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator
      });

      const source = await play.stream(url);

      const resource = createAudioResource(source.stream, {
        inputType: source.type
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

      await interaction.editReply('🎵 Играю музыку');

    } catch (err) {
      console.log(err);
      await interaction.editReply('❌ Ошибка воспроизведения');
    }
  }
});

// 🔥 регистрация slash команды
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Играть музыку')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('ссылка на YouTube или SoundCloud')
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
