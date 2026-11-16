const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { Mazaret } = require('../database/models/Mazaret');
const { getIds } = require('../config/loadConfig');
const { baseEmbed } = require('../utils/embedBuilder');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');
const { getTextChannel } = require('../utils/logChannel');
const { isStaff, canReviewMazaret } = require('../utils/permissions');
const MAZ = require('../constants/mazaret');
const TOP = require('../constants/toplanti');
const { TZ } = require('../utils/istanbulTime');
const { Meeting } = require('../database/models/Meeting');

function parseMazaretDateTime(input) {
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

function getMazaretId(record) {
  return String(record?._id ?? record?.id ?? '');
}

function formatMazaretTime(date) {
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

function sourceLabel(source) {
  return MAZ.source[source] || source || '—';
}

function statusLabel(status) {
  return MAZ.status[status] || status || '—';
}

async function resolveGuildMember(interaction, meetingId = null) {
  if (interaction.inGuild() && interaction.member) {
    return { guild: interaction.guild, member: interaction.member };
  }

  if (!meetingId) return { guild: null, member: null };

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) return { guild: null, member: null };

  const guild =
    interaction.client.guilds.cache.get(meeting.guildId) ||
    (await interaction.client.guilds.fetch(meeting.guildId).catch(() => null));
  if (!guild) return { guild: null, member: null };

  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  return { guild, member };
}

function buildReviewButtons(mazaretId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${MAZ.buttons.approvePrefix}${mazaretId}`)
      .setLabel(MAZ.buttons.approve)
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${MAZ.buttons.rejectPrefix}${mazaretId}`)
      .setLabel(MAZ.buttons.reject)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function buildLogEmbed(record, { reviewed = false } = {}) {
  const id = getMazaretId(record);
  const meetingLine = record.meetingTitle
    ? `**#${record.meetingId}** — ${record.meetingTitle}`
    : MAZ.messages.noMeeting;

  if (reviewed) {
    return baseEmbed()
      .setTitle(
        formatTemplate(MAZ.messages.logReviewedTitle, {
          id,
          status: statusLabel(record.status),
        })
      )
      .setDescription(
        formatTemplate(MAZ.messages.logReviewedDesc, {
          user: `<@${record.userId}> (\`${record.userTag}\`)`,
          reason: record.reason,
          end: formatMazaretTime(record.endsAt),
          source: sourceLabel(record.source),
          meeting: meetingLine,
          reviewer: record.reviewedById ? `<@${record.reviewedById}>` : '—',
          rejectReason: record.rejectReason || '—',
        })
      )
      .setTimestamp(record.reviewedAt || record.updatedAt);
  }

  return baseEmbed()
    .setTitle(formatTemplate(MAZ.messages.logTitle, { id }))
    .setDescription(
      formatTemplate(MAZ.messages.logDesc, {
        user: `<@${record.userId}> (\`${record.userTag}\`)`,
        reason: record.reason,
        end: formatMazaretTime(record.endsAt),
        source: sourceLabel(record.source),
        meeting: meetingLine,
        status: statusLabel(record.status),
      })
    )
    .setTimestamp(record.createdAt);
}

async function hasMeetingMazaret(guildId, userId, meetingId) {
  if (!meetingId) return false;
  const existing = await Mazaret.findOne({
    guildId,
    userId,
    meetingId: String(meetingId),
    status: { $in: ['pending', 'approved'] },
  });
  return Boolean(existing);
}

async function postMazaretLog(guild, record) {
  const channelId = getIds().mazaretLogChannelId;
  const channel = await getTextChannel(guild, channelId);
  if (!channel) {
    throw new Error(MAZ.messages.logChannelMissing);
  }

  const embed = buildLogEmbed(record);
  const components = [buildReviewButtons(getMazaretId(record))];
  const msg = await channel.send({ embeds: [embed], components });

  record.logChannelId = channel.id;
  record.logMessageId = msg.id;
  await record.save();

  return msg;
}

async function sendResultDm(client, record) {
  const user = await client.users.fetch(record.userId).catch(() => null);
  if (!user) return false;

  const template =
    record.status === 'approved' ? MAZ.messages.dmApproved : MAZ.messages.dmRejected;

  const content = formatTemplate(template, {
    reason: record.reason,
    end: formatMazaretTime(record.endsAt),
    source: sourceLabel(record.source),
    rejectReason: record.rejectReason || '—',
  });

  try {
    await user.send(content);
    return true;
  } catch {
    return false;
  }
}

async function updateLogAfterReview(guild, record) {
  if (!record.logChannelId || !record.logMessageId) return;

  const channel = await getTextChannel(guild, record.logChannelId);
  if (!channel) return;

  const msg = await channel.messages.fetch(record.logMessageId).catch(() => null);
  if (!msg) return;

  await msg.edit({
    embeds: [buildLogEmbed(record, { reviewed: true })],
    components: [buildReviewButtons(getMazaretId(record), true)],
  });
}

async function createMazaret({
  guild,
  user,
  reason,
  endsAt,
  source,
  meetingId = null,
  meetingTitle = null,
}) {
  let resolvedTitle = meetingTitle;
  if (meetingId && !resolvedTitle) {
    const meeting = await Meeting.findById(meetingId);
    resolvedTitle = meeting?.title || null;
  }

  const record = await Mazaret.create({
    guildId: guild.id,
    userId: user.id,
    userTag: user.tag,
    reason,
    endsAt,
    status: 'pending',
    source,
    meetingId: meetingId ? String(meetingId) : null,
    meetingTitle: resolvedTitle,
  });

  await postMazaretLog(guild, record);
  return record;
}

async function submitMazaretSlash(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MAZ.noPermission }));
  }

  const reason = interaction.options.getString(MAZ.command.optionSebep.name, true).trim();
  const bitisRaw = interaction.options.getString(MAZ.command.optionBitis.name, true);
  const endsAt = parseMazaretDateTime(bitisRaw);

  if (!reason) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.emptyReason }));
  }
  if (!endsAt) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.invalidDate }));
  }
  if (endsAt.getTime() <= Date.now()) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.pastEndDate }));
  }

  await interaction.deferReply(ephemeralPayload());

  try {
    await createMazaret({
      guild: interaction.guild,
      user: interaction.user,
      reason,
      endsAt,
      source: 'slash',
    });
    return interaction.editReply({ content: MAZ.messages.submitted });
  } catch (err) {
    return interaction.editReply({
      content: err?.message || MAZ.messages.logChannelMissing,
    });
  }
}

