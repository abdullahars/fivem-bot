/** Discord.js V2 butonlarında emoji obje formatı gerekir */
function applyButtonEmoji(button, emoji) {
  if (!emoji) return button;

  const customMatch = emoji.match(/^<a?:(\w+):(\d+)>$/);
  if (customMatch) {
    return button.setEmoji({ name: customMatch[1], id: customMatch[2] });
  }

  if (/^\d+$/.test(emoji)) {
    return button.setEmoji({ id: emoji });
  }

  return button.setEmoji({ name: emoji });
}

module.exports = { applyButtonEmoji };
