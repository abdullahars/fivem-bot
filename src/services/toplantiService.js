const { ChannelType } = require('discord.js');
const { Meeting } = require('../database/models/Meeting');
const { getIds } = require('../config/loadConfig');
const { getRoleMembers } = require('../utils/roleMembers');
const { mapWithConcurrency } = require('../utils/concurrency');
const { formatTemplate } = require('../utils/format');
const { baseEmbed } = require('../utils/embedBuilder');
const { ephemeralPayload } = require('../utils/interaction');
const TOP = require('../constants/toplanti');
const { TZ } = require('../utils/istanbulTime');
const { syncMeetingChannelPresence } = require('./meetingAttendanceService');

const CHECK_MS = 30 * 1000;
const IDLE_CHECK_MS = 5 * 60 * 1000;
const notifiedKeys = new Set();
const startedNotifiedKeys = new Set();

function getMeetingId(meeting) {
  return String(meeting?._id ?? meeting?.id ?? '');
}

function parseMeetingDateTime(input) {
  const trimmed = String(input || '').trim();
  const match = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  const hour = match[4].padStart(2, '0');
  const minute = match[5];

  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+03:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatMeetingTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('tr-TR', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMeetingTimestamp(date) {
  const ts = Math.floor(new Date(date).getTime() / 1000);
  if (Number.isNaN(ts)) return '—';
  return `<t:${ts}:F> (<t:${ts}:R>)`;
}

function resolveVoiceChannelLabel(guild, channelId) {
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return `<#${channelId}>`;
  return channel.toString();
}

async function fetchStaffMembers(guild) {
  const staffRoleId = getIds().staffRoleId;
  return getRoleMembers(guild, staffRoleId);
}

async function sendStaffMeetingDms(guild, meeting, kind = 'before') {
  const { buildMeetingNotifyDm } = require('./mazaretService');
  const staffMembers = await fetchStaffMembers(guild);
  if (!staffMembers.length) return { sent: 0, failed: 0 };

  const results = await mapWithConcurrency(
    staffMembers,
    async (member) => {
      try {
        const payload = await buildMeetingNotifyDm(guild, meeting, member, kind);
        await member.send(payload);
        return true;
      } catch {
        return false;
      }
    },
    5
  );

  const sent = results.filter(Boolean).length;
  return { sent, failed: staffMembers.length - sent };
}

async function createMeeting(interaction) {
  const title =
    interaction.options.getString('baslik')?.trim() || 'Staff Toplantısı';
  const channel = interaction.options.getChannel('kanal', true);
  const dateRaw = interaction.options.getString('tarih', true);

  if (
    channel.type !== ChannelType.GuildVoice &&
    channel.type !== ChannelType.GuildStageVoice
  ) {
    return interaction.reply(ephemeralPayload({ content: TOP.create.invalidChannel }));
  }

  const scheduledAt = parseMeetingDateTime(dateRaw);
  if (!scheduledAt) {
    return interaction.reply(ephemeralPayload({ content: TOP.create.invalidDate }));
  }
  if (scheduledAt.getTime() <= Date.now()) {
    return interaction.reply(ephemeralPayload({ content: TOP.create.pastDate }));
  }

  const meeting = await Meeting.create({
    guildId: interaction.guild.id,
    title,
    voiceChannelId: channel.id,
    scheduledAt,
    createdById: interaction.user.id,
    createdByTag: interaction.user.tag,
  });

  return interaction.reply(
    ephemeralPayload({
      content: formatTemplate(TOP.create.success, {
        id: getMeetingId(meeting),
        title: meeting.title,
        time: formatMeetingTimestamp(meeting.scheduledAt),
        channel: channel.toString(),
        notifyBefore: String(TOP.notifyMinutesBefore),
      }),
    })
  );
}

async function listMeetings(interaction) {
  const meetings = await Meeting.find({
    guildId: interaction.guild.id,
    status: { $in: ['scheduled', 'completed', 'cancelled'] },
  })
    .sort({ scheduledAt: -1 })
    .limit(40);

  if (!meetings.length) {
    return interaction.reply({ content: TOP.list.empty });
  }

  const formatLine = (m) => {
    const statusMap = {
      scheduled: TOP.list.statusScheduled,
      completed: TOP.list.statusCompleted,
      cancelled: TOP.list.statusCancelled,
    };
    const time =
      m.status === 'completed' && m.endedAt
        ? `${formatMeetingTimestamp(m.scheduledAt)} → ${formatMeetingTimestamp(m.endedAt)}`
        : formatMeetingTimestamp(m.scheduledAt);

    return formatTemplate(TOP.list.line, {
      id: getMeetingId(m),
      title: m.title,
      status: statusMap[m.status] || m.status,
      time,
      channel: resolveVoiceChannelLabel(interaction.guild, m.voiceChannelId),
      creator: `<@${m.createdById}>`,
    });
  };

  const upcoming = meetings.filter((m) => m.status === 'scheduled');
  const completed = meetings.filter((m) => m.status === 'completed');
  const cancelled = meetings.filter((m) => m.status === 'cancelled');

  const sections = [
    `${TOP.list.sectionUpcoming}\n${upcoming.length ? upcoming.map(formatLine).join('\n\n') : TOP.list.sectionEmpty}`,
    `${TOP.list.sectionCompleted}\n${completed.length ? completed.map(formatLine).join('\n\n') : TOP.list.sectionEmpty}`,
    `${TOP.list.sectionCancelled}\n${cancelled.length ? cancelled.map(formatLine).join('\n\n') : TOP.list.sectionEmpty}`,
  ];

  const embed = baseEmbed()
    .setTitle(TOP.list.title)
    .setDescription(sections.join('\n\n'));

  return interaction.reply({ embeds: [embed] });
}

async function cancelMeeting(interaction) {
  const selectedId = interaction.options.getInteger('id', true);
  const meeting = await Meeting.findOne({
    id: selectedId,
    guildId: interaction.guild.id,
    status: 'scheduled',
  });

  if (!meeting) {
    return interaction.reply(ephemeralPayload({ content: TOP.delete.notFound }));
  }

  meeting.status = 'cancelled';
  meeting.cancelledAt = new Date();
  await meeting.save();

  return interaction.reply(
    ephemeralPayload({
      content: formatTemplate(TOP.delete.success, { id: getMeetingId(meeting) }),
    })
  );
}

async function takeAttendance(interaction) {
  const selectedId = interaction.options.getInteger('id', true);
  const meeting = await Meeting.findOne({
    id: selectedId,
    guildId: interaction.guild.id,
  });

  if (!meeting) {
    return interaction.reply(ephemeralPayload({ content: TOP.yoklama.notFound }));
  }

  const channel =
    interaction.guild.channels.cache.get(meeting.voiceChannelId) ||
    (await interaction.guild.channels.fetch(meeting.voiceChannelId).catch(() => null));

  if (!channel || !channel.isVoiceBased?.()) {
    return interaction.reply(ephemeralPayload({ content: TOP.yoklama.channelMissing }));
  }

  const members = [...channel.members.values()].filter((m) => !m.user.bot);
  const memberLines =
    members.length > 0
      ? members.map((m) => `• ${m.toString()} (\`${m.user.username}\`)`).join('\n')
      : TOP.yoklama.empty;

  const embed = baseEmbed()
    .setTitle(formatTemplate(TOP.yoklama.title, { id: getMeetingId(meeting) }))
    .setDescription(
      formatTemplate(TOP.yoklama.header, {
        title: meeting.title,
        channel: channel.toString(),
        time: formatMeetingTimestamp(meeting.scheduledAt),
        count: String(members.length),
        members: memberLines,
      })
    );

  return interaction.reply({ embeds: [embed] });
}

async function claimMeetingNotification(meeting) {
  const id = getMeetingId(meeting);
  if (!id) return false;

  const result = await Meeting.updateMany(
    {
      _id: id,
      guildId: meeting.guildId,
      status: 'scheduled',
      notifiedAt: null,
    },
    { $set: { notifiedAt: new Date() } }
  );

  return result.modifiedCount > 0;
}

async function claimMeetingStartNotification(meeting) {
  const id = getMeetingId(meeting);
  if (!id) return false;

  const result = await Meeting.updateMany(
    {
      _id: id,
      guildId: meeting.guildId,
      status: 'scheduled',
      startedNotifiedAt: null,
    },
    { $set: { startedNotifiedAt: new Date() } }
  );

  return result.modifiedCount > 0;
}

async function processMeetingNotifications(client) {
  const now = Date.now();
  const notifyBeforeMs = TOP.notifyMinutesBefore * 60 * 1000;

  const meetings = await Meeting.find({
    status: 'scheduled',
    notifiedAt: null,
    scheduledAt: { $gt: new Date(now - 60000) },
  });

  for (const meeting of meetings) {
    const id = getMeetingId(meeting);
    if (!id) continue;

    const scheduledMs = new Date(meeting.scheduledAt).getTime();
    if (Number.isNaN(scheduledMs)) continue;

    const notifyAt = scheduledMs - notifyBeforeMs;
    if (now < notifyAt || now >= scheduledMs) continue;

    const dedupeKey = `${meeting.guildId}:${id}`;
    if (notifiedKeys.has(dedupeKey)) continue;

    const guild = client.guilds.cache.get(meeting.guildId);
    if (!guild) continue;

    try {
      const claimed = await claimMeetingNotification(meeting);
      if (!claimed) continue;

      notifiedKeys.add(dedupeKey);
      await sendStaffMeetingDms(guild, meeting);
      console.log(`[Toplantı] Bildirim gönderildi: #${id} (${guild.name})`);
    } catch (err) {
      console.error(`[Toplantı] Bildirim hatası #${id}:`, err?.message || err);
    }
  }
}

async function processMeetingStartNotifications(client) {
  const now = Date.now();
  const maxLateMs = 60 * 60 * 1000;

  const meetings = await Meeting.find({
    status: 'scheduled',
    startedNotifiedAt: null,
    scheduledAt: { $lte: new Date(now) },
  });

  for (const meeting of meetings) {
    const id = getMeetingId(meeting);
    if (!id) continue;

    const scheduledMs = new Date(meeting.scheduledAt).getTime();
    if (Number.isNaN(scheduledMs) || now < scheduledMs) continue;
    if (now - scheduledMs > maxLateMs) continue;

    const dedupeKey = `${meeting.guildId}:${id}:start`;
    if (startedNotifiedKeys.has(dedupeKey)) continue;

    const guild = client.guilds.cache.get(meeting.guildId);
    if (!guild) continue;

    try {
      const claimed = await claimMeetingStartNotification(meeting);
      if (!claimed) continue;

      startedNotifiedKeys.add(dedupeKey);
      await sendStaffMeetingDms(guild, meeting, 'start');
      await syncMeetingChannelPresence(guild, meeting);
      console.log(`[Toplantı] Başlangıç bildirimi gönderildi: #${id} (${guild.name})`);
    } catch (err) {
      console.error(`[Toplantı] Başlangıç bildirimi hatası #${id}:`, err?.message || err);
    }
  }
}

function registerMeetingScheduler(client) {
  const getNextWakeDelay = async () => {
    const now = Date.now();
    const notifyBeforeMs = TOP.notifyMinutesBefore * 60 * 1000;
    const maxLateMs = 60 * 60 * 1000;

    const meetings = await Meeting.find({ status: 'scheduled' });
    if (!meetings.length) return IDLE_CHECK_MS;

    let nextWake = null;

    for (const meeting of meetings) {
      const scheduledMs = new Date(meeting.scheduledAt).getTime();
      if (Number.isNaN(scheduledMs)) continue;

      const notifyAt = scheduledMs - notifyBeforeMs;
      const candidates = [];

      if (!meeting.notifiedAt) {
        candidates.push(notifyAt <= now ? now : notifyAt);
      }
      if (!meeting.startedNotifiedAt) {
        if (scheduledMs <= now && now - scheduledMs <= maxLateMs) {
          candidates.push(now);
        } else if (scheduledMs > now) {
          candidates.push(scheduledMs);
        }
      }

      for (const at of candidates) {
        if (nextWake === null || at < nextWake) nextWake = at;
      }
    }

    if (nextWake === null) return IDLE_CHECK_MS;
    return Math.max(5000, Math.min(nextWake - now, CHECK_MS));
  };

  const run = async () => {
    try {
      await processMeetingNotifications(client);
      await processMeetingStartNotifications(client);
    } catch (err) {
      console.error('[Toplantı] Zamanlayıcı:', err?.message || err);
    }

    const delay = await getNextWakeDelay().catch(() => CHECK_MS);
    setTimeout(run, delay);
  };

  run();

  console.log(
    `[Toplantı] Bildirim zamanlayıcısı aktif (${TOP.notifyMinutesBefore} dk önce + toplantı saatinde, staff DM).`
  );
  console.log('[Toplantı] Ses katılımı: toplantı başlangıcında ve /toplanti bittir ile senkron.');
}

module.exports = {
  createMeeting,
  listMeetings,
  cancelMeeting,
  takeAttendance,
  registerMeetingScheduler,
  parseMeetingDateTime,
  formatMeetingTime,
};
