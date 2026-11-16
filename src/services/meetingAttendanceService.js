const {
  ContainerBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');
const { Meeting } = require('../database/models/Meeting');
const { MeetingVoiceSession } = require('../database/models/MeetingVoiceSession');
const { getIds, getConfig } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');
const { voicePresenceLabel } = require('../utils/voiceStateLabels');
const { getRoleMembers } = require('../utils/roleMembers');
const MAZ = require('../constants/mazaret');
const { listMeetingMazarets } = require('./mazaretService');
const TOP = require('../constants/toplanti');

function formatMeetingTimestamp(date) {
  const ts = Math.floor(new Date(date).getTime() / 1000);
  if (Number.isNaN(ts)) return '—';
  return `<t:${ts}:F> (<t:${ts}:R>)`;
}

function formatDurationMinutes(ms) {
  if (!ms || ms <= 0) return '0 dk';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} dk`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
}

function clipSessionMs(joinedAt, leftAt, windowStart, windowEnd) {
  const joinMs = new Date(joinedAt).getTime();
  const leaveMs = new Date(leftAt || windowEnd).getTime();
  const startMs = Math.max(joinMs, windowStart.getTime());
  const endMs = Math.min(leaveMs, windowEnd.getTime());
  return Math.max(0, endMs - startMs);
}

function getMeetingId(meeting) {
  return String(meeting?._id ?? meeting?.id ?? '');
}

async function fetchStaffMembers(guild) {
  return getRoleMembers(guild, getIds().staffRoleId);
}

async function findActiveMeetingForChannel(guildId, channelId) {
  const now = new Date();
  return Meeting.findOne({
    guildId,
    voiceChannelId: channelId,
    status: 'scheduled',
    scheduledAt: { $lte: now },
  }).sort({ scheduledAt: -1 });
}

function resolveJoinTimeFromTracking(guildId, meeting, userId) {
  const { getVoiceSessionInfo } = require('./voiceTrackingService');
  const windowStartMs = new Date(meeting.scheduledAt).getTime();
  const now = Date.now();
  const vt = getVoiceSessionInfo(guildId, userId);

  if (vt?.channelId === meeting.voiceChannelId && vt.joinedAt) {
    return new Date(Math.max(vt.joinedAt, windowStartMs));
  }
  if (now >= windowStartMs) {
    return new Date(windowStartMs);
  }
  return new Date();
}

async function ensureMeetingVoiceSession(guild, meeting, member) {
  const meetingId = getMeetingId(meeting);
  const userId = member.id;

  const open = await MeetingVoiceSession.findOne({
    meetingId,
    userId,
    leftAt: null,
  });
  if (open) return false;

  await MeetingVoiceSession.create({
    meetingId,
    guildId: guild.id,
    userId,
    channelId: meeting.voiceChannelId,
    joinedAt: resolveJoinTimeFromTracking(guild.id, meeting, userId),
  });
  return true;
}

async function syncMeetingChannelPresence(guild, meeting) {
  if (!meeting?.voiceChannelId || meeting.status !== 'scheduled') return;

  const scheduledMs = new Date(meeting.scheduledAt).getTime();
  if (Number.isNaN(scheduledMs) || Date.now() < scheduledMs) return;

  const channel =
    guild.channels.cache.get(meeting.voiceChannelId) ||
    (await guild.channels.fetch(meeting.voiceChannelId).catch(() => null));

  if (!channel?.members) return;

  for (const member of channel.members.values()) {
    if (member.user?.bot) continue;
    await ensureMeetingVoiceSession(guild, meeting, member);
  }
}

async function onMeetingVoiceJoin(guildId, userId, channelId) {
  const meeting = await findActiveMeetingForChannel(guildId, channelId);
  if (!meeting) return;

  const meetingId = getMeetingId(meeting);
  const open = await MeetingVoiceSession.findOne({
    meetingId,
    userId,
    leftAt: null,
  });
  if (open) return;

  await MeetingVoiceSession.create({
    meetingId,
    guildId,
    userId,
    channelId,
    joinedAt: resolveJoinTimeFromTracking(guildId, meeting, userId),
  });
}

async function onMeetingVoiceLeave(guildId, userId, channelId) {
  if (!channelId) return;

  await MeetingVoiceSession.updateMany(
    { guildId, userId, channelId, leftAt: null },
    { $set: { leftAt: new Date() } }
  );
}

async function closeOpenSessionsForMeeting(meetingId, endedAt) {
  await MeetingVoiceSession.updateMany(
    { meetingId: String(meetingId), leftAt: null },
    { $set: { leftAt: endedAt } }
  );
}

async function gatherMeetingStats(guild, meeting) {
  const meetingId = getMeetingId(meeting);
  const windowStart = new Date(meeting.scheduledAt);
  const windowEnd = new Date(meeting.endedAt || Date.now());

  const sessions = await MeetingVoiceSession.find({ meetingId });
  const totals = new Map();

  for (const session of sessions) {
    const ms = clipSessionMs(session.joinedAt, session.leftAt, windowStart, windowEnd);
    if (ms <= 0) continue;
    totals.set(session.userId, (totals.get(session.userId) || 0) + ms);
  }

  const participants = [...totals.entries()]
    .map(([userId, ms]) => {
      const member = guild.members.cache.get(userId);
      return {
        userId,
        label: member ? member.toString() : `<@${userId}>`,
        durationMs: ms,
        presence: member ? voicePresenceLabel(member) : '❌ Seste değil',
      };
    })
    .sort((a, b) => b.durationMs - a.durationMs);

  const participantIds = new Set(totals.keys());
  const staffMembers = await fetchStaffMembers(guild);
  const mazaretRecords = await listMeetingMazarets(guild.id, meeting);
  const mazaretUserIds = new Set(mazaretRecords.map((record) => record.userId));

  const mazaretli = mazaretRecords
    .map((record) => {
      const member = guild.members.cache.get(record.userId);
      return {
        userId: record.userId,
        label: member ? member.toString() : `<@${record.userId}>`,
        reason: record.reason,
        status: MAZ.status[record.status] || record.status,
        source: MAZ.source[record.source] || record.source || '—',
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'));

  const absent = staffMembers.filter(
    (m) => !participantIds.has(m.id) && !mazaretUserIds.has(m.id)
  );

  return { meetingId, windowStart, windowEnd, participants, absent, mazaretli };
}

function buildAbsentButton(meetingId) {
  return new ButtonBuilder()
    .setCustomId(`${TOP.bittir.buttons.absentPrefix}${meetingId}`)
    .setLabel(TOP.bittir.buttons.absent)
    .setStyle(ButtonStyle.Danger);
}

function buildParticipantsButton(meetingId) {
  return new ButtonBuilder()
    .setCustomId(`${TOP.bittir.buttons.participantsPrefix}${meetingId}`)
    .setLabel(TOP.bittir.buttons.participants)
    .setStyle(ButtonStyle.Primary);
}

function buildMazaretButton(meetingId) {
  return new ButtonBuilder()
    .setCustomId(`${TOP.bittir.buttons.mazaretPrefix}${meetingId}`)
    .setLabel(TOP.bittir.buttons.mazaret)
    .setStyle(ButtonStyle.Secondary);
}

function formatMazaretList(mazaretli) {
  if (!mazaretli.length) return TOP.bittir.noMazaret;
  return mazaretli
    .map((entry, i) =>
      `${i + 1}. ${formatTemplate(TOP.bittir.mazaretLine, {
        label: entry.label,
        status: entry.status,
        source: entry.source,
        reason: entry.reason,
      })}`
    )
    .join('\n');
}

async function buildFinishPanelPayload(guild, meeting, view = 'participants') {
  const config = getConfig();
  const stats = await gatherMeetingStats(guild, meeting);
  const meetingId = stats.meetingId;

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  if (view === 'absent') {
    const list =
      stats.absent.length > 0
        ? stats.absent.map((m, i) => `${i + 1}. ${m.toString()}`).join('\n')
        : TOP.bittir.noAbsent;

    container.addTextDisplayComponents((td) =>
      td.setContent(
        `## ${formatTemplate(TOP.bittir.absentTitle, { id: meetingId })}\n\n${formatTemplate(TOP.bittir.absentHeader, {
          title: meeting.title,
          start: formatMeetingTimestamp(meeting.scheduledAt),
          end: formatMeetingTimestamp(meeting.endedAt),
          count: String(stats.absent.length),
          list,
        })}`
      )
    );
  } else if (view === 'mazaret') {
    const list = formatMazaretList(stats.mazaretli);

    container.addTextDisplayComponents((td) =>
      td.setContent(
        `## ${formatTemplate(TOP.bittir.mazaretTitle, { id: meetingId })}\n\n${formatTemplate(TOP.bittir.mazaretHeader, {
          title: meeting.title,
          start: formatMeetingTimestamp(meeting.scheduledAt),
          end: formatMeetingTimestamp(meeting.endedAt),
          count: String(stats.mazaretli.length),
          list,
        })}`
      )
    );
  } else {
    const list =
      stats.participants.length > 0
        ? stats.participants
            .map(
              (r, i) =>
                `${i + 1}. ${r.label} — **${formatDurationMinutes(r.durationMs)}** · ${r.presence}`
            )
            .join('\n')
        : TOP.bittir.noParticipants;

    let body = formatTemplate(TOP.bittir.header, {
      title: meeting.title,
      start: formatMeetingTimestamp(meeting.scheduledAt),
      end: formatMeetingTimestamp(meeting.endedAt),
      count: String(stats.participants.length),
      list,
    });

    if (stats.mazaretli.length > 0) {
      body += `\n\n**Mazaretliler (${stats.mazaretli.length}):**\n${formatMazaretList(stats.mazaretli)}`;
    }

    container.addTextDisplayComponents((td) =>
      td.setContent(`## ${formatTemplate(TOP.bittir.title, { id: meetingId })}\n\n${body}`)
    );
  }

  container.addSeparatorComponents((sep) => sep);
  container.addActionRowComponents((row) =>
    row.addComponents(
      buildParticipantsButton(meetingId).setStyle(
        view === 'participants' ? ButtonStyle.Primary : ButtonStyle.Secondary
      ),
      buildAbsentButton(meetingId).setStyle(
        view === 'absent' ? ButtonStyle.Danger : ButtonStyle.Secondary
      ),
      buildMazaretButton(meetingId).setStyle(
        view === 'mazaret' ? ButtonStyle.Success : ButtonStyle.Secondary
      )
    )
  );

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

