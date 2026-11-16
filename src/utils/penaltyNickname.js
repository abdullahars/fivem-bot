const PENALTY_SUFFIX_RE = /\s*\(\d{1,2}\/\d{1,2}\/\d{4}\)\s*$/;

function formatPenaltyExpiryDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function stripPenaltySuffix(name) {
  return String(name || '').replace(PENALTY_SUFFIX_RE, '').trim();
}

function getMemberBaseName(member) {
  const raw =
    member.nickname ||
    member.displayName ||
    member.user?.displayName ||
    member.user?.username ||
    'Oyuncu';
  return stripPenaltySuffix(raw) || member.user.username;
}

function buildPenaltyNickname(member, expiresAt) {
  const base = getMemberBaseName(member);
  const suffix = ` (${formatPenaltyExpiryDate(expiresAt)})`;
  const maxBaseLen = Math.max(1, 32 - suffix.length);
  const trimmedBase =
    base.length > maxBaseLen ? base.slice(0, maxBaseLen).trimEnd() : base;
  return `${trimmedBase}${suffix}`;
}

async function applyPenaltyNickname(member, expiresAt) {
  if (!member?.manageable) return false;

  const nickname = buildPenaltyNickname(member, expiresAt);
  try {
    await member.setNickname(nickname, 'Ceza süresi işaretlendi');
    return true;
  } catch (err) {
    console.warn('[Ceza] Takma ad güncellenemedi:', err.message);
    return false;
  }
}

module.exports = {
  formatPenaltyExpiryDate,
  stripPenaltySuffix,
  buildPenaltyNickname,
  applyPenaltyNickname,
};
