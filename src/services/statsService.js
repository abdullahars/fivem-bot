const { StaffStats } = require('../database/models/StaffStats');
const { Ticket } = require('../database/models/Ticket');
const { getPeriodKeys, formatDuration } = require('../utils/format');
const STAT = require('../constants/stat');

/** Coin kazanımı — coinService'i lazy require ile çağırır (döngüsel bağımlılık önlemi). */
function awardCoin(guildId, userId, rateKey) {
  try {
    const { earnAction } = require('./coinService');
    earnAction(guildId, userId, rateKey).catch(() => {});
  } catch (_) {
    /* coin sistemi yoksa yoksay */
  }
}

/** Eski ticket tipi ID'leri (bug → ac; donate kaldırıldı) */
function normalizeCategoryTypeId(typeId) {
  if (typeId === 'bug') return 'ac';
  if (typeId === 'donate') return null;
  return typeId;
}

async function getOrCreateStats(guildId, userId) {
  let stats = await StaffStats.findOne({ guildId, userId });
  if (!stats) {
    stats = await StaffStats.create({ guildId, userId });
  }
  return resetPeriodsIfNeeded(stats);
}

async function resetPeriodsIfNeeded(stats) {
  const { day, week, month } = getPeriodKeys();
  let changed = false;

  if (stats.lastResetDay !== day) {
    stats.todayClaimed = 0;
    stats.todayClosed = 0;
    stats.todayWhitelistVer = 0;
    stats.todayKayitsiz = 0;
    stats.todayIcOnay = 0;
    stats.todayIcRed = 0;
    stats.todayEkipAc = 0;
    stats.todayEkipKapat = 0;
    stats.todaySupportReceived = 0;
    stats.todaySupportProvided = 0;
    stats.lastResetDay = day;
    changed = true;
  }
  if (stats.lastResetWeek !== week) {
    stats.weekClaimed = 0;
    stats.weekClosed = 0;
    stats.weekWhitelistVer = 0;
    stats.weekKayitsiz = 0;
    stats.weekIcOnay = 0;
    stats.weekIcRed = 0;
    stats.weekEkipAc = 0;
    stats.weekEkipKapat = 0;
    stats.weekSupportReceived = 0;
    stats.weekSupportProvided = 0;
    stats.lastResetWeek = week;
    changed = true;
  }
  if (stats.lastResetMonth !== month) {
    stats.monthClaimed = 0;
    stats.monthClosed = 0;
    stats.monthWhitelistVer = 0;
    stats.monthKayitsiz = 0;
    stats.monthIcOnay = 0;
    stats.monthIcRed = 0;
    stats.monthEkipAc = 0;
    stats.monthEkipKapat = 0;
    stats.monthSupportReceived = 0;
    stats.monthSupportProvided = 0;
    stats.lastResetMonth = month;
    changed = true;
  }

  if (changed) await stats.save();
  return stats;
}

async function recordClaim(guildId, userId, typeId, claimTimeMs) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalClaimed += 1;
  stats.todayClaimed += 1;
  stats.weekClaimed += 1;
  stats.monthClaimed += 1;
  const catId = normalizeCategoryTypeId(typeId);
  if (catId && stats.categoryCounts[catId] !== undefined) {
    stats.categoryCounts[catId] += 1;
  }
  if (claimTimeMs > 0) {
    stats.totalClaimTimeMs += claimTimeMs;
    stats.claimCountForAvg += 1;
  }
  await stats.save();
  awardCoin(guildId, userId, 'ticket');
  return stats;
}

async function recordWhitelistVer(guildId, userId) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalWhitelistVer += 1;
  stats.todayWhitelistVer += 1;
  stats.weekWhitelistVer += 1;
  stats.monthWhitelistVer += 1;
  await stats.save();
  awardCoin(guildId, userId, 'kayit');
  return stats;
}

async function recordKayitsiz(guildId, userId) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalKayitsiz += 1;
  stats.todayKayitsiz += 1;
  stats.weekKayitsiz += 1;
  stats.monthKayitsiz += 1;
  await stats.save();
  return stats;
}

async function recordIcOnay(guildId, userId) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalIcOnay += 1;
  stats.todayIcOnay += 1;
  stats.weekIcOnay += 1;
  stats.monthIcOnay += 1;
  await stats.save();
  awardCoin(guildId, userId, 'icIsim');
  return stats;
}

