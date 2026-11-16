/**
 * Rol üyelerini role.members önbelleğinden döner — guild.members.fetch() gerektirmez.
 */
function getRoleMembers(guild, roleId, { includeBots = false } = {}) {
  if (!guild || !roleId || String(roleId).includes('ROL_ID')) return [];

  const role = guild.roles.cache.get(roleId);
  if (!role) return [];

  const members = [...role.members.values()];
  return includeBots ? members : members.filter((m) => !m.user.bot);
}

module.exports = { getRoleMembers };
