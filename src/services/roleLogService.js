const { AuditLogEvent } = require('discord.js');
const { RoleLog } = require('../database/models/RoleLog');
const ROLOG = require('../constants/rollog');
const { formatTemplate } = require('../utils/format');
const { baseEmbed } = require('../utils/embedBuilder');

function parseRoleChanges(changes) {
  const added = [];
  const removed = [];

  for (const change of changes || []) {
    const list = change.new ?? change.new_value ?? [];
    if (!Array.isArray(list)) continue;

    if (change.key === '$add') {
      for (const role of list) {
        added.push({ id: role.id, name: role.name || role.id });
      }
    }
    if (change.key === '$remove') {
      for (const role of list) {
        removed.push({ id: role.id, name: role.name || role.id });
      }
    }
  }

  return { added, removed };
}

async function recordRoleChange(guildId, targetId, targetTag, roleId, roleName, action, executor) {
  await RoleLog.create({
    guildId,
    targetId,
    targetTag,
    roleId,
    roleName,
    action,
    executorId: executor?.id || null,
    executorTag: executor?.tag || null,
  }).catch((err) => {
    console.warn('[RoleLog] Kayıt hatası:', err.message);
  });
}

async function handleAuditLogEntry(entry, guild) {
  if (entry.action !== AuditLogEvent.MemberRoleUpdate) return;

  const targetId = entry.targetId;
  if (!targetId) return;

  let targetTag = null;
  if (entry.target?.tag) targetTag = entry.target.tag;

  const { added, removed } = parseRoleChanges(entry.changes);
  const executor = entry.executor;

  for (const role of added) {
    await recordRoleChange(
      guild.id,
      targetId,
      targetTag,
      role.id,
      role.name,
      'add',
      executor
    );
  }

  for (const role of removed) {
    await recordRoleChange(
      guild.id,
      targetId,
      targetTag,
      role.id,
      role.name,
      'remove',
      executor
    );
  }
}

async function getRoleLogsForUser(guildId, userId, limit = 25) {
  return RoleLog.find({ guildId, targetId: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

function formatLogLine(log) {
  const ts = Math.floor(new Date(log.createdAt).getTime() / 1000);
  const executor = log.executorId
    ? `<@${log.executorId}> (\`${log.executorTag || log.executorId}\`)`
    : ROLOG.unknownExecutor;

  const template = log.action === 'add' ? ROLOG.lineAdd : ROLOG.lineRemove;
  return formatTemplate(template, {
    ts: String(ts),
    role: log.roleName,
    executor,
  });
}

async function buildRollogEmbed(guild, user) {
  const logs = await getRoleLogsForUser(guild.id, user.id);

  const embed = baseEmbed().setTitle(
    formatTemplate(ROLOG.embedTitle, { user: user.tag })
  );

  if (logs.length === 0) {
    embed.setDescription(ROLOG.empty);
    return embed;
  }

  const lines = logs.map(formatLogLine);
  const description = lines.join('\n').slice(0, 4096);
  embed.setDescription(description);
  embed.setFooter({
    text: formatTemplate(ROLOG.footer, { count: String(logs.length) }),
  });

  return embed;
}

function registerGuildAuditLogEntryCreate(client) {
  const { Events } = require('discord.js');
  client.on(Events.GuildAuditLogEntryCreate, (entry, guild) => {
    handleAuditLogEntry(entry, guild).catch((err) => {
      console.error('[RoleLog Audit]', err.message || err);
    });
  });
}

module.exports = {
  handleAuditLogEntry,
  getRoleLogsForUser,
  buildRollogEmbed,
  registerGuildAuditLogEntryCreate,
};
