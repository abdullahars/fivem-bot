require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const { connectDatabase } = require('./database/connect');
const { loadConfig } = require('./config/loadConfig');
const { handleReady } = require('./events/ready');
const { handleInteraction } = require('./events/interactionCreate');
const { registerLoggingEvents } = require('./events/loggingEvents');
const {
  registerGuildMemberAdd,
  registerGuildMemberRemove,
} = require('./services/memberJoinService');
const { registerVoiceTracking } = require('./services/voiceTrackingService');
const { registerVoicePresence } = require('./services/voicePresenceService');
const { registerMulakatVoice } = require('./services/mulakatVoiceService');
const { registerGuildAuditLogEntryCreate } = require('./services/roleLogService');
const { registerInviteTracking } = require('./services/inviteService');
const { registerVoiceMoveAuditCache } = require('./services/loggingService');
const { deployCommands } = require('./utils/deployCommands');

loadConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
});

// Global client erişimi için
global.client = client;

registerLoggingEvents(client);
registerGuildMemberAdd(client);
registerGuildMemberRemove(client);
registerVoiceTracking(client);
registerVoicePresence(client);
registerMulakatVoice(client);
registerGuildAuditLogEntryCreate(client);
registerInviteTracking(client);
registerVoiceMoveAuditCache(client);

client.once(Events.ClientReady, () => handleReady(client));
client.on('interactionCreate', (interaction) => {
  handleInteraction(interaction).catch((err) => {
    const { isUnknownInteraction, safeReply, ephemeralPayload } = require('./utils/interaction');
    if (isUnknownInteraction(err)) {
      console.warn('[Interaction] Süresi dolmuş etkileşim (3sn aşıldı veya çift yanıt).');
      return;
    }
    console.error('[Interaction]', err);
    safeReply(
      interaction,
      ephemeralPayload({
        content: require('./constants/messages').interactionError,
      })
    ).catch(() => {});
  });
});

async function main() {
  if (!process.env.DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN .env dosyasında tanımlı değil.');
    process.exit(1);
  }
  await connectDatabase();

  if (process.env.SKIP_DEPLOY_ON_START !== '1' && process.env.DISCORD_GUILD_ID) {
    try {
      const result = await deployCommands({
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID,
      });
      console.log(
        `[Komutlar] ${result.count} slash komut sunucuya yüklendi (${result.guildId}).`
      );
    } catch (err) {
      console.error('[Komutlar] Yükleme hatası:', err.message || err);
    }
  } else if (process.env.SKIP_DEPLOY_ON_START === '1') {
    console.log('[Komutlar] Başlangıç deploy atlandı (SKIP_DEPLOY_ON_START=1).');
  } else {
    console.warn(
      '[Komutlar] DISCORD_GUILD_ID yok — komutlar için: npm run deploy-commands'
    );
  }

  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((err) => {
  console.error('[Bot]', err);
  process.exit(1);
});
