const { UserActivity } = require('../database/models/UserActivity');
const { UserChannelStats } = require('../database/models/UserChannelStats');
const { getIds, getStaffBilgiSettings } = require('../config/loadConfig');
const STAT = require('../constants/stat');

async function getOrCreate(guildId, userId) {
  let doc = await UserActivity.findOne({ guildId, userId });
  if (!doc) {
    doc = await UserActivity.create({ guildId, userId });
  }
  return doc;
}

async function bumpChannelStat(guildId, userId, channelId, field, amount) {
  if (!channelId || !amount) return;
  await UserChannelStats.findOneAndUpdate(
    { guildId, userId, channelId },
    { $inc: { [field]: amount } },
    { upsert: true }
  );
}

async function incrementMessage(guildId, userId, channelId) {
  const { queueMessageIncrement } = require('./activityBatchService');
  queueMessageIncrement(guildId, userId, channelId);
}

async function addVoiceTime(guildId, userId, channelId, ms) {
  if (!ms || ms <= 0) return;
  await UserActivity.findOneAndUpdate(
    { guildId, userId },
    { $inc: { voiceTimeMs: ms } },
    { upsert: true }
  );
  await bumpChannelStat(guildId, userId, channelId, 'voiceTimeMs', ms);
  const { bumpDailyVoiceTime } = require('./dailyActivityService');
  bumpDailyVoiceTime(guildId, userId, ms).catch(() => {});
}

async function addVoiceDetail(guildId, userId, channelId, { micMs = 0, deafMs = 0 } = {}) {
  const inc = {};
  if (micMs > 0) inc.voiceMicOpenMs = micMs;
  if (deafMs > 0) inc.voiceDeafOpenMs = deafMs;
  if (!Object.keys(inc).length) return;

  await UserActivity.findOneAndUpdate({ guildId, userId }, { $inc: inc }, { upsert: true });
  if (micMs > 0) {
    await bumpChannelStat(guildId, userId, channelId, 'voiceMicOpenMs', micMs);
  }
  if (deafMs > 0) {
    await bumpChannelStat(guildId, userId, channelId, 'voiceDeafOpenMs', deafMs);
  }
}

function formatVoiceDuration(ms) {
  if (!ms || ms <= 0) return '0 dk';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours} saat ${minutes} dk`;
  return `${minutes} dk`;
}

async function resolveChannelLabel(guild, channelId) {
  if (!channelId) return '—';
  const ch =
    guild.channels.cache.get(channelId) ||
    (await guild.channels.fetch(channelId).catch(() => null));
  return ch ? `<#${channelId}>` : '`silinmiş kanal`';
}

function mergeLiveVoiceRows(rows, liveChannelId, liveMs) {
  if (!liveChannelId || !liveMs) return rows;
  const copy = rows.map((r) => ({ ...r }));
  const idx = copy.findIndex((r) => r.channelId === liveChannelId);
  if (idx >= 0) {
    copy[idx].voiceTimeMs = (copy[idx].voiceTimeMs || 0) + liveMs;
  } else {
    copy.push({ channelId: liveChannelId, voiceTimeMs: liveMs, messageCount: 0 });
  }
  return copy.sort((a, b) => (b.voiceTimeMs || 0) - (a.voiceTimeMs || 0));
}

function padCell(text, width) {
  const s = String(text);
  if (s.length >= width) return s.slice(0, width);
  return s + ' '.repeat(width - s.length);
}

function buildMarkdownTable(headers, rows) {
  if (!rows?.length) return STAT.panel.activity.noChannelData;

  const safeHeaders = headers.map((h) => String(h ?? ''));
  const widths = safeHeaders.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => String(row?.[index] ?? '').length)
    )
  );

  const headerLine = safeHeaders.map((h, i) => padCell(h, widths[i])).join(' │ ');
  const separator = widths.map((w) => '─'.repeat(w)).join('─┼─');
  const body = rows
    .map((row) =>
      safeHeaders
        .map((_, i) => padCell(row?.[i] ?? '', widths[i]))
        .join(' │ ')
    )
    .join('\n');

  return `\`\`\`\n${headerLine}\n${separator}\n${body}\n\`\`\``;
}

