const { getConfig } = require('../config/loadConfig');
const { formatTemplate } = require('../utils/format');
const { syncChannelsFromGuild } = require('../config/channelRegistry');
const { registerDailyReportScheduler } = require('../services/dailyReportService');
const { registerMeetingScheduler } = require('../services/toplantiService');
const { startVoicePresence } = require('../services/voicePresenceService');
const { restoreActiveGiveaways } = require('../services/cekilisService');
const { initInviteCache } = require('../services/inviteService');
const { registerActivityBatchShutdown } = require('../services/activityBatchService');
const { registerWeeklyReportScheduler } = require('../services/performanceReportService');

function handleReady(client) {
  const config = getConfig();
  const message = formatTemplate(config.bot.readyMessage, {
    botTag: client.user.tag,
    guildCount: client.guilds.cache.size,
  });

  console.log(message);

  const guildId = process.env.DISCORD_GUILD_ID;
  const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
  if (guild) {
    const sync = syncChannelsFromGuild(guild);
    console.log(
      `[Kanallar] İsme göre bağlandı: ${sync.found}/${sync.total}` +
        (sync.missing.length ? ` (eksik: ${sync.missing.join(', ')})` : '')
    );
  }

  client.user.setPresence({ status: 'idle' });

  registerDailyReportScheduler(client);
  registerMeetingScheduler(client);
  registerWeeklyReportScheduler(client);
  registerActivityBatchShutdown();
  restoreActiveGiveaways(client).catch((err) => {
    console.error('[Çekiliş] Aktif çekilişler yüklenemedi:', err?.message || err);
  });

  setTimeout(() => startVoicePresence(client), 2000);

  initInviteCache(client).catch((err) => {
    console.warn('[Invite] Önbellek yüklenemedi:', err?.message || err);
  });
}

module.exports = { handleReady };