async function recordEkipAc(guildId, userId) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalEkipAc += 1;
  stats.todayEkipAc += 1;
  stats.weekEkipAc += 1;
  stats.monthEkipAc += 1;
  await stats.save();
  awardCoin(guildId, userId, 'ekipAc');
  return stats;
}

async function recordEkipKapat(guildId, userId) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalEkipKapat += 1;
  stats.todayEkipKapat += 1;
  stats.weekEkipKapat += 1;
  stats.monthEkipKapat += 1;
  await stats.save();
  return stats;
}

async function recordEkipReferans(guildId, userId) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalEkipReferans = (stats.totalEkipReferans || 0) + 1;
  await stats.save();
  awardCoin(guildId, userId, 'ekipReferans');
  return stats;
}

async function recordSupportReceived(guildId, userId) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalSupportReceived = (stats.totalSupportReceived || 0) + 1;
  stats.todaySupportReceived = (stats.todaySupportReceived || 0) + 1;
  stats.weekSupportReceived = (stats.weekSupportReceived || 0) + 1;
  stats.monthSupportReceived = (stats.monthSupportReceived || 0) + 1;
  await stats.save();
  awardCoin(guildId, userId, 'destekAlinan');
  return stats;
}

async function recordSupportProvided(guildId, userId) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalSupportProvided = (stats.totalSupportProvided || 0) + 1;
  stats.todaySupportProvided = (stats.todaySupportProvided || 0) + 1;
  stats.weekSupportProvided = (stats.weekSupportProvided || 0) + 1;
  stats.monthSupportProvided = (stats.monthSupportProvided || 0) + 1;
  await stats.save();
  awardCoin(guildId, userId, 'destekYardim');
  return stats;
}

async function recordIcRed(guildId, userId) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalIcRed += 1;
  stats.todayIcRed += 1;
  stats.weekIcRed += 1;
  stats.monthIcRed += 1;
  await stats.save();
  return stats;
}

async function recordStaffStart(guildId, userId, level, startedById) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.staffStartedAt = new Date();
  stats.staffLevel = level;
  stats.staffStartedById = startedById;
  await stats.save();
  return stats;
}

