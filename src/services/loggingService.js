const { sendLogEmbed, sendLogText } = require('../utils/logChannel');
const { getIds, getLoggingSettings } = require('../config/loadConfig');
const LOG = require('../constants/logging');
const { formatTemplate } = require('../utils/format');
const { baseEmbed } = require('../utils/embedBuilder');
const { AuditLogEvent, Events } = require('discord.js');

const MOVE_CACHE_TTL_MS = 15000;
const MOVE_WAIT_MS = 1800;
const DISCONNECT_CACHE_TTL_MS = 15000;
const VOICE_LOG_DEDUPE_MS = 5000;
const recentMoves = new Map();
const recentMoveHistory = new Map();
const recentDisconnects = new Map();
const recentVoiceLeaveLogs = new Map();
const pendingVoiceMoves = new Map();

function moveKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheMoveExecutor(guildId, targetId, executorId, channelId) {
  const targetIdStr = String(targetId || '');
  const executorIdStr = String(executorId || '');
  if (!guildId || !targetIdStr || !executorIdStr || executorIdStr === targetIdStr) return;
  recentMoves.set(moveKey(guildId, targetIdStr), {
    executorId: executorIdStr,
    channelId: channelId ? String(channelId) : null,
    at: Date.now(),
  });
}

function recordMoveHistory(guildId, targetId, executorId, channelId) {
  const targetIdStr = String(targetId || '');
  const executorIdStr = String(executorId || '');
  if (!guildId || !targetIdStr || !executorIdStr || executorIdStr === targetIdStr) return;

  const list = recentMoveHistory.get(guildId) || [];
  list.unshift({
    targetId: targetIdStr,
    executorId: executorIdStr,
    channelId: channelId ? String(channelId) : '',
    at: Date.now(),
  });
  while (list.length > 40) list.pop();
  recentMoveHistory.set(guildId, list);
  cacheMoveExecutor(guildId, targetIdStr, executorIdStr, channelId);
}

function getCachedMoveExecutorId(guildId, userId, newChannelId) {
  const key = moveKey(guildId, String(userId));
  const cached = recentMoves.get(key);
  if (!cached) return null;
  if (Date.now() - cached.at > MOVE_CACHE_TTL_MS) {
    recentMoves.delete(key);
    return null;
  }
  if (newChannelId && cached.channelId && cached.channelId !== String(newChannelId)) return null;
  return cached.executorId;
}

function findExecutorInHistory(guildId, userId, newChannelId, strictChannel = true) {
  const list = recentMoveHistory.get(guildId) || [];
  const userIdStr = String(userId);
  const newChannelStr = newChannelId ? String(newChannelId) : '';
  const now = Date.now();

  for (const move of list) {
    if (now - move.at > MOVE_CACHE_TTL_MS) continue;
    if (move.targetId !== userIdStr) continue;
    if (strictChannel && newChannelStr && move.channelId && move.channelId !== newChannelStr) {
      continue;
    }
    return move.executorId;
  }
  return null;
}

function channelIdFromAuditEntry(entry) {
  if (entry.action === AuditLogEvent.MemberMove) {
    return entry.extra?.channel?.id || null;
  }
  if (entry.action === AuditLogEvent.MemberUpdate) {
    const change = entry.changes?.find((c) => c.key === 'channel_id');
    return change?.new ?? change?.new_value ?? null;
  }
  return null;
}

function isMoveAuditAction(action) {
  return action === AuditLogEvent.MemberMove || action === AuditLogEvent.MemberUpdate;
}

function cacheDisconnectExecutor(guildId, targetId, executorId, channelId) {
  const targetIdStr = String(targetId || '');
  const executorIdStr = String(executorId || '');
  if (!guildId || !targetIdStr || !executorIdStr || executorIdStr === targetIdStr) return;
  recentDisconnects.set(moveKey(guildId, targetIdStr), {
    executorId: executorIdStr,
    channelId: channelId ? String(channelId) : null,
    at: Date.now(),
  });
}