function buildMazaretModal(meetingId, phase) {
  const modal = new ModalBuilder()
    .setCustomId(`${MAZ.modal.submitToplantiPrefix}${phase}:${meetingId}`)
    .setTitle('Mazaret Bildir');

  const sebep = new TextInputBuilder()
    .setCustomId(MAZ.modal.sebepId)
    .setLabel('Mazaret sebebi')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const bitis = new TextInputBuilder()
    .setCustomId(MAZ.modal.bitisId)
    .setLabel('Mazaret bitiş (GG.AA.YYYY SS:DD)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('02.06.2026 20:30')
    .setMaxLength(32);

  modal.addComponents(
    new ActionRowBuilder().addComponents(sebep),
    new ActionRowBuilder().addComponents(bitis)
  );

  return modal;
}

async function handleMazaretToplantiButton(interaction) {
  const rest = interaction.customId.slice(MAZ.buttons.toplantiOpenPrefix.length);
  const [phase, meetingId] = rest.split(':');
  if (!phase || !meetingId) return;

  const { guild, member } = await resolveGuildMember(interaction, meetingId);
  if (!guild || !member || !isStaff(member)) {
    return interaction.reply(ephemeralPayload({ content: MAZ.noPermission }));
  }

  if (await hasMeetingMazaret(guild.id, interaction.user.id, meetingId)) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.alreadySubmitted }));
  }

  return interaction.showModal(buildMazaretModal(meetingId, phase));
}

async function handleMazaretToplantiModal(interaction) {
  const rest = interaction.customId.slice(MAZ.modal.submitToplantiPrefix.length);
  const [phase, meetingId] = rest.split(':');
  if (!phase || !meetingId) return;

  const { guild, member } = await resolveGuildMember(interaction, meetingId);
  if (!guild || !member || !isStaff(member)) {
    return interaction.reply(ephemeralPayload({ content: MAZ.noPermission }));
  }

  if (await hasMeetingMazaret(guild.id, interaction.user.id, meetingId)) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.alreadySubmitted }));
  }

  const reason = interaction.fields.getTextInputValue(MAZ.modal.sebepId)?.trim();
  const bitisRaw = interaction.fields.getTextInputValue(MAZ.modal.bitisId)?.trim();
  const endsAt = parseMazaretDateTime(bitisRaw);

  if (!reason) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.emptyReason }));
  }
  if (!endsAt) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.invalidDate }));
  }
  if (endsAt.getTime() <= Date.now()) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.pastEndDate }));
  }

  const source = phase === 'start' ? 'meetingStart' : 'meetingBefore';

  await interaction.deferReply(ephemeralPayload());

  try {
    await createMazaret({
      guild,
      user: interaction.user,
      reason,
      endsAt,
      source,
      meetingId,
    });
    return interaction.editReply({ content: MAZ.messages.submitted });
  } catch (err) {
    return interaction.editReply({
      content: err?.message || MAZ.messages.logChannelMissing,
    });
  }
}

