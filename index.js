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

// 🎵 slash команда
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'play') {
    try {
      const url = interaction.options.getString('url');

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) return interaction.reply('❌ зайди в войс');

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator
      });

      // 🔥 play-dl сам определяет SoundCloud / YouTube / etc
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

      interaction.reply('🎵 Играю музыку');

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

    } catch (err) {
      console.log(err);
      interaction.reply('❌ Ошибка воспроизведения');
    }
  }
});

// 🔥 регистрация slash-команды
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Играть музыку (YouTube / SoundCloud)')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('ссылка на трек')
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
    console.log('✅ Slash команды загружены');
  } catch (e) {
    console.log(e);
  }
});

client.once('ready', () => {
  console.log(`✅ Онлайн как ${client.user.tag}`);
});

client.login(TOKEN);