function getCachedDisconnectExecutorId(guildId, userId, channelId) {
  const key = moveKey(guildId, String(userId));
  const cached = recentDisconnects.get(key);
  if (!cached) return null;
  if (Date.now() - cached.at > DISCONNECT_CACHE_TTL_MS) {
    recentDisconnects.delete(key);
    return null;
  }
  if (channelId && cached.channelId && cached.channelId !== String(channelId)) return null;
  return cached.executorId;
}

function markRecentVoiceLeave(guildId, userId) {
  recentVoiceLeaveLogs.set(moveKey(guildId, userId), Date.now());
}

function wasRecentVoiceLeave(guildId, userId) {
  const key = moveKey(guildId, userId);
  const at = recentVoiceLeaveLogs.get(key);
  if (!at) return false;
  if (Date.now() - at > VOICE_LOG_DEDUPE_MS) {
    recentVoiceLeaveLogs.delete(key);
    return false;
  }
  return true;
}

function channelIdLeaveChange(entry) {
  const change = entry.changes?.find((c) => c.key === 'channel_id');
  if (!change) return null;
  const newVal = change.new ?? change.new_value;
  if (newVal !== null && newVal !== undefined) return null;
  return change.old ?? change.old_value ?? null;
}

function isVoiceDisconnectAuditEntry(entry) {
  if (entry.action === AuditLogEvent.MemberUpdate) {
    return channelIdLeaveChange(entry) !== null;
  }
  return entry.action === AuditLogEvent.MemberDisconnect;
}

function matchDisconnectAuditEntry(entry, userId, channelId) {
  if (Date.now() - entry.createdTimestamp > 8000) return false;
  if (!entry.executorId || String(entry.executorId) === String(userId)) return false;

  if (entry.action === AuditLogEvent.MemberUpdate) {
    if (String(entry.targetId) !== String(userId)) return false;
    const leftChannelId = channelIdLeaveChange(entry);
    if (!leftChannelId) return false;
    if (channelId && String(leftChannelId) !== String(channelId)) return false;
    return true;
  }

  if (entry.action === AuditLogEvent.MemberDisconnect) {
    const count = Number(entry.extra?.count || 1);
    if (count > 1) return false;
    return true;
  }

  return false;
}

async function fetchDisconnectExecutorIdFromAudit(guild, userId, channelId) {
  const userIdStr = String(userId);
  const channelIdStr = channelId ? String(channelId) : '';

  try {
    const memberUpdateLogs = await guild.fetchAuditLogs({
      limit: 8,
      type: AuditLogEvent.MemberUpdate,
    });
    for (const entry of memberUpdateLogs.entries.values()) {
      if (matchDisconnectAuditEntry(entry, userIdStr, channelIdStr)) {
        return String(entry.executorId);
      }
    }

    const disconnectLogs = await guild.fetchAuditLogs({
      limit: 5,
      type: AuditLogEvent.MemberDisconnect,
    });
    for (const entry of disconnectLogs.entries.values()) {
      if (matchDisconnectAuditEntry(entry, userIdStr, channelIdStr)) {
        return String(entry.executorId);
      }
    }

    const logs = await guild.fetchAuditLogs({ limit: 25 });
    for (const entry of logs.entries.values()) {
      if (matchDisconnectAuditEntry(entry, userIdStr, channelIdStr)) {
        return String(entry.executorId);
      }
    }
  } catch (err) {
    console.warn('[VoiceDisconnect] Denetim kaydı alınamadı (View Audit Log izni gerekli):', err.message);
  }

  return null;
}

