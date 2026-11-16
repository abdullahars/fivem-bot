const CUSTOM_EMOJI_RE = /^<a?:([\w~]+):(\d{17,20})>$/;
const SNOWFLAKE_RE = /^\d{17,20}$/;

const UNICODE_ALIASES = {
  white_check_mark: '✅',
  check_mark: '✅',
  heavy_check_mark: '✅',
  x: '❌',
  cross_mark: '❌',
  negative_squared_cross_mark: '❌',
};

function normalizeEmoji(str) {
  return String(str || '')
    .replace(/\uFE0F/g, '')
    .trim();
}

function parseEmojiConfig(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;

  const custom = value.match(CUSTOM_EMOJI_RE);
  if (custom) {
    return { type: 'custom', id: custom[2], name: custom[1], raw: value };
  }

  if (SNOWFLAKE_RE.test(value)) {
    return { type: 'custom', id: value, name: 'emoji', raw: value };
  }

  return { type: 'unicode', unicode: normalizeEmoji(value), raw: value };
}

function emojiMatches(reaction, configEmoji) {
  const parsed = parseEmojiConfig(configEmoji);
  if (!parsed) return false;

  if (parsed.type === 'custom' && reaction.emoji?.id) {
    return reaction.emoji.id === parsed.id;
  }

  const target = parsed.unicode || normalizeEmoji(configEmoji);
  const candidates = [
    reaction.emoji?.name,
    reaction.emoji?.toString?.(),
    reaction.emoji?.identifier,
    UNICODE_ALIASES[reaction.emoji?.name],
  ]
    .filter(Boolean)
    .map(normalizeEmoji);

  return candidates.some((c) => c === target);
}

function buttonEmoji(configEmoji) {
  const parsed = parseEmojiConfig(configEmoji);
  if (!parsed) return undefined;
  if (parsed.type === 'custom') {
    return { id: parsed.id, name: parsed.name };
  }
  return parsed.unicode;
}

async function reactWithConfigEmoji(message, configEmoji) {
  const parsed = parseEmojiConfig(configEmoji);
  if (!parsed) throw new Error('Geçersiz emoji ayarı');

  if (parsed.type === 'custom') {
    return message.react({ id: parsed.id, name: parsed.name });
  }

  return message.react(parsed.unicode);
}

module.exports = {
  parseEmojiConfig,
  normalizeEmoji,
  emojiMatches,
  buttonEmoji,
  reactWithConfigEmoji,
};
