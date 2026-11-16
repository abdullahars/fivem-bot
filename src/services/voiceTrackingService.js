const { Events } = require('discord.js');
const { addVoiceTime, addVoiceDetail } = require('./userActivityService');
const { bumpDailyVoiceJoin } = require('./dailyActivityService');
const {
  logVoiceJoin,
  logVoiceLeave,
  logVoiceMove,
  logVoiceMuteToggle,
  logVoiceDeafToggle,
  logVoiceCamera,
} = require('./loggingService');

const sessions = new Map();

function callMeetingVoiceJoin(...args) {
  const { onMeetingVoiceJoin } = require('./meetingAttendanceService');
  return onMeetingVoiceJoin(...args);
}

function callMeetingVoiceLeave(...args) {
  const { onMeetingVoiceLeave } = require('./meetingAttendanceService');
  return onMeetingVoiceLeave(...args);
}

function sessionKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function isMicOpen(state) {
  return !state.selfMute && !state.serverMute;
}

function isDeafOpen(state) {
  return !state.selfDeaf && !state.serverDeaf;
}

function flushSegment(session, now = Date.now()) {
  if (!session?.channelId || !session.segmentStartedAt) return;
  const duration = now - session.segmentStartedAt;
  if (duration <= 0) return;

  session.pendingMs = (session.pendingMs || 0) + duration;
  if (session.micOpen) {
    session.pendingMicMs = (session.pendingMicMs || 0) + duration;
  }
  if (session.deafOpen) {
    session.pendingDeafMs = (session.pendingDeafMs || 0) + duration;
  }
  session.segmentStartedAt = now;
}

function applyVoiceState(session, voiceState) {
  session.selfMute = voiceState.selfMute;
  session.serverMute = voiceState.serverMute;
  session.selfDeaf = voiceState.selfDeaf;
  session.serverDeaf = voiceState.serverDeaf;
  session.micOpen = isMicOpen(voiceState);
  session.deafOpen = isDeafOpen(voiceState);
}

async function commitSession(guildId, userId, channelId, session) {
  const totalMs = session.pendingMs || 0;
  const micMs = session.pendingMicMs || 0;
  const deafMs = session.pendingDeafMs || 0;
  if (!totalMs) return;

  await addVoiceTime(guildId, userId, channelId, totalMs);
  if (micMs > 0 || deafMs > 0) {
    await addVoiceDetail(guildId, userId, channelId, { micMs, deafMs });
  }

  try {
    const { awardVoiceMs } = require('./coinService');
    awardVoiceMs(guildId, userId, totalMs).catch(() => {});
  } catch (_) {
    /* coin sistemi yoksa yoksay */
  }
}

async function resolveLeaveChannel(guild, oldChannel, sessionChannelId) {
  let channel = oldChannel;
  if (channel?.partial || (channel && !channel.name)) {
    channel =
      guild.channels.cache.get(channel.id) ||
      (await guild.channels.fetch(channel.id).catch(() => null));
  }
  if (channel) return channel;

  if (!sessionChannelId) return null;
  return (
    guild.channels.cache.get(sessionChannelId) ||
    (await guild.channels.fetch(sessionChannelId).catch(() => null))
  );
}

async function endSession(guildId, userId, member, channel, voiceState) {
  const key = sessionKey(guildId, userId);
  const session = sessions.get(key);
  const sessionChannelId = session?.channelId;

  if (session) {
    flushSegment(session);
    const channelId = channel?.id || sessionChannelId;
    await commitSession(guildId, userId, channelId, session);
    sessions.delete(key);
  }

  if (!member) return;

  let leaveChannel = await resolveLeaveChannel(member.guild, channel, sessionChannelId);
  if (!leaveChannel && sessionChannelId) {
    leaveChannel = {
      id: sessionChannelId,
      name: 'ses kanalı',
      toString: () => `<#${sessionChannelId}>`,
      members: { values: () => [] },
    };
  }

  if (leaveChannel) {
    callMeetingVoiceLeave(guildId, userId, leaveChannel.id).catch(() => {});
    await logVoiceLeave(member, leaveChannel, voiceState);
  }
}

function voiceFlagChanged(oldState, newState, key) {
  const oldVal = oldState[key];
  const newVal = newState[key];
  if (typeof oldVal !== 'boolean' || typeof newVal !== 'boolean') return false;
  return oldVal !== newVal;
}