async function resolveDisconnectExecutorId(guild, userId, channelId, { allowRetries = false } = {}) {
  const userIdStr = String(userId);
  const channelIdStr = channelId ? String(channelId) : '';

  let executorId = getCachedDisconnectExecutorId(guild.id, userIdStr, channelIdStr);
  if (executorId) return executorId;

  executorId = await fetchDisconnectExecutorIdFromAudit(guild, userIdStr, channelIdStr);
  if (executorId || !allowRetries) return executorId;

  for (let i = 0; i < 1; i++) {
    await sleep(300);
    executorId =
      getCachedDisconnectExecutorId(guild.id, userIdStr, channelIdStr) ||
      (await fetchDisconnectExecutorIdFromAudit(guild, userIdStr, channelIdStr));
    if (executorId) return executorId;
  }

  return null;
}

async function resolveVoiceChannel(guild, channelOrId) {
  if (!channelOrId) return null;
  if (typeof channelOrId === 'object' && channelOrId.id && !channelOrId.partial) {
    return channelOrId;
  }
  const channelId = typeof channelOrId === 'string' ? channelOrId : channelOrId.id;
  if (!channelId) return null;
  const cached = guild.channels.cache.get(channelId);
  if (cached) return cached;
  return guild.channels.fetch(channelId).catch(() => null);
}

async function emitDisconnectLogFromAudit(entry, guild) {
  const { voice } = getLoggingSettings();
  if (!voice || !entry.executorId) return;

  if (entry.action === AuditLogEvent.MemberUpdate) {
    const targetId = String(entry.targetId || '');
    const executorId = String(entry.executorId);
    const leftChannelId = channelIdLeaveChange(entry);
    if (!targetId || !leftChannelId || executorId === targetId) return;
    if (wasRecentVoiceLeave(guild.id, targetId)) return;

    cacheDisconnectExecutor(guild.id, targetId, executorId, leftChannelId);

    const member = await guild.members.fetch(targetId).catch(() => null);
    if (!member) return;
    const channel = await resolveVoiceChannel(guild, leftChannelId);
    markRecentVoiceLeave(guild.id, targetId);
    await logVoiceDisconnect(member, channel, null, executorId);
    return;
  }

  if (entry.action !== AuditLogEvent.MemberDisconnect) return;
  const count = Number(entry.extra?.count || 1);
  if (count > 1) return;
}

function processDisconnectAuditEntry(entry, guild) {
  if (!guild || !entry.executorId) return;
  if (!isVoiceDisconnectAuditEntry(entry)) return;

  if (entry.action === AuditLogEvent.MemberUpdate && entry.targetId) {
    const targetId = String(entry.targetId);
    const executorId = String(entry.executorId);
    const leftChannelId = channelIdLeaveChange(entry);
    if (leftChannelId && executorId !== targetId) {
      cacheDisconnectExecutor(guild.id, targetId, executorId, leftChannelId);
    }
  }

  emitDisconnectLogFromAudit(entry, guild).catch((err) => {
    console.error('[VoiceDisconnect]', err?.message || err);
  });
}

function matchMoveAuditEntry(entry, userId, newChannelId) {
  if (String(entry.targetId) !== String(userId)) return false;
  if (Date.now() - entry.createdTimestamp > MOVE_CACHE_TTL_MS) return false;
  if (!entry.executorId || String(entry.executorId) === String(userId)) return false;
  if (!isMoveAuditAction(entry.action)) return false;

  const destId = channelIdFromAuditEntry(entry);
  if (newChannelId && destId && String(destId) !== String(newChannelId)) return false;
  return true;
}

async function resolveExecutorDisplay(guild, executorId) {
  if (!executorId) return null;
  try {
    return (
      guild.client.users.cache.get(executorId) ||
      (await guild.client.users.fetch(executorId))
    );
  } catch {
    return { toString: () => `<@${executorId}>` };
  }
}

