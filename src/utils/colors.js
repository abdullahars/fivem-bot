const DEFAULT_EMBED_COLOR = 0x393a41;

/** #2C2D32 veya config hex → Discord renk sayısı */
function parseEmbedColor(hex) {
  if (!hex) return DEFAULT_EMBED_COLOR;
  const cleaned = String(hex).replace('#', '').trim();
  return parseInt(cleaned, 16) || DEFAULT_EMBED_COLOR;
}

module.exports = { DEFAULT_EMBED_COLOR, parseEmbedColor };
