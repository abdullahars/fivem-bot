const { GuildRoleBlacklist } = require('../database/models/GuildRoleBlacklist');
const BL = require('../constants/blRol');
const { formatTemplate } = require('../utils/format');
const { isUstYonetim } = require('../utils/permissions');

async function getBlacklistDoc(guildId) {
  let doc = await GuildRoleBlacklist.findOne({ guildId });
  if (!doc) {
    doc = await GuildRoleBlacklist.create({
      guildId,
      roleIds: [],
      exemptRoles: [],
    });
  }
  if (!Array.isArray(doc.exemptRoles)) doc.exemptRoles = [];
  return doc;
}

async function getBlockedRoleIdSet(guildId) {
  const doc = await getBlacklistDoc(guildId);
  return new Set(doc.roleIds || []);
}

async function isRoleBlocked(guildId, roleId) {
  const set = await getBlockedRoleIdSet(guildId);
  return set.has(roleId);
}

function formatRoleBlockedMessage(role) {
  return formatTemplate(BL.messages.blocked, {
    role: role?.name || role?.id || 'Rol',
  });
}

function actorCanManageBlRole(doc, roleId, actorMember) {
  if (!actorMember || !roleId) return false;
  const exemptRoles = doc.exemptRoles || [];
  for (const entry of exemptRoles) {
    if (!entry?.exemptRoleId) continue;
    if (!actorMember.roles.cache.has(entry.exemptRoleId)) continue;
    if ((entry.allowedBlRoleIds || []).includes(roleId)) return true;
  }
  return false;
}

async function getRoleBlockedMessage(guildId, role, actorMember, options = {}) {
  const { exemptUstYonetim = true } = options;
  if (!role) return null;
  if (exemptUstYonetim && actorMember && isUstYonetim(actorMember)) return null;
  if (!(await isRoleBlocked(guildId, role.id))) return null;

  const doc = await getBlacklistDoc(guildId);
  if (actorMember && actorCanManageBlRole(doc, role.id, actorMember)) {
    return null;
  }

  return formatRoleBlockedMessage(role);
}

function formatRoleMention(guild, id) {
  return guild.roles.cache.get(id)?.toString() || `\`#${id}\``;
}

function formatRoleList(guild, roleIds) {
  if (!roleIds.length) return BL.panel.blEmpty;
  return roleIds
    .map((id) => {
      const role = guild.roles.cache.get(id);
      return role
        ? formatTemplate(BL.panel.blLine, { role: role.toString() })
        : formatTemplate(BL.panel.blUnknown, { id });
    })
    .join('\n');
}

function formatExemptList(guild, exemptRoles) {
  if (!exemptRoles.length) return BL.panel.exemptEmpty;
  return exemptRoles
    .map((entry) => {
      const exempt = formatRoleMention(guild, entry.exemptRoleId);
      const allowed = (entry.allowedBlRoleIds || [])
        .map((id) => formatRoleMention(guild, id))
        .join(', ');
      if (!allowed) {
        return formatTemplate(BL.panel.exemptLineEmpty, { exempt });
      }
      return formatTemplate(BL.panel.exemptLine, { exempt, allowed });
    })
    .join('\n\n');
}

async function getPanelData(guild) {
  const doc = await getBlacklistDoc(guild.id);
  return {
    roleIds: doc.roleIds || [],
    exemptRoles: doc.exemptRoles || [],
  };
}

function resolveValidRoleIds(guild, roleIds) {
  return roleIds.filter((id) => id !== guild.id && guild.roles.cache.has(id));
}

async function addBlockedRoles(guild, roleIds) {
  const doc = await getBlacklistDoc(guild.id);
  const existing = new Set(doc.roleIds || []);
  const added = [];
  const skipped = [];

  for (const id of roleIds) {
    if (id === guild.id) continue;
    if (existing.has(id)) {
      skipped.push(id);
      continue;
    }
    existing.add(id);
    added.push(id);
  }

  doc.roleIds = [...existing];
  await doc.save();
  return { added, skipped };
}

async function removeBlockedRoles(guild, roleIds) {
  const doc = await getBlacklistDoc(guild.id);
  const existing = new Set(doc.roleIds || []);
  const removed = [];
  const skipped = [];

  for (const id of roleIds) {
    if (existing.has(id)) {
      existing.delete(id);
      removed.push(id);
    } else {
      skipped.push(id);
    }
  }

  doc.roleIds = [...existing];

  doc.exemptRoles = (doc.exemptRoles || []).map((entry) => ({
    ...entry,
    allowedBlRoleIds: (entry.allowedBlRoleIds || []).filter((rid) => existing.has(rid)),
  }));

  await doc.save();
  return { removed, skipped };
}

async function upsertExemptRole(guild, exemptRoleId, allowedBlRoleIds) {
  const doc = await getBlacklistDoc(guild.id);
  const blSet = new Set(doc.roleIds || []);
  const allowed = [...new Set(allowedBlRoleIds)].filter((id) => blSet.has(id));

  const list = doc.exemptRoles || [];
  const idx = list.findIndex((e) => e.exemptRoleId === exemptRoleId);
  const entry = { exemptRoleId, allowedBlRoleIds: allowed };

  let created = false;
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
    created = true;
  }

  doc.exemptRoles = list;
  await doc.save();
  return { created, entry };
}

async function removeExemptRole(guild, exemptRoleId) {
  const doc = await getBlacklistDoc(guild.id);
  const before = (doc.exemptRoles || []).length;
  doc.exemptRoles = (doc.exemptRoles || []).filter(
    (e) => e.exemptRoleId !== exemptRoleId
  );
  await doc.save();
  return before !== doc.exemptRoles.length;
}

module.exports = {
  getBlacklistDoc,
  getBlockedRoleIdSet,
  isRoleBlocked,
  getRoleBlockedMessage,
  formatRoleBlockedMessage,
  formatRoleMention,
  formatRoleList,
  formatExemptList,
  getPanelData,
  addBlockedRoles,
  removeBlockedRoles,
  upsertExemptRole,
  removeExemptRole,
  resolveValidRoleIds,
};