async function finishMeeting(interaction) {
  const selectedId = interaction.options.getInteger('id', true);
  const meeting = await Meeting.findOne({
    id: selectedId,
    guildId: interaction.guild.id,
    status: 'scheduled',
  });

  if (!meeting) {
    return interaction.reply({ content: TOP.bittir.notFound });
  }

  const endedAt = new Date();
  const meetingId = getMeetingId(meeting);

  await syncMeetingChannelPresence(interaction.guild, meeting);
  await closeOpenSessionsForMeeting(meetingId, endedAt);
  meeting.status = 'completed';
  meeting.endedAt = endedAt;
  await meeting.save();

  const payload = await buildFinishPanelPayload(interaction.guild, meeting, 'participants');
  return interaction.reply(payload);
}

async function handleMeetingFinishButton(interaction) {
  const id = interaction.customId;
  const absentPrefix = TOP.bittir.buttons.absentPrefix;
  const participantsPrefix = TOP.bittir.buttons.participantsPrefix;
  const mazaretPrefix = TOP.bittir.buttons.mazaretPrefix;

  let meetingId = null;
  let view = 'participants';

  if (id.startsWith(absentPrefix)) {
    meetingId = id.slice(absentPrefix.length);
    view = 'absent';
  } else if (id.startsWith(participantsPrefix)) {
    meetingId = id.slice(participantsPrefix.length);
    view = 'participants';
  } else if (id.startsWith(mazaretPrefix)) {
    meetingId = id.slice(mazaretPrefix.length);
    view = 'mazaret';
  } else {
    return;
  }

  const meeting = await Meeting.findOne({
    id: Number(meetingId),
    guildId: interaction.guild.id,
    status: 'completed',
  });

  if (!meeting) {
    return interaction.reply(ephemeralPayload({ content: TOP.bittir.meetingNotFound }));
  }

  const payload = await buildFinishPanelPayload(interaction.guild, meeting, view);
  return interaction.update(payload);
}

module.exports = {
  onMeetingVoiceJoin,
  onMeetingVoiceLeave,
  finishMeeting,
  handleMeetingFinishButton,
  findActiveMeetingForChannel,
  syncMeetingChannelPresence,
};
