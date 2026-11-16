const { ContainerBuilder, MessageFlags } = require('discord.js');
const { MemberFlowLog } = require('../database/models/MemberFlowLog');
const { WhitelistLog } = require('../database/models/WhitelistLog');
const { IcIsimLog } = require('../database/models/IcIsimLog');
const { Ticket } = require('../database/models/Ticket');
const { EkipTicket } = require('../database/models/EkipTicket');
const { BanLog } = require('../database/models/BanLog');
const { BlacklistLog } = require('../database/models/BlacklistLog');
const { Penalty } = require('../database/models/Penalty');
const { Ekip } = require('../database/models/Ekip');
const { Support } = require('../database/models/Support');
const { GuildDailyReport } = require('../database/models/GuildDailyReport');
const { getChannelId } = require('../config/channelRegistry');
const { getConfig, getCoinSettings } = require('../config/loadConfig');
const { getDailyDistributedCoins, formatCoin } = require('./coinService');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const DR = require('../constants/dailyReport');
const { formatVoiceDuration } = require('./userActivityService');
const { getGuildDailyActivityTotals } = require('./dailyActivityService');
const {
  getIstanbulDateKey,
  getIstanbulTimeParts,
  getIstanbulDayBounds,
  getYesterdayDateKey,
  msUntilNextIstanbulMidnight,
  formatReportDateLabel,
} = require('../utils/istanbulTime');

let lastSchedulerMinute = '';

async function countInRange(Model, filter) {
  return Model.countDocuments(filter);
}

async function collectDailyStats(guildId, dateKey) {
  const { start, end } = getIstanbulDayBounds(dateKey);
  const base = { guildId, createdAt: { $gte: start, $lt: end } };

  const [
    joins,
    leaves,
    wlVer,
    wlKayitsiz,
    wlRed,
    icOnay,
    icRed,
    ticketsOpened,
    ticketsClaimed,
    ticketsClosed,
    ekipTicketsOpened,
    ekipTicketsClaimed,
    ekipTicketsClosed,
    bans,
    unbans,
    blacklist,
    ceza,
    ekipOpened,
    destek,
    activity,
  ] = await Promise.all([
    countInRange(MemberFlowLog, { ...base, type: 'join' }),
    countInRange(MemberFlowLog, { ...base, type: 'leave' }),
    countInRange(WhitelistLog, { ...base, action: 'ver' }),
    countInRange(WhitelistLog, { ...base, action: 'kayitsiz' }),
    countInRange(WhitelistLog, { ...base, action: 'red' }),
    countInRange(IcIsimLog, { ...base, action: 'onay' }),
    countInRange(IcIsimLog, { ...base, action: 'red' }),
    countInRange(Ticket, base),
    Ticket.countDocuments({
      guildId,
      claimedAt: { $gte: start, $lt: end },
    }),
    Ticket.countDocuments({
      guildId,
      closedAt: { $gte: start, $lt: end },
    }),
    countInRange(EkipTicket, base),
    EkipTicket.countDocuments({
      guildId,
      claimedAt: { $gte: start, $lt: end },
    }),
    EkipTicket.countDocuments({
      guildId,
      closedAt: { $gte: start, $lt: end },
    }),
    countInRange(BanLog, base),
    BanLog.countDocuments({
      guildId,
      unbannedAt: { $gte: start, $lt: end },
    }),
    countInRange(BlacklistLog, base),
    countInRange(Penalty, base),
    countInRange(Ekip, base),
    countInRange(Support, base),
    getGuildDailyActivityTotals(guildId, dateKey),
  ]);

  return {
    joins,
    leaves,
    wlVer,
    wlKayitsiz,
    wlRed,
    icOnay,
    icRed,
    ticketsOpened,
    ticketsClaimed,
    ticketsClosed,
    ekipTicketsOpened,
    ekipTicketsClaimed,
    ekipTicketsClosed,
    bans,
    unbans,
    blacklist,
    ceza,
    ekipOpened,
    destek,
    messages: activity.messages,
    voiceJoins: activity.voiceJoins,
    voiceTime: formatVoiceDuration(activity.voiceMs),
    voiceActiveUsers: activity.voiceActiveUsers,
    coinDistributed: getDailyDistributedCoins(guildId, dateKey),
  };
}