async function formatChannelRankTable(guild, rows, valueField, limit) {
  const slice = rows.slice(0, limit);
  if (!slice.length) return STAT.panel.activity.noChannelData;

  const A = STAT.panel.activity;
  const valueHeader = valueField === 'voiceTimeMs' ? A.colDuration : A.colCount;
  const tableRows = [];

  for (let i = 0; i < slice.length; i++) {
    const row = slice[i];
    const ch =
      guild.channels.cache.get(row.channelId) ||
      (await guild.channels.fetch(row.channelId).catch(() => null));
    const name = ch ? `#${ch.name}` : 'silinmiş';
    const value =
      valueField === 'voiceTimeMs'
        ? formatVoiceDuration(row[valueField] || 0)
        : String(row[valueField] || 0);
    tableRows.push([String(i + 1), name, value]);
  }

  return buildMarkdownTable([A.colRank, A.colChannel, valueHeader], tableRows);
}

async function formatChannelRankList(guild, rows, valueField, limit) {
  const slice = rows.slice(0, limit);
  if (!slice.length) return STAT.panel.activity.noChannelData;

  const lines = [];
  for (let i = 0; i < slice.length; i++) {
    const row = slice[i];
    const label = await resolveChannelLabel(guild, row.channelId);
    const value =
      valueField === 'voiceTimeMs'
        ? formatVoiceDuration(row[valueField] || 0)
        : String(row[valueField] || 0);
    lines.push(`${i + 1}. ${label} — **${value}**`);
  }
  return lines.join('\n');
}

async function formatTopChannelsInline(guild, rows, valueField, limit) {
  const slice = rows.slice(0, limit);
  if (!slice.length) return '—';

  const parts = [];
  for (const row of slice) {
    const ch =
      guild.channels.cache.get(row.channelId) ||
      (await guild.channels.fetch(row.channelId).catch(() => null));
    const name = ch ? ch.name : 'silinmiş';
    const value =
      valueField === 'voiceTimeMs'
        ? formatVoiceDuration(row[valueField] || 0)
        : String(row[valueField] || 0);
    parts.push(`${name} (${value})`);
  }
  return parts.join(' · ');
}

function sumRows(rows, field) {
  return rows.reduce((sum, row) => sum + (row[field] || 0), 0);
}

function buildCategoryChannelMap(guild) {
  const ids = getIds();
  const settings = getStaffBilgiSettings();
  const defs = {
    ticket: [ids.categoryParentId],
    ic: [ids.categoryId('ic')],
    ooc: [ids.categoryId('ooc')],
    ac: [ids.categoryId('ac')],
    destek: settings.destekCategoryId ? [settings.destekCategoryId] : [],
  };

  const map = {};
  for (const [key, categoryIds] of Object.entries(defs)) {
    const validIds = categoryIds.filter(Boolean);
    if (!validIds.length) {
      map[key] = [];
      continue;
    }
    map[key] = guild.channels.cache
      .filter((ch) => validIds.includes(ch.parentId))
      .map((ch) => ch.id);
  }
  return map;
}

function collectTicketChannelIds(categoryMap) {
  return new Set([
    ...(categoryMap.ticket || []),
    ...(categoryMap.ic || []),
    ...(categoryMap.ooc || []),
    ...(categoryMap.ac || []),
  ]);
}

async function channelName(guild, channelId) {
  const ch =
    guild.channels.cache.get(channelId) ||
    (await guild.channels.fetch(channelId).catch(() => null));
  return ch ? `#${ch.name}` : 'silinmiş';
}