async function fetchMoveExecutorIdFromAudit(guild, userId, newChannelId) {
  const userIdStr = String(userId);
  const newChannelStr = newChannelId ? String(newChannelId) : '';
  const now = Date.now();

  try {
    const typedLogs = await guild.fetchAuditLogs({ limit: 6, type: AuditLogEvent.MemberMove });
    for (const entry of typedLogs.entries.values()) {
      if (matchMoveAuditEntry(entry, userIdStr, newChannelStr)) {
        return String(entry.executorId);
      }
    }

    const logs = await guild.fetchAuditLogs({ limit: 25 });
    for (const entry of logs.entries.values()) {
      if (matchMoveAuditEntry(entry, userIdStr, newChannelStr)) {
        return String(entry.executorId);
      }
    }

    for (const entry of logs.entries.values()) {
      if (now - entry.createdTimestamp > 6000) continue;
      if (entry.action !== AuditLogEvent.MemberMove) continue;
      if (String(entry.targetId) !== userIdStr) continue;
      if (!entry.executorId || String(entry.executorId) === userIdStr) continue;
      return String(entry.executorId);
    }

    if (newChannelStr) {
      for (const entry of logs.entries.values()) {
        if (now - entry.createdTimestamp > 4000) continue;
        if (entry.action !== AuditLogEvent.MemberMove) continue;
        const destId = String(entry.extra?.channel?.id || '');
        if (destId !== newChannelStr) continue;
        if (!entry.executorId || String(entry.executorId) === String(entry.targetId)) continue;
        return String(entry.executorId);
      }
    }
  } catch (err) {
    console.warn('[VoiceMove] Denetim kaydı alınamadı (View Audit Log izni gerekli):', err.message);
  }

  return null;
}

async function resolveMoveExecutorId(guild, userId, newChannelId, { allowRetries = false } = {}) {
  const userIdStr = String(userId);
  const newChannelStr = newChannelId ? String(newChannelId) : '';

  let executorId =
    findExecutorInHistory(guild.id, userIdStr, newChannelStr, true) ||
    findExecutorInHistory(guild.id, userIdStr, newChannelStr, false) ||
    getCachedMoveExecutorId(guild.id, userIdStr, newChannelStr);

  if (executorId) return executorId;

  executorId = await fetchMoveExecutorIdFromAudit(guild, userIdStr, newChannelStr);
  if (executorId || !allowRetries) return executorId;

  for (let i = 0; i < 1; i++) {
    await sleep(350);
    executorId =
      findExecutorInHistory(guild.id, userIdStr, newChannelStr, false) ||
      getCachedMoveExecutorId(guild.id, userIdStr, newChannelStr) ||
      (await fetchMoveExecutorIdFromAudit(guild, userIdStr, newChannelStr));
    if (executorId) return executorId;
  }

  return null;
}

async function emitVoiceMoveLog(pending, executorId) {
  const { member, oldChannel, newChannel } = pending;
  const ts = Math.floor(Date.now() / 1000);
  const executor = executorId ? await resolveExecutorDisplay(member.guild, executorId) : null;
  const template = executor ? LOG.voiceMove.withExecutor : LOG.voiceMove.selfMove;

  const embed = baseVoiceEmbed(member).setDescription(
    formatTemplate(template, {
      user: member.toString(),
      executor: executor?.toString() || member.toString(),
      ts: String(ts),
      oldChannelLine: voiceChannelLine(oldChannel),
      newChannelLine: voiceChannelLine(newChannel),
    })
  );

  await logVoiceEvent(member.guild, embed);
}

async function finalizePendingMove(key, executorId) {
  const pending = pendingVoiceMoves.get(key);
  if (!pending || pending.done) return;

  pending.done = true;
  if (pending.timeoutId) clearTimeout(pending.timeoutId);
  pendingVoiceMoves.delete(key);

  const resolvedExecutorId = executorId
    ? String(executorId)
    : await resolveMoveExecutorId(
        pending.member.guild,
        pending.member.id,
        pending.newChannel?.id,
        { allowRetries: true }
      );

  await emitVoiceMoveLog(pending, resolvedExecutorId);
}