function buildDailyReportPayload(guild, dateKey, stats) {
  const config = getConfig();
  const label = formatReportDateLabel(dateKey);
  const memberCount = guild.memberCount;
  const botCount = guild.members.cache.filter((m) => m.user.bot).size;
  const humanCount = memberCount - botCount;

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${DR.title}\n**Tarih:** ${label} · **Sunucu:** ${guild.name}`)
  );

  container.addSeparatorComponents((sep) => sep);

  const blocks = [
    formatTemplate(DR.sections.activity, stats),
    formatTemplate(DR.sections.members, stats),
    formatTemplate(DR.sections.whitelist, stats),
    formatTemplate(DR.sections.icIsim, stats),
    formatTemplate(DR.sections.tickets, {
      opened: stats.ticketsOpened,
      claimed: stats.ticketsClaimed,
      closed: stats.ticketsClosed,
    }),
    formatTemplate(DR.sections.ekipTickets, {
      opened: stats.ekipTicketsOpened,
      claimed: stats.ekipTicketsClaimed,
      closed: stats.ekipTicketsClosed,
    }),
    formatTemplate(DR.sections.moderation, stats),
    formatTemplate(DR.sections.ekip, stats),
    formatTemplate(DR.sections.destek, stats),
    formatTemplate(DR.sections.server, { memberCount, humanCount, botCount }),
  ];

  if (getCoinSettings().enabled) {
    blocks.push(
      formatTemplate(DR.sections.coin, {
        coinDistributed: formatCoin(stats.coinDistributed || 0),
      })
    );
  }

  for (const block of blocks) {
    container.addTextDisplayComponents((td) => td.setContent(block));
  }

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

async function getGunlukLogChannel(guild) {
  const channelId = getChannelId('gunlukLog');
  if (!channelId) return null;

  const cached = guild.channels.cache.get(channelId);
  if (cached?.isTextBased()) return cached;

  try {
    const fetched = await guild.channels.fetch(channelId);
    return fetched?.isTextBased() ? fetched : null;
  } catch {
    return null;
  }
}

async function wasReportSent(guildId, reportDateKey) {
  const doc = await GuildDailyReport.findOne({ guildId, reportDateKey }).lean();
  return Boolean(doc);
}

async function markReportSent(guildId, reportDateKey) {
  await GuildDailyReport.findOneAndUpdate(
    { guildId, reportDateKey },
    { $set: { sentAt: new Date() } },
    { upsert: true }
  );
}

async function sendDailyReport(guild, reportDateKey) {
  if (await wasReportSent(guild.id, reportDateKey)) {
    return { ok: false, reason: 'already_sent' };
  }

  const channel = await getGunlukLogChannel(guild);
  if (!channel) {
    console.warn(DR.channelMissing);
    return { ok: false, reason: 'no_channel' };
  }

  const stats = await collectDailyStats(guild.id, reportDateKey);
  const payload = buildDailyReportPayload(guild, reportDateKey, stats);

  await channel.send(payload);
  await markReportSent(guild.id, reportDateKey);

  console.log(formatTemplate(DR.sent, { dateKey: reportDateKey }));
  return { ok: true, stats };
}

async function runScheduledDailyReports(client) {
  const { hour, minute } = getIstanbulTimeParts();
  if (hour !== 0 || minute !== 0) return;

  const minuteKey = `${getIstanbulDateKey()}T00:00`;
  if (lastSchedulerMinute === minuteKey) return;
  lastSchedulerMinute = minuteKey;

  const reportDateKey = getYesterdayDateKey();
  const targetGuildId = process.env.DISCORD_GUILD_ID;

  const guilds = targetGuildId
    ? [client.guilds.cache.get(targetGuildId)].filter(Boolean)
    : [...client.guilds.cache.values()];

  for (const guild of guilds) {
    try {
      await sendDailyReport(guild, reportDateKey);
    } catch (err) {
      console.error(`[Günlük rapor] ${guild.id}:`, err.message || err);
    }
  }
}

function registerDailyReportScheduler(client) {
  const schedule = () => {
    const delay = msUntilNextIstanbulMidnight();
    setTimeout(async () => {
      await runScheduledDailyReports(client).catch((err) => {
        console.error('[Günlük rapor] Zamanlayıcı:', err.message || err);
      });
      schedule();
    }, delay);
  };

  schedule();
  console.log('[Günlük rapor] 00:00 (Europe/Istanbul) zamanlayıcı aktif.');
}

module.exports = {
  collectDailyStats,
  sendDailyReport,
  registerDailyReportScheduler,
};
