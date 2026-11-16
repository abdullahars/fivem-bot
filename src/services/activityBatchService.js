const { getDb } = require('../database/sqlite/db');
const { getIstanbulDateKey } = require('../utils/istanbulTime');

const FLUSH_MS = 5000;
const FLUSH_MAX_ENTRIES = 80;

/** @type {Map<string, { guildId: string, userId: string, channelId: string, count: number }>} */
const pending = new Map();
let flushTimer = null;
let flushing = false;

function entryKey(guildId, userId, channelId) {
  return `${guildId}:${userId}:${channelId}`;
}

function scheduleFlush() {
  if (flushTimer) return;
  if (pending.size >= FLUSH_MAX_ENTRIES) {
    flush().catch((err) => console.warn('[ActivityBatch]', err.message));
    return;
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush().catch((err) => console.warn('[ActivityBatch]', err.message));
  }, FLUSH_MS);
}

function queueMessageIncrement(guildId, userId, channelId) {
  if (!guildId || !userId) return;

  const key = entryKey(guildId, userId, channelId || '');
  const existing = pending.get(key);
  if (existing) {
    existing.count += 1;
  } else {
    pending.set(key, {
      guildId,
      userId,
      channelId: channelId || '',
      count: 1,
    });
  }
  scheduleFlush();
}

function flushPendingBatch(batch, dateKey) {
  const db = getDb();
  const now = new Date().toISOString();

  const activityStmt = db.prepare(`
    INSERT INTO user_activity (guild_id, user_id, message_count, voice_time_ms, created_at, updated_at)
    VALUES (?, ?, ?, 0, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      message_count = message_count + excluded.message_count,
      updated_at = excluded.updated_at
  `);

  const channelStmt = db.prepare(`
    INSERT INTO user_channel_stats (guild_id, user_id, channel_id, message_count, voice_time_ms, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
    ON CONFLICT(guild_id, user_id, channel_id) DO UPDATE SET
      message_count = message_count + excluded.message_count,
      updated_at = excluded.updated_at
  `);

  const dailyStmt = db.prepare(`
    INSERT INTO user_daily_activity (guild_id, user_id, date_key, message_count, voice_time_ms, voice_joins, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, 0, ?, ?)
    ON CONFLICT(guild_id, user_id, date_key) DO UPDATE SET
      message_count = message_count + excluded.message_count,
      updated_at = excluded.updated_at
  `);

  const dailyTotals = new Map();

  db.exec('BEGIN');
  try {
    for (const item of batch) {
      activityStmt.run(item.guildId, item.userId, item.count, now, now);

      if (item.channelId) {
        channelStmt.run(item.guildId, item.userId, item.channelId, item.count, now, now);
      }

      const dailyKey = `${item.guildId}:${item.userId}`;
      dailyTotals.set(dailyKey, (dailyTotals.get(dailyKey) || 0) + item.count);
    }

    for (const [dailyKey, count] of dailyTotals) {
      const [guildId, userId] = dailyKey.split(':');
      dailyStmt.run(guildId, userId, dateKey, count, now, now);
    }

    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch (_) {
      /* yoksay */
    }
    throw err;
  }
}

async function flush() {
  if (flushing || pending.size === 0) return;
  flushing = true;

  try {
    const batch = [...pending.values()];
    pending.clear();
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushPendingBatch(batch, getIstanbulDateKey());
  } finally {
    flushing = false;
  }
}

function registerActivityBatchShutdown() {
  const shutdown = () => {
    flush().catch(() => {});
  };
  process.once('beforeExit', shutdown);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

module.exports = {
  queueMessageIncrement,
  flush,
  registerActivityBatchShutdown,
};
