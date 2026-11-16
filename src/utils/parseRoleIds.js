/** @param {string} [text] */
function parseRoleIdsFromText(text) {
  if (!text?.trim()) return [];

  const ids = [];
  const mentionRegex = /<@&(\d{17,20})>/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }

  for (const part of text.split(/[\s,]+/)) {
    const trimmed = part.trim();
    if (/^\d{17,20}$/.test(trimmed) && !ids.includes(trimmed)) {
      ids.push(trimmed);
    }
  }

  return ids;
}

module.exports = { parseRoleIdsFromText };