async function formatChannelMessageTable(guild, rows, limit = 10) {
  const A = STAT.panel.activity;
  const slice = rows.slice(0, limit);
  if (!slice.length) return A.noChannelData;

  const tableRows = [];
  for (let i = 0; i < slice.length; i += 1) {
    const row = slice[i];
    tableRows.push([
      String(i + 1),
      await channelName(guild, row.channelId),
      String(row.messageCount || 0),
    ]);
  }
  return buildMarkdownTable([A.colRank, A.colChannel, A.colCount], tableRows);
}

async function formatVoiceDetailTable(guild, rows, limit = 10) {
  const A = STAT.panel.activity;
  const slice = rows.slice(0, limit);
  if (!slice.length) return A.noChannelData;

  const tableRows = [];
  for (let i = 0; i < slice.length; i += 1) {
    const row = slice[i];
    tableRows.push([
      String(i + 1),
      await channelName(guild, row.channelId),
      formatVoiceDuration(row.voiceTimeMs || 0),
      formatVoiceDuration(row.voiceMicOpenMs || 0),
      formatVoiceDuration(row.voiceDeafOpenMs || 0),
    ]);
  }
  return buildMarkdownTable(
    [A.colRank, A.colChannel, A.colDuration, A.colMicOpen, A.colDeafOpen],
    tableRows
  );
}

function formatCategoryStatsTable(categoryStats) {
  const A = STAT.panel.activity;
  const labels = {
    ticket: 'Ticket (Genel)',
    ic: 'IC Ticket',
    ooc: 'OOC Ticket',
    ac: 'AC Ticket',
    destek: 'Destek',
  };

  const rows = [];
  for (const key of ['ticket', 'ic', 'ooc', 'ac', 'destek']) {
    const stat = categoryStats[key];
    if (!stat) continue;
    if (!stat.messages && !stat.voiceMs && !stat.micMs && !stat.deafMs) continue;
    rows.push([
      labels[key] || key,
      String(stat.messages || 0),
      formatVoiceDuration(stat.voiceMs || 0),
      formatVoiceDuration(stat.micMs || 0),
      formatVoiceDuration(stat.deafMs || 0),
    ]);
  }

  if (!rows.length) return A.noChannelData;
  return buildMarkdownTable(
    [A.colCategory, 'Mesaj', 'Ses', 'Mik Açık', 'Kulaklık'],
    rows
  );
}

