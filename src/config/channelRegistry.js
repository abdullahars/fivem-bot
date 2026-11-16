const LOG = require('../constants/logChannels');

/** @type {Map<string, string>} configKey -> channelId */
const channelIdByKey = new Map();

function getChannelDefinition(key) {
  return LOG.channels[key] || null;
}

function getAllChannelKeys() {
  return Object.keys(LOG.channels);
}

function setChannelId(key, channelId) {
  if (channelId) channelIdByKey.set(key, channelId);
  else channelIdByKey.delete(key);
}

function getChannelId(key) {
  return channelIdByKey.get(key) || null;
}

/**
 * Sunucudaki kanal adlarına göre ID önbelleğini günceller.
 */
function syncChannelsFromGuild(guild) {
  if (!guild) return { found: 0, total: getAllChannelKeys().length, missing: [] };

  const missing = [];
  let found = 0;

  for (const key of getAllChannelKeys()) {
    const def = LOG.channels[key];
    const match = guild.channels.cache.find(
      (ch) => ch.isTextBased?.() && ch.name === def.name
    );

    if (match) {
      setChannelId(key, match.id);
      found += 1;
    } else {
      setChannelId(key, null);
      missing.push(def.name);
    }
  }

  const { ChannelType } = require('discord.js');
  const category = guild.channels.cache.find(
    (ch) => ch.type === ChannelType.GuildCategory && ch.name === LOG.categoryName
  );
  if (category) setChannelId('_logCategory', category.id);

  return { found, total: getAllChannelKeys().length, missing };
}

function getLogCategoryId() {
  return getChannelId('_logCategory');
}

function clearChannelCache() {
  channelIdByKey.clear();
}

module.exports = {
  LOG,
  getChannelDefinition,
  getAllChannelKeys,
  getChannelId,
  setChannelId,
  syncChannelsFromGuild,
  getLogCategoryId,
  clearChannelCache,
};
