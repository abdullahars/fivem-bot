const { UserDailyActivity } = require('../database/models/UserDailyActivity');
const { getDb } = require('../database/sqlite/db');
const { getIstanbulDateKey } = require('../utils/istanbulTime');

async function bumpDaily(guildId, userId, fields) {
  if (!guildId || !userId) return;

  const inc = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value > 0) inc[key] = value;
  }
  if (!Object.keys(inc).length) return;

  const dateKey = getIstanbulDateKey();
  await UserDailyActivity.findOneAndUpdate(
    { guildId, userId, dateKey },
    { $inc: inc },
    { upsert: true }
  ).catch((err) => {
    console.warn('[DailyActivity]', err.message);
  });
}

async function bumpDailyMessage(guildId, userId) {
  return bumpDaily(guildId, userId, { messageCount: 1 });
}

async function bumpDailyVoiceTime(guildId, userId, ms) {
  if (!ms || ms <= 0) return;
  return bumpDaily(guildId, userId, { voiceTimeMs: ms });
}

async function bumpDailyVoiceJoin(guildId, userId) {
  return bumpDaily(guildId, userId, { voiceJoins: 1 });
}

async function getGuildDailyActivityTotals(guildId, dateKey) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        COALESCE(SUM(message_count), 0) AS messages,
        COALESCE(SUM(voice_time_ms), 0) AS voiceMs,
        COALESCE(SUM(voice_joins), 0) AS voiceJoins,
        COUNT(CASE WHEN voice_time_ms > 0 OR voice_joins > 0 THEN 1 END) AS voiceActiveUsers
      FROM user_daily_activity
      WHERE guild_id = ? AND date_key = ?`
    )
    .get(guildId, dateKey);

  return {
    messages: row?.messages ?? 0,
    voiceMs: row?.voiceMs ?? 0,
    voiceJoins: row?.voiceJoins ?? 0,
    voiceActiveUsers: row?.voiceActiveUsers ?? 0,
  };
}

module.exports = {
  bumpDailyMessage,
  bumpDailyVoiceTime,
  bumpDailyVoiceJoin,
  getGuildDailyActivityTotals,
};
