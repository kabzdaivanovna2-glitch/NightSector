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
const CLIENT_ID = "1499113326020399276"; // ВАЖНО заменить

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once('ready', () => {
  console.log(`✅ Онлайн как ${client.user.tag}`);
});

// 🎵 slash команда /play
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'play') {
    const url = interaction.options.getString('url');

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply('❌ зайди в войс');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator
    });

    const stream = await play.stream(url);
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

    interaction.reply('🎵 играю музыку');

    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });
  }
});

// 🔥 регистрация slash команд
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Включить музыку')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('Ссылка YouTube')
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log('✅ Slash команды зарегистрированы');
})();

client.login(TOKEN);
