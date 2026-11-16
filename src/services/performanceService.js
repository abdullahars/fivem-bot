const { getDb } = require('../database/sqlite/db');
const { WeeklyPerformance } = require('../database/models/WeeklyPerformance');
const { RankSuggestionLog } = require('../database/models/RankSuggestionLog');
const { getIds, getPerformanceSettings } = require('../config/loadConfig');
const { getRoleMembers } = require('../utils/roleMembers');
const {
  getIstanbulWeekKey,
  getIstanbulWeekBounds,
  getPreviousWeekKey,
  getRecentWeekKeys,
} = require('../utils/isoWeek');

const STAT_KEYS = [
  'ticketKapatilan',
  'kayitToplam',
  'icToplam',
  'destekToplam',
  'ekipToplam',
  'mesaj',
];

function emptyRaw() {
  return {
    ticketKapatilan: 0,
    ticketIlgilenilen: 0,
    kayitToplam: 0,
    icToplam: 0,
    destekToplam: 0,
    ekipToplam: 0,
    mesaj: 0,
    voiceMs: 0,
    avgCloseMs: 0,
  };
}

function ensure(map, uid) {
  if (!map.has(uid)) map.set(uid, emptyRaw());
  return map.get(uid);
}

function isRawActive(raw) {
  return STAT_KEYS.some((k) => (raw[k] || 0) > 0) || (raw.voiceMs || 0) > 0;
}

/** Bir ISO hafta için her kullanıcının ham haftalık statlarını (kaynak tablolardan) hesaplar. */
function collectWeeklyRawStats(guildId, weekKey) {
  const db = getDb();
  const { start, end, dayKeys } = getIstanbulWeekBounds(weekKey);
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const map = new Map();

  // Ticket kapatma + ortalama kapatma süresi
  const closedTickets = db
    .prepare(
      `SELECT closed_by_id AS uid, claimed_at AS claimedAt, closed_at AS closedAt
       FROM tickets
       WHERE guild_id = ? AND closed_by_id IS NOT NULL
         AND closed_at >= ? AND closed_at < ?`
    )
    .all(guildId, startIso, endIso);

  const closeAccum = new Map();
  for (const row of closedTickets) {
    if (!row.uid) continue;
    const raw = ensure(map, row.uid);
    raw.ticketKapatilan += 1;
    if (row.claimedAt && row.closedAt) {
      const ms = new Date(row.closedAt).getTime() - new Date(row.claimedAt).getTime();
      if (Number.isFinite(ms) && ms > 0) {
        const acc = closeAccum.get(row.uid) || { sum: 0, n: 0 };
        acc.sum += ms;
        acc.n += 1;
        closeAccum.set(row.uid, acc);
      }
    }
  }
  for (const [uid, acc] of closeAccum.entries()) {
    if (acc.n > 0) ensure(map, uid).avgCloseMs = Math.round(acc.sum / acc.n);
  }

  // Ticket ilgilenilen (claim)
  const claimed = db
    .prepare(
      `SELECT claimed_by_id AS uid, COUNT(*) AS cnt
       FROM tickets
       WHERE guild_id = ? AND claimed_by_id IS NOT NULL
         AND claimed_at >= ? AND claimed_at < ?
       GROUP BY claimed_by_id`
    )
    .all(guildId, startIso, endIso);
  for (const row of claimed) {
    if (row.uid) ensure(map, row.uid).ticketIlgilenilen = row.cnt;
  }

  // Kayıt (WL ver + kayıtsız)
  const kayit = db
    .prepare(
      `SELECT staff_id AS uid, COUNT(*) AS cnt
       FROM whitelist_logs
       WHERE guild_id = ? AND created_at >= ? AND created_at < ?
         AND action IN ('ver', 'kayitsiz')
       GROUP BY staff_id`
    )
    .all(guildId, startIso, endIso);
  for (const row of kayit) {
    if (row.uid) ensure(map, row.uid).kayitToplam = row.cnt;
  }

  // IC (onay + red)
  const ic = db
    .prepare(
      `SELECT staff_id AS uid, COUNT(*) AS cnt
       FROM ic_isim_logs
       WHERE guild_id = ? AND created_at >= ? AND created_at < ?
         AND action IN ('onay', 'red')
       GROUP BY staff_id`
    )
    .all(guildId, startIso, endIso);
  for (const row of ic) {
    if (row.uid) ensure(map, row.uid).icToplam = row.cnt;
  }

  // Ekip açma
  const ekip = db
    .prepare(
      `SELECT created_by_id AS uid, COUNT(*) AS cnt
       FROM ekips
       WHERE guild_id = ? AND created_at >= ? AND created_at < ?
       GROUP BY created_by_id`
    )
    .all(guildId, startIso, endIso);
  for (const row of ekip) {
    if (row.uid) ensure(map, row.uid).ekipToplam = row.cnt;
  }

  // Destek (alınan + yardım) — JSON dizilerden say
  const supports = db
    .prepare(
      `SELECT receivers, providers FROM supports
       WHERE guild_id = ? AND created_at >= ? AND created_at < ?`
    )
    .all(guildId, startIso, endIso);
  for (const row of supports) {
    const ids = new Set();
    for (const field of ['receivers', 'providers']) {
      try {
        const arr = JSON.parse(row[field] || '[]');
        for (const entry of arr) {
          const uid = entry?.userId;
          if (uid) ids.add(uid);
        }
      } catch {
        /* yok say */
      }
    }
    for (const uid of ids) ensure(map, uid).destekToplam += 1;
  }

  // Aktivite (mesaj + ses) — haftanın 7 gününün toplamı
  if (dayKeys.length) {
    const placeholders = dayKeys.map(() => '?').join(', ');
    const activity = db
      .prepare(
        `SELECT user_id AS uid,
                COALESCE(SUM(message_count), 0) AS msg,
                COALESCE(SUM(voice_time_ms), 0) AS voice
         FROM user_daily_activity
         WHERE guild_id = ? AND date_key IN (${placeholders})
         GROUP BY user_id`
      )
      .all(guildId, ...dayKeys);
    for (const row of activity) {
      if (!row.uid) continue;
      const raw = ensure(map, row.uid);
      raw.mesaj = row.msg;
      raw.voiceMs = row.voice;
    }
  }

  return map;
}