async function handleVoiceStateUpdate(oldState, newState) {
  if (newState.member?.user?.bot) return;

  const guild = newState.guild;
  const member = newState.member;
  const userId = newState.id;
  const key = sessionKey(guild.id, userId);

  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  if (!oldChannel && newChannel) {
    sessions.set(key, {
      joinedAt: Date.now(),
      channelId: newChannel.id,
      segmentStartedAt: Date.now(),
      pendingMs: 0,
      pendingMicMs: 0,
      pendingDeafMs: 0,
    });
    const session = sessions.get(key);
    applyVoiceState(session, newState);
    bumpDailyVoiceJoin(guild.id, userId).catch(() => {});
    await logVoiceJoin(member, newChannel, newState);
    callMeetingVoiceJoin(guild.id, userId, newChannel.id).catch(() => {});
    return;
  }

  if (!newChannel && (oldChannel || sessions.has(key))) {
    const session = sessions.get(key);
    if (session) applyVoiceState(session, oldState);

    const leaveChannel = await resolveLeaveChannel(
      guild,
      oldChannel,
      session?.channelId
    );

    await endSession(guild.id, userId, member, leaveChannel || oldChannel, oldState);
    return;
  }

  if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
    const session = sessions.get(key);
    if (session) {
      applyVoiceState(session, oldState);
      flushSegment(session);
      await commitSession(guild.id, userId, oldChannel.id, session);
      sessions.delete(key);
    }

    await logVoiceMove(member, oldChannel, newChannel).catch((err) => {
      console.error('[VoiceMove]', err.message || err);
    });
    callMeetingVoiceLeave(guild.id, userId, oldChannel.id).catch(() => {});
    bumpDailyVoiceJoin(guild.id, userId).catch(() => {});

    sessions.set(key, {
      joinedAt: Date.now(),
      channelId: newChannel.id,
      segmentStartedAt: Date.now(),
      pendingMs: 0,
      pendingMicMs: 0,
      pendingDeafMs: 0,
    });
    const next = sessions.get(key);
    applyVoiceState(next, newState);
    callMeetingVoiceJoin(guild.id, userId, newChannel.id).catch(() => {});
    return;
  }

  const sameChannel =
    oldChannel && newChannel && oldChannel.id === newChannel.id;
  if (!sameChannel) return;

  const session = sessions.get(key);
  if (session) {
    const muteDeafChanged =
      voiceFlagChanged(oldState, newState, 'serverMute') ||
      voiceFlagChanged(oldState, newState, 'selfMute') ||
      voiceFlagChanged(oldState, newState, 'serverDeaf') ||
      voiceFlagChanged(oldState, newState, 'selfDeaf');

    if (muteDeafChanged) {
      flushSegment(session);
      applyVoiceState(session, newState);
    }
  }

  if (voiceFlagChanged(oldState, newState, 'serverMute')) {
    await logVoiceMuteToggle(member, newChannel, 'server', newState.serverMute);
  }
  if (voiceFlagChanged(oldState, newState, 'selfMute')) {
    await logVoiceMuteToggle(member, newChannel, 'self', newState.selfMute);
  }
  if (voiceFlagChanged(oldState, newState, 'serverDeaf')) {
    await logVoiceDeafToggle(member, newChannel, 'server', newState.serverDeaf);
  }
  if (voiceFlagChanged(oldState, newState, 'selfDeaf')) {
    await logVoiceDeafToggle(member, newChannel, 'self', newState.selfDeaf);
  }
  if (voiceFlagChanged(oldState, newState, 'selfVideo')) {
    await logVoiceCamera(member, newChannel, 'camera', newState.selfVideo);
  }
  if (voiceFlagChanged(oldState, newState, 'streaming')) {
    await logVoiceCamera(member, newChannel, 'stream', newState.streaming);
  }
}

function registerVoiceTracking(client) {
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState).catch((err) => {
      console.error('[Voice]', err.message || err);
    });
  });
}

function getVoiceSessionInfo(guildId, userId) {
  const session = sessions.get(sessionKey(guildId, userId));
  if (!session) return null;
  return {
    channelId: session.channelId,
    joinedAt: session.joinedAt,
  };
}

module.exports = { registerVoiceTracking, endSession, sessions, getVoiceSessionInfo };