async function buildActivityStatDataCore(guild, userId, categoryMap) {
  const { sessions } = require('./voiceTrackingService');
  const activity = await getOrCreate(guild.id, userId);
  const channelRows = await UserChannelStats.find({ guildId: guild.id, userId }).lean();

  const live = sessions.get(`${guild.id}:${userId}`);
  const liveVoiceMs = live ? Date.now() - live.joinedAt : 0;
  const liveMicMs = live?.micOpen ? liveVoiceMs : 0;
  const liveDeafMs = live?.deafOpen ? liveVoiceMs : 0;
  const liveChannelId = live?.channelId || null;

  const totalVoiceMs = (activity.voiceTimeMs || 0) + liveVoiceMs;
  const totalMicMs = (activity.voiceMicOpenMs || 0) + liveMicMs;
  const totalDeafMs = (activity.voiceDeafOpenMs || 0) + liveDeafMs;
  const totalMessages = activity.messageCount || 0;
  const totalVoiceText = formatVoiceDuration(totalVoiceMs);

  const topMessageRows = [...channelRows]
    .filter((r) => (r.messageCount || 0) > 0)
    .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
    .slice(0, 10);

  let topVoiceRows = [...channelRows]
    .filter((r) => (r.voiceTimeMs || 0) > 0)
    .sort((a, b) => (b.voiceTimeMs || 0) - (a.voiceTimeMs || 0))
    .slice(0, 10);

  topVoiceRows = mergeLiveVoiceRows(topVoiceRows, liveChannelId, liveVoiceMs);

  const categoryStats = {};
  for (const [key, channelIds] of Object.entries(categoryMap)) {
    const idSet = new Set(channelIds);
    const rows = channelRows.filter((r) => idSet.has(r.channelId));
    categoryStats[key] = {
      messages: sumRows(rows, 'messageCount'),
      voiceMs: sumRows(rows, 'voiceTimeMs'),
      micMs: sumRows(rows, 'voiceMicOpenMs'),
      deafMs: sumRows(rows, 'voiceDeafOpenMs'),
    };
  }

  const ticketChannelIds = collectTicketChannelIds(categoryMap);
  const ticketMessageRows = channelRows
    .filter((r) => ticketChannelIds.has(r.channelId) && (r.messageCount || 0) > 0)
    .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));

  const destekChannelIds = new Set(categoryMap.destek || []);
  const destekVoiceRows = channelRows
    .filter((r) => destekChannelIds.has(r.channelId) && (r.voiceTimeMs || 0) > 0)
    .sort((a, b) => (b.voiceTimeMs || 0) - (a.voiceTimeMs || 0));

  const voiceDetailRows = [...channelRows]
    .filter((r) => (r.voiceTimeMs || 0) > 0)
    .sort((a, b) => (b.voiceTimeMs || 0) - (a.voiceTimeMs || 0))
    .slice(0, 10);

  const [
    top3MessagesList,
    top3VoiceList,
    top10MessagesList,
    top10VoiceList,
    ticketChannelMessagesTable,
    destekVoiceChannelsTable,
    voiceDetailTable,
    categoryStatsTable,
  ] = await Promise.all([
    formatChannelRankList(guild, topMessageRows, 'messageCount', 3),
    formatChannelRankList(guild, topVoiceRows, 'voiceTimeMs', 3),
    formatChannelRankList(guild, topMessageRows, 'messageCount', 10),
    formatChannelRankList(guild, topVoiceRows, 'voiceTimeMs', 10),
    formatChannelMessageTable(guild, ticketMessageRows, 10),
    formatVoiceDetailTable(guild, destekVoiceRows, 10),
    formatVoiceDetailTable(guild, voiceDetailRows, 10),
    Promise.resolve(formatCategoryStatsTable(categoryStats)),
  ]);

  return {
    totalMessages,
    totalVoiceMs,
    totalVoiceText,
    totalMicMs,
    totalMicText: formatVoiceDuration(totalMicMs),
    totalDeafMs,
    totalDeafText: formatVoiceDuration(totalDeafMs),
    micRatio:
      totalVoiceMs > 0 ? `${Math.round((totalMicMs / totalVoiceMs) * 100)}%` : '—',
    deafRatio:
      totalVoiceMs > 0 ? `${Math.round((totalDeafMs / totalVoiceMs) * 100)}%` : '—',
    top3MessagesList,
    top3VoiceList,
    top10MessagesList,
    top10VoiceList,
    categoryStats,
    categoryStatsTable,
    ticketChannelMessagesTable,
    destekVoiceChannelsTable,
    voiceDetailTable,
    destekStats: categoryStats.destek || {
      messages: 0,
      voiceMs: 0,
      micMs: 0,
      deafMs: 0,
    },
  };
}

async function buildActivityStatData(guild, userId) {
  const categoryMap = buildCategoryChannelMap(guild);
  return buildActivityStatDataCore(guild, userId, categoryMap);
}

async function buildStaffBilgiActivityData(guild, userId, categoryMap) {
  return buildActivityStatDataCore(guild, userId, categoryMap);
}

module.exports = {
  getOrCreate,
  incrementMessage,
  addVoiceTime,
  addVoiceDetail,
  formatVoiceDuration,
  buildCategoryChannelMap,
  buildActivityStatData,
  buildStaffBilgiActivityData,
  resolveChannelLabel,
  buildMarkdownTable,
};
