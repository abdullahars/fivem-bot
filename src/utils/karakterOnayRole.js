const { getIds } = require('../config/loadConfig');

function getKarakterOnayRoleId() {
  const roleId = getIds().karakterOnayRoleId;
  if (!roleId || String(roleId).includes('ROL_ID')) return null;
  return roleId;
}

function memberHasKarakterOnay(member) {
  const roleId = getKarakterOnayRoleId();
  if (!roleId || !member) return false;
  return member.roles.cache.has(roleId);
}

/**
 * @returns {'removed' | 'none' | 'failed' | 'no_member' | 'not_configured'}
 */
async function revokeKarakterOnayRole(member) {
  const roleId = getKarakterOnayRoleId();
  if (!roleId) return 'not_configured';
  if (!member) return 'no_member';
  if (!member.roles.cache.has(roleId)) return 'none';

  try {
    await member.roles.remove(roleId, 'Ceza uygulandı');
    return 'removed';
  } catch (err) {
    console.warn('[Karakter Onay] Rol alınamadı:', err.message);
    return 'failed';
  }
}

module.exports = {
  getKarakterOnayRoleId,
  memberHasKarakterOnay,
  revokeKarakterOnayRole,
};
