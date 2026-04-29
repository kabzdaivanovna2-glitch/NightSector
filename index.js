const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior
} = require('@discordjs/voice');
const play = require('play-dl');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const TOKEN = process.env.TOKEN;

client.once('ready', () => {
  console.log(`✅ Онлайн как ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // !play <url>
  if (message.content.startsWith('!play')) {
    const url = message.content.split(' ')[1];
    if (!url) return message.reply('Дай ссылку на YouTube');

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('Зайди в войс сначала');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator
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

    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    message.reply('🎵 Играю музыку');
  }

  // !stop
  if (message.content === '!stop') {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return;

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator
    });

    connection.destroy();
    message.reply('⛔ Остановлено');
  }
});

client.login(TOKEN);
