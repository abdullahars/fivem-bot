const { CoinBalance, CoinShopItem, CoinPurchase } = require('../database/models/Coin');
const { getCoinSettings, getIds, setConfigValue } = require('../config/loadConfig');
const { sendLogText } = require('../utils/logChannel');
const { isStaff } = require('../utils/permissions');
const { getIstanbulDateKey } = require('../utils/istanbulTime');
const COIN = require('../constants/coin');

const HOUR_MS = 3600000;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Sayıyı temiz biçimde gösterir: tam sayıysa ondalıksız, değilse 2 haneye kadar. */
function formatCoin(n) {
  const v = round2(n);
  if (Number.isInteger(v)) return String(v);
  return String(v).replace(/\.?0+$/, '');
}

async function getOrCreateBalance(guildId, userId) {
  let bal = await CoinBalance.findOne({ guildId, userId });
  if (!bal) {
    bal = await CoinBalance.create({
      guildId,
      userId,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      voiceMsRemainder: 0,
    });
  }
  return bal;
}

async function getBalance(guildId, userId) {
  const bal = await CoinBalance.findOne({ guildId, userId });
  return {
    balance: round2(bal?.balance || 0),
    totalEarned: round2(bal?.totalEarned || 0),
    totalSpent: round2(bal?.totalSpent || 0),
  };
}

function resolveGuild(guildId) {
  return global.client?.guilds?.cache?.get(guildId) || null;
}

function fmt(str, vars) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
    str
  );
}

async function logEarn(guildId, userId, amount, reasonKey, newBalance) {
  const guild = resolveGuild(guildId);
  if (!guild) return;
  const channelId = getIds().puanLogChannelId;
  if (!channelId) return;

  const content = fmt(COIN.messages.logEarn, {
    user: `<@${userId}>`,
    amount: formatCoin(amount),
    reason: COIN.reasons[reasonKey] || reasonKey,
    balance: formatCoin(newBalance),
  });
  await sendLogText(guild, channelId, content).catch(() => {});
}

async function logSpend(guildId, userId, itemName, cost, newBalance) {
  const guild = resolveGuild(guildId);
  if (!guild) return;
  const channelId = getIds().puanLogChannelId;
  if (!channelId) return;

  const content = fmt(COIN.messages.logSpend, {
    user: `<@${userId}>`,
    name: itemName,
    cost: formatCoin(cost),
    balance: formatCoin(newBalance),
  });
  await sendLogText(guild, channelId, content).catch(() => {});
}

/** Belirli güne dağıtılan coin toplamını artırır (günlük rapor için). */
function trackDailyDistribution(guildId, amount) {
  try {
    const { getDb } = require('../database/sqlite/db');
    const now = new Date().toISOString();
    const dateKey = getIstanbulDateKey();
    getDb()
      .prepare(
        `INSERT INTO coin_daily_totals (guild_id, date_key, total_distributed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(guild_id, date_key)
         DO UPDATE SET total_distributed = total_distributed + excluded.total_distributed,
                       updated_at = excluded.updated_at`
      )
      .run(guildId, dateKey, round2(amount), now, now);
  } catch (err) {
    console.warn('[Coin] günlük dağıtım kaydı:', err?.message || err);
  }
}

/** Bir gün için sunucuda dağıtılan toplam coin. */
function getDailyDistributedCoins(guildId, dateKey) {
  try {
    const { getDb } = require('../database/sqlite/db');
    const row = getDb()
      .prepare(
        'SELECT total_distributed AS total FROM coin_daily_totals WHERE guild_id = ? AND date_key = ?'
      )
      .get(guildId, dateKey);
    return round2(row?.total || 0);
  } catch (_) {
    return 0;
  }
}

