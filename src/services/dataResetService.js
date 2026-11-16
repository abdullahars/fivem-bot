const { getDb } = require('../database/sqlite/db');

/**
 * Sıfırlanabilir tablo tanımları.
 *  - idCols  : kullanıcı ID'sinin tutulduğu sütunlar (per-user/role eşleşmesi için)
 *  - jsonCols: kullanıcı ID'sinin JSON metni içinde geçtiği sütunlar (LIKE eşleşmesi)
 *
 * Bilerek HARİÇ tutulanlar (asla sıfırlanmaz):
 *  - member_flow_logs (giriş/çıkış), member_invite_records (davet)
 *  - tickets, ekip_tickets, ekips, giveaways, meslek_assignments,
 *    channel_locks, mulakat_queue, meetings, ic_isim_pending,
 *    guild_daily_reports, counters, guild_role_blacklists
 */
const TABLE_SPECS = {
  stats: [
    { table: 'staff_stats', idCols: ['user_id'] },
    { table: 'user_activity', idCols: ['user_id'] },
    { table: 'user_daily_activity', idCols: ['user_id'] },
    { table: 'user_channel_stats', idCols: ['user_id'] },
    { table: 'meeting_voice_sessions', idCols: ['user_id'] },
  ],
  puan: [
    { table: 'kayit_puanlari', idCols: ['voter_id', 'staff_id'] },
  ],
  coin: [
    { table: 'coin_balances', idCols: ['user_id'] },
    { table: 'coin_purchases', idCols: ['user_id'] },
  ],
  sicil: [
    { table: 'penalties', idCols: ['target_id', 'staff_id'] },
    { table: 'whitelist_logs', idCols: ['target_id', 'staff_id'] },
    { table: 'ban_logs', idCols: ['target_id', 'staff_id'] },
    { table: 'blacklist_logs', idCols: ['user_id', 'staff_id'] },
    { table: 'ic_isim_logs', idCols: ['target_id', 'staff_id'] },
    { table: 'role_logs', idCols: ['target_id', 'executor_id'] },
    { table: 'role_manage_logs', idCols: ['target_id', 'staff_id'] },
    { table: 'mazarets', idCols: ['user_id'] },
    { table: 'supports', idCols: [], jsonCols: ['receivers', 'providers', 'created_by'] },
  ],
};

function expandCategories(categories) {
  const list = Array.isArray(categories) ? categories : [categories];
  if (list.includes('all')) return ['stats', 'puan', 'sicil', 'coin'];
  return [...new Set(list)].filter((c) => TABLE_SPECS[c]);
}

function specsFor(categories) {
  const specs = [];
  for (const cat of expandCategories(categories)) {
    specs.push(...TABLE_SPECS[cat]);
  }
  return specs;
}

function runInTransaction(fn) {
  const db = getDb();
  db.exec('BEGIN');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch (_) {
      /* yoksay */
    }
    throw err;
  }
}

/** Bir kategori için sunucudaki toplam kayıt sayısını döner. */
function getGuildDataSummary(guildId) {
  const db = getDb();
  const summary = {};
  for (const [cat, specs] of Object.entries(TABLE_SPECS)) {
    let total = 0;
    for (const spec of specs) {
      try {
        const row = db
          .prepare(`SELECT COUNT(*) AS c FROM ${spec.table} WHERE guild_id = ?`)
          .get(guildId);
        total += row?.c || 0;
      } catch (_) {
        /* tablo yoksa yoksay */
      }
    }
    summary[cat] = total;
  }
  return summary;
}

function sumCounts(counts) {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

/** Tüm sunucu için seçili kategorileri sıfırlar. */
function resetGuild(guildId, categories) {
  const specs = specsFor(categories);
  return runInTransaction((db) => {
    const counts = {};
    for (const spec of specs) {
      const res = db
        .prepare(`DELETE FROM ${spec.table} WHERE guild_id = ?`)
        .run(guildId);
      counts[spec.table] = (counts[spec.table] || 0) + Number(res.changes || 0);
    }
    return counts;
  });
}

/** Belirli kullanıcı(lar) için seçili kategorileri sıfırlar. */
function resetForUsers(guildId, userIds, categories) {
  const ids = [...new Set((userIds || []).map(String))].filter(Boolean);
  if (ids.length === 0) return {};

  const specs = specsFor(categories);
  const placeholders = ids.map(() => '?').join(', ');

  return runInTransaction((db) => {
    const counts = {};

    for (const spec of specs) {
      let changes = 0;

      if (spec.idCols?.length) {
        const conds = spec.idCols.map((c) => `${c} IN (${placeholders})`).join(' OR ');
        const params = [guildId];
        for (let i = 0; i < spec.idCols.length; i += 1) params.push(...ids);
        const res = db
          .prepare(`DELETE FROM ${spec.table} WHERE guild_id = ? AND (${conds})`)
          .run(...params);
        changes += Number(res.changes || 0);
      }

      if (spec.jsonCols?.length) {
        const likeParts = [];
        const likeParams = [guildId];
        for (const col of spec.jsonCols) {
          for (const id of ids) {
            likeParts.push(`${col} LIKE ?`);
            likeParams.push(`%${id}%`);
          }
        }
        const res = db
          .prepare(
            `DELETE FROM ${spec.table} WHERE guild_id = ? AND (${likeParts.join(' OR ')})`
          )
          .run(...likeParams);
        changes += Number(res.changes || 0);
      }

      counts[spec.table] = (counts[spec.table] || 0) + changes;
    }

    return counts;
  });
}

function resetForUser(guildId, userId, categories) {
  return resetForUsers(guildId, [userId], categories);
}

module.exports = {
  TABLE_SPECS,
  expandCategories,
  getGuildDataSummary,
  resetGuild,
  resetForUsers,
  resetForUser,
  sumCounts,
};