function computeAverages(activeRaws, settings) {
  const averages = {};
  for (const key of STAT_KEYS) {
    if (!activeRaws.length) {
      averages[key] = 0;
      continue;
    }
    averages[key] = activeRaws.reduce((acc, r) => acc + (r[key] || 0), 0) / activeRaws.length;
  }
  // Hız: yalnızca kapatması olanların ortalaması
  const withClose = activeRaws.filter((r) => (r.avgCloseMs || 0) > 0);
  averages.avgCloseMs = withClose.length
    ? withClose.reduce((acc, r) => acc + r.avgCloseMs, 0) / withClose.length
    : 0;
  return averages;
}

function computePerfPct(raw, averages, settings) {
  const w = settings.weights;
  const totalWeight =
    w.ticketKapatilan + w.kayitToplam + w.icToplam + w.destekToplam + w.ekipToplam + w.mesaj + w.hiz;
  if (totalWeight <= 0) return 0;

  const pct = (val, avg) => {
    if (avg > 0) return (val / avg) * 100;
    return val > 0 ? 100 : 100;
  };

  let sum = 0;
  sum += w.ticketKapatilan * pct(raw.ticketKapatilan, averages.ticketKapatilan);
  sum += w.kayitToplam * pct(raw.kayitToplam, averages.kayitToplam);
  sum += w.icToplam * pct(raw.icToplam, averages.icToplam);
  sum += w.destekToplam * pct(raw.destekToplam, averages.destekToplam);
  sum += w.ekipToplam * pct(raw.ekipToplam, averages.ekipToplam);
  sum += w.mesaj * pct(raw.mesaj, averages.mesaj);

  // Hız bonusu: düşük kapatma süresi daha iyi → ters orantı
  let hizPct = 100;
  if (raw.avgCloseMs > 0 && averages.avgCloseMs > 0) {
    hizPct = (averages.avgCloseMs / raw.avgCloseMs) * 100;
  }
  sum += w.hiz * hizPct;

  return sum / totalWeight;
}

/**
 * Bir hafta için tüm yetkililerin performansını hesaplar.
 * @returns {{ weekKey, averages, rows: Array }}
 */
function computeWeekly(guild, weekKey) {
  const settings = getPerformanceSettings();
  const guildId = guild.id;
  const rawMap = collectWeeklyRawStats(guildId, weekKey);

  const staffMembers = getRoleMembers(guild, getIds().staffRoleId);
  const memberById = new Map(staffMembers.map((m) => [m.id, m]));

  // Popülasyon: staff rolü + o hafta veride görünen herkes
  const population = new Set([...memberById.keys(), ...rawMap.keys()]);

  const entries = [];
  for (const uid of population) {
    const raw = rawMap.get(uid) || emptyRaw();
    entries.push({ uid, raw, active: isRawActive(raw), member: memberById.get(uid) || null });
  }

  const activeRaws = entries.filter((e) => e.active).map((e) => e.raw);
  const averages = computeAverages(activeRaws, settings);

  const rows = entries.map((e) => {
    const perfPct = computePerfPct(e.raw, averages, settings);
    return {
      uid: e.uid,
      member: e.member,
      userTag: e.member ? e.member.user.tag : '',
      displayName: e.member ? e.member.displayName || e.member.user.username : null,
      raw: e.raw,
      active: e.active,
      perfPct,
      aboveAvg: perfPct >= settings.ustEsik,
    };
  });

  rows.sort((a, b) => b.perfPct - a.perfPct);
  return { weekKey, averages, rows, settings };
}