/** Coin ekler ve puan-log'a metin olarak loglar. */
async function addCoins(guildId, userId, amount, reasonKey) {
  const amt = round2(amount);
  if (amt <= 0) return null;

  const bal = await getOrCreateBalance(guildId, userId);
  bal.balance = round2((bal.balance || 0) + amt);
  bal.totalEarned = round2((bal.totalEarned || 0) + amt);
  await bal.save();

  trackDailyDistribution(guildId, amt);
  await logEarn(guildId, userId, amt, reasonKey, bal.balance);
  return bal;
}

async function logManual(guildId, mode, targetId, amount, newBalance, adminId) {
  const guild = resolveGuild(guildId);
  if (!guild) return;
  const channelId = getIds().puanLogChannelId;
  if (!channelId) return;

  const tpl = mode === 'add' ? COIN.messages.logManualAdd : COIN.messages.logManualRemove;
  const content = fmt(tpl, {
    admin: adminId ? `<@${adminId}>` : 'Yönetim',
    user: `<@${targetId}>`,
    amount: formatCoin(amount),
    balance: formatCoin(newBalance),
  });
  await sendLogText(guild, channelId, content).catch(() => {});
}

/** Owner panelinden manuel coin ekler. */
async function adminAddCoins(guildId, userId, amount, adminId) {
  const amt = round2(amount);
  if (amt <= 0) return null;

  const bal = await getOrCreateBalance(guildId, userId);
  bal.balance = round2((bal.balance || 0) + amt);
  bal.totalEarned = round2((bal.totalEarned || 0) + amt);
  await bal.save();

  trackDailyDistribution(guildId, amt);
  await logManual(guildId, 'add', userId, amt, bal.balance, adminId);
  return { amount: amt, balance: bal.balance };
}

/** Owner panelinden manuel coin siler (0'ın altına inmez). */
async function adminRemoveCoins(guildId, userId, amount, adminId) {
  const amt = round2(amount);
  if (amt <= 0) return null;

  const bal = await getOrCreateBalance(guildId, userId);
  const actual = round2(Math.min(bal.balance || 0, amt));
  bal.balance = round2((bal.balance || 0) - actual);
  await bal.save();

  await logManual(guildId, 'remove', userId, actual, bal.balance, adminId);
  return { amount: actual, balance: bal.balance };
}

/** Ticket/kayıt/ic isim gibi aksiyon başına coin verir (statsService'ten çağrılır). */
async function earnAction(guildId, userId, rateKey) {
  const settings = getCoinSettings();
  if (!settings.enabled) return;
  const rate = settings.rates[rateKey];
  if (!rate || rate <= 0) return;
  await addCoins(guildId, userId, rate, rateKey).catch((err) => {
    console.warn('[Coin] earnAction:', err?.message || err);
  });
}

/** Seste geçirilen süreyi saat başına coine çevirir (yalnızca staff). */
async function awardVoiceMs(guildId, userId, ms) {
  const settings = getCoinSettings();
  if (!settings.enabled || settings.rates.voiceHour <= 0 || !ms || ms <= 0) return;

  const guild = resolveGuild(guildId);
  const member = guild?.members?.cache?.get(userId);
  if (!member || !isStaff(member)) return;

  const bal = await getOrCreateBalance(guildId, userId);
  const total = (bal.voiceMsRemainder || 0) + ms;
  const hours = Math.floor(total / HOUR_MS);
  bal.voiceMsRemainder = total % HOUR_MS;

  if (hours > 0) {
    const amount = round2(hours * settings.rates.voiceHour);
    bal.balance = round2((bal.balance || 0) + amount);
    bal.totalEarned = round2((bal.totalEarned || 0) + amount);
    await bal.save();
    trackDailyDistribution(guildId, amount);
    await logEarn(guildId, userId, amount, 'voiceHour', bal.balance);
  } else {
    await bal.save();
  }
}

// ---- Dükkan ----

async function listShopItems(guildId, { activeOnly = false } = {}) {
  const filter = { guildId };
  if (activeOnly) filter.active = true;
  return CoinShopItem.find(filter).sort({ cost: 1 });
}

