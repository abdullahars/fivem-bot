const channelCache = new Map();

function cacheKey(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

async function getTextChannel(guild, channelId) {
  if (!channelId || String(channelId).includes('KANAL')) return null;

  const key = cacheKey(guild.id, channelId);
  if (channelCache.has(key)) {
    const cached = channelCache.get(key);
    return cached?.isTextBased() ? cached : null;
  }

  const fromCache = guild.channels.cache.get(channelId);
  if (fromCache?.isTextBased()) {
    channelCache.set(key, fromCache);
    return fromCache;
  }

  try {
    const fetched = await guild.channels.fetch(channelId);
    if (fetched?.isTextBased()) {
      channelCache.set(key, fetched);
      return fetched;
    }
    channelCache.set(key, null);
    return null;
  } catch {
    channelCache.set(key, null);
    return null;
  }
}

async function sendLogEmbed(guild, channelId, embed) {
  const channel = await getTextChannel(guild, channelId);
  if (!channel) {
    console.warn('[Log] Kanal bulunamadı:', channelId);
    return false;
  }
  await channel.send({ embeds: [embed] });
  return true;
}

async function sendLogText(guild, channelId, content) {
  const channel = await getTextChannel(guild, channelId);
  if (!channel) {
    console.warn('[Log] Kanal bulunamadı:', channelId);
    return false;
  }
  await channel.send({ content });
  return true;
}

module.exports = { getTextChannel, sendLogEmbed, sendLogText };