/** Haftalık hesabı çalıştırır ve weekly_performance tablosuna kalıcı kaydeder. */
async function computeAndPersistWeek(guild, weekKey) {
  const result = computeWeekly(guild, weekKey);
  const guildId = guild.id;

  for (const row of result.rows) {
    const payload = {
      userTag: row.userTag || '',
      ticketKapatilan: row.raw.ticketKapatilan,
      ticketIlgilenilen: row.raw.ticketIlgilenilen,
      kayitToplam: row.raw.kayitToplam,
      icToplam: row.raw.icToplam,
      destekToplam: row.raw.destekToplam,
      ekipToplam: row.raw.ekipToplam,
      mesaj: row.raw.mesaj,
      voiceMs: row.raw.voiceMs,
      avgCloseMs: row.raw.avgCloseMs,
      perfPct: Math.round(row.perfPct * 100) / 100,
      aboveAvg: row.aboveAvg,
      active: row.active,
      averages: result.averages,
    };

    const existing = await WeeklyPerformance.findOne({
      guildId,
      userId: row.uid,
      weekKey,
    });

    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
    } else {
      await WeeklyPerformance.create({ guildId, userId: row.uid, weekKey, ...payload });
    }
  }

  return result;
}

/** weekly_performance'tan bir haftanın kayıtlarını okur (perf'e göre azalan). */
async function getStoredWeek(guildId, weekKey) {
  const rows = await WeeklyPerformance.find({ guildId, weekKey }).sort({ perfPct: -1 }).lean();
  return rows;
}

/** Bir kullanıcının son N haftalık kaydı (yeni→eski). */
async function getUserHistory(guildId, userId, count = 4, fromDate = new Date()) {
  const weekKeys = getRecentWeekKeys(count, fromDate);
  const rows = await WeeklyPerformance.find({
    guildId,
    userId,
    weekKey: { $in: weekKeys },
  }).lean();
  const byWeek = new Map(rows.map((r) => [r.weekKey, r]));
  return weekKeys.map((wk) => ({ weekKey: wk, record: byWeek.get(wk) || null }));
}

/**
 * Bir kullanıcının verilen haftadan geriye doğru kaç hafta üst üste "üstte" (above_avg) olduğu.
 */
async function getConsecutiveWeeksAbove(guildId, userId, weekKey) {
  let streak = 0;
  let cursor = weekKey;
  for (let i = 0; i < 52; i += 1) {
    const rec = await WeeklyPerformance.findOne({ guildId, userId, weekKey: cursor }).lean();
    if (!rec || !rec.aboveAvg) break;
    streak += 1;
    cursor = getPreviousWeekKey(cursor);
  }
  return streak;
}

/**
 * Rank öneri kuralı: son N hafta üst üste >= ustEsik VE bu haftaların >= minAktif'inde aktif.
 */
async function checkRankEligibility(guildId, userId, weekKey) {
  const settings = getPerformanceSettings();
  const need = settings.oneriHaftaSayisi;
  const minActive = settings.oneriMinAktifHafta;

  let cursor = weekKey;
  let aboveCount = 0;
  let activeCount = 0;
  const records = [];
  for (let i = 0; i < need; i += 1) {
    const rec = await WeeklyPerformance.findOne({ guildId, userId, weekKey: cursor }).lean();
    if (!rec) break;
    records.push(rec);
    if (rec.aboveAvg) aboveCount += 1;
    if (rec.active) activeCount += 1;
    cursor = getPreviousWeekKey(cursor);
  }

  const eligible = aboveCount >= need && activeCount >= minActive;
  return { eligible, aboveCount, activeCount, need, minActive, records };
}

/**
 * Bir hafta hesaplandıktan sonra rank önerisi üretilmesi gereken yetkilileri bulur.
 * Daha önce o hafta için kayıt yoksa pending RankSuggestionLog oluşturur.
 * @returns yeni oluşturulan öneri kayıtları (model dokümanları)
 */
async function evaluateRankSuggestions(guild, weekKey) {
  const guildId = guild.id;
  const week = await getStoredWeek(guildId, weekKey);
  const created = [];

  for (const row of week) {
    if (!row.aboveAvg) continue;
    const { eligible, aboveCount } = await checkRankEligibility(guildId, row.userId, weekKey);
    if (!eligible) continue;

    // Bu hafta için zaten öneri var mı?
    const existing = await RankSuggestionLog.findOne({
      guildId,
      userId: row.userId,
      weekKey,
    }).lean();
    if (existing) continue;

    // Hâlâ bekleyen (pending) bir öneri varsa tekrar üretme
    const pending = await RankSuggestionLog.findOne({
      guildId,
      userId: row.userId,
      status: 'pending',
    }).lean();
    if (pending) continue;

    const doc = await RankSuggestionLog.create({
      guildId,
      userId: row.userId,
      userTag: row.userTag || '',
      weekKey,
      weeksAbove: aboveCount,
      perfPct: row.perfPct,
      status: 'pending',
      approved: false,
    });
    created.push(doc);
  }

  return created;
}

module.exports = {
  collectWeeklyRawStats,
  computeWeekly,
  computeAndPersistWeek,
  getStoredWeek,
  getUserHistory,
  getConsecutiveWeeksAbove,
  checkRankEligibility,
  evaluateRankSuggestions,
  getIstanbulWeekKey,
  getPreviousWeekKey,
};