async function getShopItem(itemId) {
  return CoinShopItem.findById(itemId);
}

async function createShopItem(guildId, { name, description, cost, stock, createdById }) {
  return CoinShopItem.create({
    guildId,
    name,
    description: description || '',
    cost: round2(cost),
    stock: Number.isFinite(stock) ? Math.trunc(stock) : -1,
    active: true,
    createdById,
  });
}

async function updateShopItem(itemId, fields) {
  const item = await CoinShopItem.findById(itemId);
  if (!item) return null;
  if (fields.name !== undefined) item.name = fields.name;
  if (fields.description !== undefined) item.description = fields.description;
  if (fields.cost !== undefined) item.cost = round2(fields.cost);
  if (fields.stock !== undefined) {
    item.stock = Number.isFinite(fields.stock) ? Math.trunc(fields.stock) : -1;
  }
  if (fields.active !== undefined) item.active = fields.active;
  await item.save();
  return item;
}

async function deleteShopItem(itemId) {
  return CoinShopItem.deleteOne({ _id: itemId });
}

async function buyShopItem(guild, user, itemId) {
  const settings = getCoinSettings();
  if (!settings.enabled) return { ok: false, message: COIN.messages.disabled };

  const item = await CoinShopItem.findById(itemId);
  if (!item || item.guildId !== guild.id) {
    return { ok: false, message: COIN.messages.buyInactive };
  }
  if (!item.active) return { ok: false, message: COIN.messages.buyInactive };
  if (item.stock === 0) return { ok: false, message: COIN.messages.buyOutOfStock };

  const bal = await getOrCreateBalance(guild.id, user.id);
  if ((bal.balance || 0) < item.cost) {
    return {
      ok: false,
      message: fmt(COIN.messages.buyInsufficient, {
        cost: formatCoin(item.cost),
        balance: formatCoin(bal.balance || 0),
      }),
    };
  }

  bal.balance = round2((bal.balance || 0) - item.cost);
  bal.totalSpent = round2((bal.totalSpent || 0) + item.cost);
  await bal.save();

  if (item.stock > 0) {
    item.stock -= 1;
    await item.save();
  }

  await CoinPurchase.create({
    guildId: guild.id,
    userId: user.id,
    userTag: user.tag,
    itemId: Number(item._id),
    itemName: item.name,
    cost: item.cost,
  });

  await logSpend(guild.id, user.id, item.name, item.cost, bal.balance);

  return {
    ok: true,
    message: fmt(COIN.messages.buySuccess, {
      name: item.name,
      cost: formatCoin(item.cost),
      balance: formatCoin(bal.balance),
    }),
  };
}

// ---- Oran düzenleme ----

function setRate(rateKey, value) {
  const path = COIN.rateKeys[rateKey]?.path;
  if (!path) return false;
  setConfigValue(path, round2(value));
  return true;
}

// ---- Sıfırlama ----

async function resetAllCoins(guildId) {
  const { getDb } = require('../database/sqlite/db');
  const res = getDb()
    .prepare('DELETE FROM coin_balances WHERE guild_id = ?')
    .run(guildId);
  return Number(res.changes || 0);
}

function buildRatesList() {
  const settings = getCoinSettings();
  return Object.entries(COIN.rateKeys)
    .map(([key, def]) =>
      fmt(COIN.messages.rateLine, {
        label: def.label,
        value: formatCoin(settings.rates[key] || 0),
      })
    )
    .join('\n');
}

module.exports = {
  round2,
  formatCoin,
  getBalance,
  getOrCreateBalance,
  addCoins,
  earnAction,
  awardVoiceMs,
  listShopItems,
  getShopItem,
  createShopItem,
  updateShopItem,
  deleteShopItem,
  buyShopItem,
  setRate,
  resetAllCoins,
  buildRatesList,
  getDailyDistributedCoins,
  adminAddCoins,
  adminRemoveCoins,
};
