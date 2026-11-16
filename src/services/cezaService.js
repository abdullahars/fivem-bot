const { Penalty } = require('../database/models/Penalty');
const { Counter } = require('../database/models/Counter');
const { getIds } = require('../config/loadConfig');
const { baseEmbed } = require('../utils/embedBuilder');
const { formatTemplate } = require('../utils/format');
const { sendLogEmbed } = require('../utils/logChannel');
const { ephemeralPayload } = require('../utils/interaction');
const { isStaff } = require('../utils/permissions');
const CEZA = require('../constants/ceza');
const { applyPenaltyNickname, formatPenaltyExpiryDate } = require('../utils/penaltyNickname');
const { revokeKarakterOnayRole } = require('../utils/karakterOnayRole');
const {
  ContainerBuilder,
  MessageFlags,
} = require('discord.js');
const { parseEmbedColor } = require('../utils/colors');
const { getConfig } = require('../config/loadConfig');

async function getNextPenaltyNumber(guildId) {
  const counter = await Counter.findByIdAndUpdate(
    `penalty_${guildId}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

async function addPenalty(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: CEZA.messages.noPermission }));
  }

  const targetUser = interaction.options.getUser(CEZA.options.user.name, true);
  const reason = interaction.options.getString(CEZA.options.reason.name, true);
  const multiplier = interaction.options.getInteger(CEZA.options.multiplier.name) || 1;
  const days = interaction.options.getInteger(CEZA.options.days.name) || 0;

  if (targetUser.bot) {
    return interaction.reply(ephemeralPayload({ content: CEZA.messages.targetBot }));
  }

  await interaction.deferReply(ephemeralPayload());

  const penaltyNumber = await getNextPenaltyNumber(interaction.guild.id);

  // Bitiş tarihini hesapla
  let expiresAt = null;
  if (days > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
  }

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  let originalNickname = null;
  let nicknameApplied = false;

  if (member && days > 0 && expiresAt) {
    originalNickname = member.nickname ?? null;
    nicknameApplied = await applyPenaltyNickname(member, expiresAt);
  }

  const karakterOnayResult = await revokeKarakterOnayRole(member);

  await Penalty.create({
    guildId: interaction.guild.id,
    penaltyNumber,
    targetId: targetUser.id,
    targetTag: targetUser.tag,
    staffId: interaction.user.id,
    staffTag: interaction.user.tag,
    reason,
    multiplier,
    days,
    expiresAt,
    originalNickname,
    active: true,
  });

  const timestamp = Math.floor(Date.now() / 1000);

  // Public log (#cezalar) - v2 embed
  await sendPublicPenaltyLog(interaction.guild, {
    number: penaltyNumber,
    target: targetUser,
    staff: interaction.user,
    reason,
    multiplier,
    days,
    expiresAt,
    timestamp,
  });

  // Private log (#ceza-log)
  await sendPrivatePenaltyLog(interaction.guild, {
    number: penaltyNumber,
    target: targetUser,
    staff: interaction.user,
    reason,
    multiplier,
    days,
    expiresAt,
    timestamp,
  });

  // Kullanıcıya yanıt
  const duration = days > 0 
    ? formatTemplate(CEZA.duration.days, { days }) 
    : CEZA.duration.permanent;

  const expiryLabel =
    days > 0 && expiresAt ? formatPenaltyExpiryDate(expiresAt) : null;
  const optionalExpiry = expiryLabel
    ? formatTemplate(CEZA.messages.expiryDateLine, { expiryDate: expiryLabel })
    : '';

  const karakterOnayNote =
    {
      removed: CEZA.messages.karakterOnayRemoved,
      none: CEZA.messages.karakterOnayNone,
      failed: CEZA.messages.karakterOnayFailed,
      no_member: CEZA.messages.karakterOnayNoMember,
      not_configured: '',
    }[karakterOnayResult] ?? '';

  return interaction.editReply({
    content: formatTemplate(CEZA.messages.success, {
      target: targetUser.toString(),
      number: penaltyNumber,
      multiplier,
      duration,
      reason,
      optionalExpiry,
      nicknameNote: nicknameApplied
        ? formatTemplate(CEZA.messages.nicknameApplied, { expiryDate: expiryLabel })
        : days > 0
          ? CEZA.messages.nicknameFailed
          : '',
      karakterOnayNote,
    }),
  });
}

async function sendPublicPenaltyLog(guild, data) {
  const ids = getIds();
  if (!ids.cezalarChannelId) return;

  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${CEZA.publicLog.title}`)
  );

  container.addSeparatorComponents((sep) => sep);

  const duration = data.days > 0 
    ? formatTemplate(CEZA.duration.days, { days: data.days }) 
    : CEZA.duration.permanent;

  const expiry = data.expiresAt 
    ? formatTemplate(CEZA.expiry.line, { 
        expiresAt: Math.floor(data.expiresAt.getTime() / 1000) 
      })
    : '';

  const desc = formatTemplate(CEZA.publicLog.desc, {
    number: data.number,
    target: data.target.toString(),
    staff: data.staff.toString(),
    multiplier: data.multiplier,
    duration,
    reason: data.reason,
    timestamp: data.timestamp,
    expiry,
  });

  // Section'a text ekle (button olmadan, sadece text)
  container.addTextDisplayComponents((td) => td.setContent(desc));

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  const channel = await guild.channels.fetch(ids.cezalarChannelId).catch(() => null);
  if (channel?.isTextBased()) {
    await channel.send({
      embeds: [],
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

async function sendPrivatePenaltyLog(guild, data) {
  const ids = getIds();
  if (!ids.cezaLogChannelId) return;

  const duration = data.days > 0 
    ? formatTemplate(CEZA.duration.days, { days: data.days }) 
    : CEZA.duration.permanent;

  const expiry = data.expiresAt 
    ? formatTemplate(CEZA.expiry.line, { 
        expiresAt: Math.floor(data.expiresAt.getTime() / 1000) 
      })
    : '';

  const embed = baseEmbed()
    .setTitle(CEZA.privateLog.title)
    .setDescription(
      formatTemplate(CEZA.privateLog.desc, {
        number: data.number,
        target: data.target.toString(),
        targetId: data.target.id,
        staff: data.staff.toString(),
        staffId: data.staff.id,
        multiplier: data.multiplier,
        duration,
        reason: data.reason,
        timestamp: data.timestamp,
        expiry,
      })
    )
    .setTimestamp();

  await sendLogEmbed(guild, ids.cezaLogChannelId, embed);
}

async function getUserPenalties(guildId, userId, limit = 10) {
  return Penalty.find({ guildId, targetId: userId, active: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function buildSicilText(guildId, userId) {
  const penalties = await getUserPenalties(guildId, userId);

  if (penalties.length === 0) {
    return CEZA.sicil.noPenalties;
  }

  return penalties
    .map((p) => {
      const ts = Math.floor(new Date(p.createdAt).getTime() / 1000);
      const expiry = p.expiresAt 
        ? ` • Açılış: <t:${Math.floor(p.expiresAt.getTime() / 1000)}:R>`
        : '';
      
      return formatTemplate(CEZA.sicil.penaltyLine, {
        number: p.penaltyNumber,
        multiplier: p.multiplier || 1,
        reason: p.reason,
        staff: p.staffTag,
        timestamp: ts,
        expiry,
      });
    })
    .join('\n\n');
}

module.exports = {
  addPenalty,
  getUserPenalties,
  buildSicilText,
};