async function handleMazaretApprove(interaction) {
  if (!canReviewMazaret(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MAZ.noReviewPermission }));
  }

  const mazaretId = interaction.customId.slice(MAZ.buttons.approvePrefix.length);
  const record = await Mazaret.findById(mazaretId);
  if (!record || record.guildId !== interaction.guild.id) {
    return interaction.update({ content: MAZ.messages.notFound, embeds: [], components: [] });
  }
  if (record.status !== 'pending') {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.alreadyReviewed }));
  }

  record.status = 'approved';
  record.reviewedById = interaction.user.id;
  record.reviewedByTag = interaction.user.tag;
  record.reviewedAt = new Date();
  await record.save();

  await updateLogAfterReview(interaction.guild, record);
  await sendResultDm(interaction.client, record);

  return interaction.update({
    content: MAZ.messages.approved,
    embeds: [buildLogEmbed(record, { reviewed: true })],
    components: [buildReviewButtons(mazaretId, true)],
  });
}

function buildRejectModal(mazaretId) {
  const modal = new ModalBuilder()
    .setCustomId(`${MAZ.modal.rejectModalPrefix}${mazaretId}`)
    .setTitle('Mazaret Red Sebebi');

  const input = new TextInputBuilder()
    .setCustomId(MAZ.modal.rejectReasonId)
    .setLabel('Red sebebi')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

async function handleMazaretRejectButton(interaction) {
  if (!canReviewMazaret(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MAZ.noReviewPermission }));
  }

  const mazaretId = interaction.customId.slice(MAZ.buttons.rejectPrefix.length);
  const record = await Mazaret.findById(mazaretId);
  if (!record || record.guildId !== interaction.guild.id) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.notFound }));
  }
  if (record.status !== 'pending') {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.alreadyReviewed }));
  }

  return interaction.showModal(buildRejectModal(mazaretId));
}

async function handleMazaretRejectModal(interaction) {
  if (!canReviewMazaret(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MAZ.noReviewPermission }));
  }

  const mazaretId = interaction.customId.slice(MAZ.modal.rejectModalPrefix.length);
  const record = await Mazaret.findById(mazaretId);
  if (!record || record.guildId !== interaction.guild.id) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.notFound }));
  }
  if (record.status !== 'pending') {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.alreadyReviewed }));
  }

  const rejectReason = interaction.fields
    .getTextInputValue(MAZ.modal.rejectReasonId)
    ?.trim();
  if (!rejectReason) {
    return interaction.reply(ephemeralPayload({ content: MAZ.messages.emptyRejectReason }));
  }

  record.status = 'rejected';
  record.rejectReason = rejectReason;
  record.reviewedById = interaction.user.id;
  record.reviewedByTag = interaction.user.tag;
  record.reviewedAt = new Date();
  await record.save();

  await updateLogAfterReview(interaction.guild, record);
  await sendResultDm(interaction.client, record);

  return interaction.reply(ephemeralPayload({ content: MAZ.messages.rejected }));
}

async function buildMeetingNotifyDm(guild, meeting, member, kind) {
  const meetingId = String(meeting?._id ?? meeting?.id ?? '');
  const channel = guild.channels.cache.get(meeting.voiceChannelId);
  const channelLabel = channel ? channel.toString() : `<#${meeting.voiceChannelId}>`;
  const template = kind === 'start' ? TOP.notify.dmStart : TOP.notify.dm;
  const content = formatTemplate(template, {
    title: meeting.title,
    time: formatMeetingTime(meeting.scheduledAt),
    channel: channelLabel,
  });

  const alreadySubmitted = await hasMeetingMazaret(guild.id, member.id, meetingId);
  const disabled = alreadySubmitted;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${MAZ.buttons.toplantiOpenPrefix}${kind}:${meetingId}`)
      .setLabel(MAZ.buttons.toplantiLabel)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );

  return { content, components: [row] };
}

async function listMeetingMazarets(guildId, meeting) {
  const meetingId = String(meeting?._id ?? meeting?.id ?? '');
  const meetingStartMs = new Date(meeting.scheduledAt).getTime();
  const meetingEndMs = new Date(meeting.endedAt || Date.now()).getTime();

  const [tied, general] = await Promise.all([
    Mazaret.find({
      guildId,
      meetingId,
      status: { $in: ['pending', 'approved'] },
    }),
    Mazaret.find({
      guildId,
      source: 'slash',
      meetingId: null,
      status: { $in: ['pending', 'approved'] },
    }),
  ]);

  const activeGeneral = general.filter((record) => {
    const endsMs = new Date(record.endsAt).getTime();
    const createdMs = new Date(record.createdAt).getTime();
    if (Number.isNaN(endsMs) || Number.isNaN(meetingStartMs)) return false;
    return endsMs >= meetingStartMs && createdMs <= meetingEndMs;
  });

  const byUser = new Map();
  for (const record of activeGeneral) {
    byUser.set(record.userId, record);
  }
  for (const record of tied) {
    byUser.set(record.userId, record);
  }

  return [...byUser.values()];
}

module.exports = {
  submitMazaretSlash,
  handleMazaretToplantiButton,
  handleMazaretToplantiModal,
  handleMazaretApprove,
  handleMazaretRejectButton,
  handleMazaretRejectModal,
  buildMeetingNotifyDm,
  hasMeetingMazaret,
  listMeetingMazarets,
};
