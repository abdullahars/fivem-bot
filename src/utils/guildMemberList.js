const { Routes } = require('discord.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(err) {
  if (err?.data?.retry_after != null) {
    return Math.ceil(Number(err.data.retry_after) * 1000) + 200;
  }
  if (err?.retryAfter != null) {
    return Math.ceil(Number(err.retryAfter) * 1000) + 200;
  }
  if (err?.rawError?.retry_after != null) {
    return Math.ceil(Number(err.rawError.retry_after) * 1000) + 200;
  }
  return 1500;
}

function isRateLimitError(err) {
  return (
    err?.status === 429 ||
    err?.code === 429 ||
    err?.name === 'GatewayRateLimitError' ||
    err?.name === 'RateLimitError'
  );
}

async function withRateLimitRetry(fn, maxAttempts = 6) {
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err) || attempt === maxAttempts - 1) {
        throw err;
      }
      await sleep(getRetryAfterMs(err));
    }
  }
  throw lastErr;
}

/**
 * Üye listesini REST ile çeker (Gateway opcode 8 / toplu fetch kullanmaz).
 */
async function fetchAllGuildMembersRest(guild) {
  const all = [];
  let after;

  while (true) {
    const page = await withRateLimitRetry(() => {
      const query = { limit: 1000 };
      if (after) query.after = after;
      return guild.client.rest.get(Routes.guildMembers(guild.id), { query });
    });

    all.push(...page);
    if (page.length < 1000) break;
    after = page[page.length - 1].user.id;
    await sleep(350);
  }

  return all;
}

module.exports = {
  sleep,
  withRateLimitRetry,
  fetchAllGuildMembersRest,
  isRateLimitError,
  getRetryAfterMs,
};
