/**
 * Rol/kanal etiketlerini guild cache üzerinden çözümler.
 * Components V2 + allowedMentions: { parse: [] } ile ham <@&id> "Bilinmeyen Rol" gösterir.
 */

function formatRoleMention(guild, roleId) {
  if (!roleId) return '—';
  const id = String(roleId).trim();
  const role = guild?.roles?.cache?.get(id);
  if (role) return role.toString();
  return `**@${id}**`;
}

function formatRoleList(guild, roleIds) {
  if (!Array.isArray(roleIds) || !roleIds.length) return '—';
  return roleIds.map((id) => formatRoleMention(guild, id)).join(' ');
}

function formatChannelMention(guild, channelId) {
  if (!channelId) return '—';
  const id = String(channelId).trim();
  const channel = guild?.channels?.cache?.get(id);
  if (channel) return channel.toString();
  return `**#${id}**`;
}

function collectRoleIds(values) {
  const ids = new Set();
  const add = (v) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(add);
    else ids.add(String(v).trim());
  };
  add(values);
  return [...ids].filter((id) => id && /^\d{15,25}$/.test(id));
}

module.exports = {
  formatRoleMention,
  formatRoleList,
  formatChannelMention,
  collectRoleIds,
};