function processMoveAuditEntry(entry, guild) {
  if (!guild || !entry.targetId || !entry.executorId) return;
  if (!isMoveAuditAction(entry.action)) return;

  const targetId = String(entry.targetId);
  const executorId = String(entry.executorId);
  const channelId = channelIdFromAuditEntry(entry);

  recordMoveHistory(guild.id, targetId, executorId, channelId);
  if (executorId === targetId) return;

  const key = moveKey(guild.id, targetId);
  const pending = pendingVoiceMoves.get(key);
  if (!pending || pending.done) return;

  const newChannelId = pending.newChannel?.id ? String(pending.newChannel.id) : '';
  if (newChannelId && channelId && String(channelId) !== newChannelId) return;

  finalizePendingMove(key, executorId).catch((err) => {
    console.error('[VoiceMove]', err.message || err);
  });
}

function registerVoiceMoveAuditCache(client) {
  client.on(Events.GuildAuditLogEntryCreate, (entry, guild) => {
    if (!guild) return;
    processDisconnectAuditEntry(entry, guild);
    processMoveAuditEntry(entry, guild);
  });
}

function truncate(text, max = 900) {
  if (!text?.trim()) return LOG.emptyContent;
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n${LOG.truncated}`;
}

async function logJoin(member, inviteInfo = null) {
  const { recordMemberFlow } = require('./memberFlowLogService');
  await recordMemberFlow(member, 'join');

  const { joinLeave } = getLoggingSettings();
  if (!joinLeave) return;

  const displayName = member.displayName || member.user.username;
  const inviter =
    inviteInfo?.source === 'vanity'
      ? 'ÖZEL URL!'
      : inviteInfo?.inviterName || 'Bilinmiyor';

  const content = formatTemplate(LOG.join.text, {
    user: member.toString(),
    id: member.id,
    displayName: `{${displayName}}`,
    inviter,
    inviteUses: String(inviteInfo?.inviteUses ?? 0),
    memberCount: String(inviteInfo?.memberCount ?? member.guild.memberCount),
  });

  await sendLogText(member.guild, getIds().joinLeaveLogChannelId, content);
}

async function logLeave(member) {
  const { recordMemberFlow } = require('./memberFlowLogService');
  const { getJoinInviteRecord, formatInviterLabel } = require('./inviteService');
  await recordMemberFlow(member, 'leave');

  const { joinLeave } = getLoggingSettings();
  if (!joinLeave) return;

  const record = await getJoinInviteRecord(member.guild.id, member.id);
  const username = member.user?.username || member.user?.tag || member.id;

  const content = formatTemplate(LOG.leave.text, {
    user: username,
    inviter: formatInviterLabel(record, true),
    inviteUses: String(record?.inviteUses ?? 0),
  });

  await sendLogText(member.guild, getIds().joinLeaveLogChannelId, content);
}

async function logMessageDelete(message) {
  const { messages } = getLoggingSettings();
  if (!messages || !message.guild || message.author?.bot) return;

  const embed = baseEmbed()
    .setTitle(LOG.messageDelete.title)
    .setDescription(
      formatTemplate(LOG.messageDelete.desc, {
        channel: message.channel?.toString() || '—',
        author: message.author?.toString() || 'Bilinmiyor',
        content: truncate(message.content),
      })
    );

  await sendLogEmbed(message.guild, getIds().messageLogChannelId, embed);
}

async function logMessageEdit(oldMessage, newMessage) {
  const { messages } = getLoggingSettings();
  if (!messages || !newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const embed = baseEmbed()
    .setTitle(LOG.messageEdit.title)
    .setDescription(
      formatTemplate(LOG.messageEdit.desc, {
        channel: newMessage.channel?.toString() || '—',
        author: newMessage.author?.toString() || '—',
        old: truncate(oldMessage.content),
        new: truncate(newMessage.content),
      })
    );

  await sendLogEmbed(newMessage.guild, getIds().messageLogChannelId, embed);
}

async function logVoiceEvent(guild, embed) {
  const { voice } = getLoggingSettings();
  if (!voice) return;
  await sendLogEmbed(guild, getIds().voiceLogChannelId, embed);
}

function micLabel(state) {
  if (!state) return '—';
  return !state.selfMute && !state.serverMute ? 'Açık' : 'Kapalı';
}

function deafLabel(state) {
  if (!state) return '—';
  return !state.selfDeaf && !state.serverDeaf ? 'Açık' : 'Kapalı';
}

function voiceChannelLine(channel) {
  if (!channel) return '—';
  return `🔊 ${channel.name}`;
}

function listChannelMembers(channel, excludeId) {
  if (!channel?.members) return LOG.noChannelMembers;
  const members = [...channel.members.values()].filter(
    (m) => !m.user?.bot && m.id !== excludeId
  );
  if (!members.length) return LOG.noChannelMembers;
  return members.map((m) => m.toString()).join('\n');
}

function baseVoiceEmbed(member) {
  return baseEmbed().setAuthor({
    name: member.user.username,
    iconURL: member.user.displayAvatarURL({ size: 64 }),
  });
}

async function logVoiceJoin(member, channel, voiceState) {
  const ts = Math.floor(Date.now() / 1000);
  const embed = baseVoiceEmbed(member)
    .setDescription(
      formatTemplate(LOG.voiceJoin.desc, {
        user: member.toString(),
        channel: channel.toString(),
      })
    )
    .addFields(
      {
        name: LOG.voiceJoin.momentTitle,
        value: formatTemplate(LOG.voiceJoin.momentBody, {
          mic: micLabel(voiceState),
          deaf: deafLabel(voiceState),
        }),
        inline: false,
      },
      {
        name: '\u200b',
        value: formatTemplate(LOG.voiceJoin.meta, {
          channel: channel.toString(),
          channelId: channel.id,
          username: member.user.username,
          userId: member.id,
          ts: String(ts),
        }),
        inline: false,
      },
      {
        name: LOG.voiceJoin.membersTitle,
        value: listChannelMembers(channel, member.id),
        inline: false,
      }
    );

  await logVoiceEvent(member.guild, embed);
}

async function logVoiceDisconnect(member, channel, voiceState, executorId) {
  const ts = Math.floor(Date.now() / 1000);
  const executor = await resolveExecutorDisplay(member.guild, executorId);

  const embed = baseVoiceEmbed(member).setDescription(
    formatTemplate(LOG.voiceDisconnect.withExecutor, {
      user: member.toString(),
      executor: executor?.toString() || `<@${executorId}>`,
      ts: String(ts),
      channelLine: voiceChannelLine(channel),
    })
  );

  await logVoiceEvent(member.guild, embed);
}

async function logVoiceLeave(member, channel, voiceState) {
  if (wasRecentVoiceLeave(member.guild.id, member.id)) return;

  const executorId = await resolveDisconnectExecutorId(member.guild, member.id, channel?.id, {
    allowRetries: true,
  });

  markRecentVoiceLeave(member.guild.id, member.id);

  if (executorId) {
    await logVoiceDisconnect(member, channel, voiceState, executorId);
    return;
  }

  const ts = Math.floor(Date.now() / 1000);
  const embed = baseVoiceEmbed(member)
    .setDescription(
      formatTemplate(LOG.voiceLeave.desc, {
        user: member.toString(),
        channelLine: voiceChannelLine(channel),
      })
    )
    .addFields(
      {
        name: LOG.voiceLeave.momentTitle,
        value: formatTemplate(LOG.voiceLeave.momentBody, {
          mic: micLabel(voiceState),
          deaf: deafLabel(voiceState),
        }),
        inline: false,
      },
      {
        name: '\u200b',
        value: formatTemplate(LOG.voiceLeave.meta, {
          channel: channel.toString(),
          channelId: channel.id,
          username: member.user.username,
          userId: member.id,
          ts: String(ts),
        }),
        inline: false,
      },
      {
        name: LOG.voiceLeave.membersTitle,
        value: listChannelMembers(channel, member.id),
        inline: false,
      }
    );

  await logVoiceEvent(member.guild, embed);
}

async function logVoiceMove(member, oldChannel, newChannel) {
  const key = moveKey(member.guild.id, member.id);
  const existing = pendingVoiceMoves.get(key);
  if (existing?.timeoutId) clearTimeout(existing.timeoutId);

  const pending = {
    member,
    oldChannel,
    newChannel,
    done: false,
    timeoutId: null,
  };
  pendingVoiceMoves.set(key, pending);

  const preExecutor =
    findExecutorInHistory(member.guild.id, member.id, newChannel?.id, true) ||
    findExecutorInHistory(member.guild.id, member.id, newChannel?.id, false) ||
    getCachedMoveExecutorId(member.guild.id, member.id, newChannel?.id);

  if (preExecutor) {
    await finalizePendingMove(key, preExecutor);
    return;
  }

  resolveMoveExecutorId(member.guild, member.id, newChannel?.id, { allowRetries: false })
    .then((executorId) => {
      if (!executorId) return;
      const current = pendingVoiceMoves.get(key);
      if (!current || current.done || current !== pending) return;
      finalizePendingMove(key, executorId).catch((err) => {
        console.error('[VoiceMove]', err.message || err);
      });
    })
    .catch(() => {});

  pending.timeoutId = setTimeout(() => {
    finalizePendingMove(key, null).catch((err) => {
      console.error('[VoiceMove]', err.message || err);
    });
  }, MOVE_WAIT_MS);
}

async function logVoiceMuteToggle(member, channel, type, enabled) {
  const ts = Math.floor(Date.now() / 1000);
  const key =
    type === 'server'
      ? enabled
        ? 'voiceServerMuteOn'
        : 'voiceServerMuteOff'
      : enabled
        ? 'voiceSelfMuteOn'
        : 'voiceSelfMuteOff';

  const embed = baseVoiceEmbed(member).setDescription(
    formatTemplate(LOG[key], {
      user: member.toString(),
      ts: String(ts),
      channelLine: voiceChannelLine(channel),
    })
  );

  await logVoiceEvent(member.guild, embed);
}

async function logVoiceDeafToggle(member, channel, type, enabled) {
  const ts = Math.floor(Date.now() / 1000);
  const key =
    type === 'server'
      ? enabled
        ? 'voiceServerDeafOn'
        : 'voiceServerDeafOff'
      : enabled
        ? 'voiceSelfDeafOn'
        : 'voiceSelfDeafOff';

  const embed = baseVoiceEmbed(member).setDescription(
    formatTemplate(LOG[key], {
      user: member.toString(),
      ts: String(ts),
      channelLine: voiceChannelLine(channel),
    })
  );

  await logVoiceEvent(member.guild, embed);
}

async function logVoiceCamera(member, channel, kind, enabled) {
  const ts = Math.floor(Date.now() / 1000);
  const key =
    kind === 'stream'
      ? enabled
        ? 'voiceStreamOn'
        : 'voiceStreamOff'
      : enabled
        ? 'voiceCameraOn'
        : 'voiceCameraOff';

  const embed = baseVoiceEmbed(member).setDescription(
    formatTemplate(LOG[key], {
      user: member.toString(),
      ts: String(ts),
      channelLine: voiceChannelLine(channel),
    })
  );

  await logVoiceEvent(member.guild, embed);
}

module.exports = {
  logJoin,
  logLeave,
  logMessageDelete,
  logMessageEdit,
  logVoiceJoin,
  logVoiceLeave,
  logVoiceDisconnect,
  logVoiceMove,
  logVoiceMuteToggle,
  logVoiceDeafToggle,
  logVoiceCamera,
  registerVoiceMoveAuditCache,
};
