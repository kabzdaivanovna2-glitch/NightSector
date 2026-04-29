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

if (interaction.commandName === 'play') {
  await interaction.deferReply();

  const url = interaction.options.getString('url');

  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    return interaction.editReply('❌ зайди в войс');
  }

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator
    });

    let source;
    try {
      source = await play.stream(url);
    } catch (e) {
      console.log("STREAM ERROR:", e);
      return interaction.editReply('❌ не удалось получить аудио (ссылка не поддерживается)');
    }

    const resource = createAudioResource(source.stream, {
      inputType: source.type
    });

    const player = createAudioPlayer();

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