function formatStaffStartedAt(stats) {
  if (!stats?.staffStartedAt) return '—';
  const date = new Date(stats.staffStartedAt);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStaffLevel(stats) {
  if (!stats?.staffLevel) return '—';
  const map = { l1: 'L1', l2: 'L2', l3: 'L3' };
  return map[stats.staffLevel] || String(stats.staffLevel).toUpperCase();
}

async function recordClose(guildId, userId, closeTimeMs) {
  const stats = await getOrCreateStats(guildId, userId);
  stats.totalClosed += 1;
  stats.todayClosed += 1;
  stats.weekClosed += 1;
  stats.monthClosed += 1;
  if (closeTimeMs > 0) {
    stats.totalCloseTimeMs += closeTimeMs;
    stats.closeCountForAvg += 1;
  }
  await stats.save();
  return stats;
}

async function getStaffRank(guildId, userId, sortField = 'totalClosed') {
  const { getDb } = require('../database/sqlite/db');
  const columnMap = {
    totalClosed: 'total_closed',
    totalClaimed: 'total_claimed',
  };
  const col = columnMap[sortField] || 'total_closed';
  const db = getDb();

  const userRow = db
    .prepare(`SELECT ${col} AS value FROM staff_stats WHERE guild_id = ? AND user_id = ?`)
    .get(guildId, userId);

  if (!userRow) {
    const count = db
      .prepare('SELECT COUNT(*) AS cnt FROM staff_stats WHERE guild_id = ?')
      .get(guildId);
    return (count?.cnt ?? 0) + 1;
  }

  const rankRow = db
    .prepare(
      `SELECT COUNT(*) + 1 AS rank FROM staff_stats WHERE guild_id = ? AND ${col} > ?`
    )
    .get(guildId, userRow.value ?? 0);

  return rankRow?.rank ?? 1;
}

async function loadGuildStaffStats(guildId) {
  return StaffStats.find({ guildId }).lean();
}

function buildStaffRankMap(statsRows, sortField = 'totalClosed') {
  const sorted = [...statsRows].sort(
    (a, b) => (b[sortField] || 0) - (a[sortField] || 0)
  );
  const map = new Map();
  sorted.forEach((row, index) => map.set(row.userId, index + 1));
  return map;
}

async function getActiveClaimedTicket(guildId, userId) {
  return Ticket.findOne({
    guildId,
    claimedById: userId,
    status: 'claimed',
  });
}

async function buildStatData(guildId, userId, preload = null) {
  const stats = preload?.stats ?? (await getOrCreateStats(guildId, userId));
  const rank = preload?.rank ?? (await getStaffRank(guildId, userId));
  const activeTicket =
    preload?.activeTicket === undefined
      ? await getActiveClaimedTicket(guildId, userId)
      : preload.activeTicket;
  const labels = STAT.labels;

  const avgClaim =
    stats.claimCountForAvg > 0
      ? Math.round(stats.totalClaimTimeMs / stats.claimCountForAvg)
      : 0;
  const avgClose =
    stats.closeCountForAvg > 0
      ? Math.round(stats.totalCloseTimeMs / stats.closeCountForAvg)
      : 0;

  const cat = stats.categoryCounts;
  const statusLine = activeTicket
    ? labels.statusActive.replace('{channel}', activeTicket.channelId)
    : labels.statusIdle;

  return {
    rank,
    statusLine,
    totalClosed: stats.totalClosed,
    totalClaimed: stats.totalClaimed,
    todayClosed: stats.todayClosed,
    weekClosed: stats.weekClosed,
    monthClosed: stats.monthClosed,
    totalWlVer: stats.totalWhitelistVer || 0,
    todayWlVer: stats.todayWhitelistVer || 0,
    weekWlVer: stats.weekWhitelistVer || 0,
    monthWlVer: stats.monthWhitelistVer || 0,
    totalKayitsiz: stats.totalKayitsiz || 0,
    todayKayitsiz: stats.todayKayitsiz || 0,
    weekKayitsiz: stats.weekKayitsiz || 0,
    monthKayitsiz: stats.monthKayitsiz || 0,
    totalIcOnay: stats.totalIcOnay || 0,
    totalIcRed: stats.totalIcRed || 0,
    todayIcOnay: stats.todayIcOnay || 0,
    todayIcRed: stats.todayIcRed || 0,
    weekIcOnay: stats.weekIcOnay || 0,
    monthIcOnay: stats.monthIcOnay || 0,
    weekIcRed: stats.weekIcRed || 0,
    monthIcRed: stats.monthIcRed || 0,
    totalEkipAc: stats.totalEkipAc || 0,
    totalEkipKapat: stats.totalEkipKapat || 0,
    todayEkipAc: stats.todayEkipAc || 0,
    weekEkipAc: stats.weekEkipAc || 0,
    monthEkipAc: stats.monthEkipAc || 0,
    todayEkipKapat: stats.todayEkipKapat || 0,
    weekEkipKapat: stats.weekEkipKapat || 0,
    monthEkipKapat: stats.monthEkipKapat || 0,
    totalSupportReceived: stats.totalSupportReceived || 0,
    todaySupportReceived: stats.todaySupportReceived || 0,
    weekSupportReceived: stats.weekSupportReceived || 0,
    monthSupportReceived: stats.monthSupportReceived || 0,
    totalSupportProvided: stats.totalSupportProvided || 0,
    todaySupportProvided: stats.todaySupportProvided || 0,
    weekSupportProvided: stats.weekSupportProvided || 0,
    monthSupportProvided: stats.monthSupportProvided || 0,
    totalEkipReferans: stats.totalEkipReferans || 0,
    avgClaim: avgClaim ? formatDuration(avgClaim) : labels.noData,
    avgClose: avgClose ? formatDuration(avgClose) : labels.noData,
    staffStartedAt: formatStaffStartedAt(stats),
    staffLevel: formatStaffLevel(stats),
    cat: {
      ic: cat.ic || 0,
      ooc: cat.ooc || 0,
      ac: (cat.ac || 0) + (cat.bug || 0),
    },
  };
}

async function getTopLeaderboard(guildId, field, limit) {
  return StaffStats.find({ guildId, [field]: { $gt: 0 } })
    .sort({ [field]: -1 })
    .limit(limit)
    .lean();
}

module.exports = {
  getOrCreateStats,
  recordClaim,
  recordClose,
  recordWhitelistVer,
  recordKayitsiz,
  recordIcOnay,
  recordIcRed,
  recordEkipAc,
  recordEkipKapat,
  recordEkipReferans,
  recordSupportReceived,
  recordSupportProvided,
  recordStaffStart,
  formatStaffStartedAt,
  formatStaffLevel,
  buildStatData,
  getStaffRank,
  loadGuildStaffStats,
  buildStaffRankMap,
  getTopLeaderboard,
};
