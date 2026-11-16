const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { IcIsimPending } = require('../database/models/IcIsimPending');
const { IcIsimLog } = require('../database/models/IcIsimLog');
const { getIcIsimSettings, getIds } = require('../config/loadConfig');
const IC = require('../constants/icIsim');
const { formatTemplate } = require('../utils/format');
const { baseEmbed } = require('../utils/embedBuilder');
const { recordIcOnay, recordIcRed } = require('./statsService');
const { isStaff } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');
const { reactWithConfigEmoji } = require('../utils/discordEmoji');

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function titleCaseWord(word) {
  const lower = word.toLocaleLowerCase('tr-TR');
  if (!lower) return word;
  return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
}

function formatApprovedName(raw) {
  return countWords(raw).map(titleCaseWord).join(' ');
}

function validateName(raw) {
  const words = countWords(raw);
  if (words.length < 2 || words.length > 3) {
    return IC.rejectReasons.invalidWords;
  }
  if (!IC.ALLOWED_NAME_REGEX.test(raw.trim())) {
    return IC.rejectReasons.foreign;
  }
  for (const word of words) {
    const letters = [...word].filter((c) => /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(c));
    if (letters.length > 0 && letters.every((c) => IC.VOWELS.includes(c))) {
      return IC.rejectReasons.vowelOnly;
    }
  }
  return null;
}

function buildIcIsimButtonRow(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${IC.buttons.approvePrefix}${messageId}`)
      .setLabel('Onayla')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${IC.buttons.rejectPrefix}${messageId}`)
      .setLabel('Reddet')
      .setStyle(ButtonStyle.Danger)
  );
}

function isIcChannel(channelId) {
  const { enabled, channelId: configured } = getIcIsimSettings();
  if (!enabled || !configured || configured.includes('KANAL_ID')) return false;
  return channelId === configured;
}

const {
  getKarakterOnayRoleId,
  memberHasKarakterOnay,
} = require('../utils/karakterOnayRole');

async function grantKarakterOnayRole(member) {
  const roleId = getKarakterOnayRoleId();
  if (!roleId || !member || member.roles.cache.has(roleId)) return;

  try {
    await member.roles.add(roleId, 'IC isim onayı');
  } catch (err) {
    console.warn('[IC İsim] Karakter onay rolü verilemedi:', err.message);
  }
}

async function getLogChannel(guild) {
  const ids = getIds();
  if (!ids.icIsimLogChannelId || ids.icIsimLogChannelId.includes('KANAL')) return null;

  const cached = guild.channels.cache.get(ids.icIsimLogChannelId);
  if (cached?.isTextBased()) return cached;

  try {
    const fetched = await guild.channels.fetch(ids.icIsimLogChannelId);
    return fetched?.isTextBased() ? fetched : null;
  } catch {
    return null;
  }
}

async function sendIcLog(guild, data) {
  const channel = await getLogChannel(guild);
  if (!channel) {
    console.warn('[IC İsim] Log kanalı bulunamadı:', getIds().icIsimLogChannelId);
    return;
  }

  const isOnay = data.action === 'onay';
  const title = isOnay ? IC.log.onayTitle : IC.log.redTitle;
  const desc = isOnay ? IC.log.onayDesc : IC.log.redDesc;

  const embed = baseEmbed()
    .setTitle(title)
    .setDescription(
      formatTemplate(desc, {
        staff: data.staff || '—',
        target: data.target,
        requested: data.requested,
        final: data.final || '—',
        reason: data.reason || '—',
        messageUrl: data.messageUrl || 'https://discord.com',
      })
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function handleIcNameRequest(message) {
  if (!isIcChannel(message.channelId)) return;
  if (message.author.bot || !message.guild) return;

  const content = message.content?.trim();
  if (!content) return;

  const words = countWords(content);
  if (words.length < 2 || words.length > 3) return;

  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (memberHasKarakterOnay(member)) {
    try {
      const warn = await message.reply({
        content: IC.channel.alreadyHasKarakterOnay,
        allowedMentions: { repliedUser: false },
      });
      setTimeout(() => warn.delete().catch(() => {}), 8000);
    } catch {
      /* ignore */
    }
    return;
  }

  const existing = await IcIsimPending.findOne({ messageId: message.id });
  if (existing) return;

  const pending = await IcIsimPending.create({
    guildId: message.guild.id,
    channelId: message.channelId,
    messageId: message.id,
    userId: message.author.id,
    requestedName: content,
  });

  try {
    const control = await message.reply({
      content: formatTemplate(IC.panel.content, {
        user: message.author.toString(),
        name: content,
      }),
      components: [buildIcIsimButtonRow(message.id)],
      allowedMentions: { parse: [] },
    });
    pending.controlMessageId = control.id;
    await pending.save();
  } catch (err) {
    console.error('[IC İsim] Onay paneli gönderilemedi:', err.message);
    await IcIsimPending.deleteOne({ _id: pending._id }).catch(() => {});
  }
}

async function dmUser(user, content) {
  try {
    await user.send(content);
  } catch {
    /* DM kapalı */
  }
}

async function addApproveReactionToMessage(message) {
  const { approveEmoji } = getIcIsimSettings();
  if (!approveEmoji) return;

  try {
    await reactWithConfigEmoji(message, approveEmoji);
  } catch (err) {
    console.warn('[IC İsim] Onay emojisi eklenemedi:', err.message);
  }
}

async function clearControlMessage(pending, message) {
  if (!pending?.controlMessageId || !message?.channel) return;
  try {
    const control = await message.channel.messages.fetch(pending.controlMessageId);
    await control.delete();
  } catch {
    /* ignore */
  }
}

async function claimPending(messageId) {
  return IcIsimPending.findOneAndUpdate(
    { messageId, status: 'pending' },
    { $set: { status: 'isleniyor' } },
    { new: true }
  );
}

async function verifyStaffAction(pending, staffUser, guild) {
  if (pending.userId === staffUser.id) {
    pending.status = 'pending';
    await pending.save();
    return { ok: false, reason: 'self' };
  }

  const staffMember = await guild.members.fetch(staffUser.id).catch(() => null);
  if (!staffMember || !isStaff(staffMember)) {
    pending.status = 'pending';
    await pending.save();
    return { ok: false, reason: 'not_staff' };
  }

  return { ok: true };
}

async function finalizeReject(pending, message, staffUser, reason) {
  const guild = message.guild;
  const targetMember = await guild.members.fetch(pending.userId).catch(() => null);
  const targetUser =
    targetMember?.user || (await guild.client.users.fetch(pending.userId).catch(() => null));

  pending.status = 'red';
  await pending.save();

  await IcIsimLog.create({
    guildId: guild.id,
    action: 'red',
    staffId: staffUser.id,
    staffTag: staffUser.tag,
    targetId: pending.userId,
    targetTag: targetUser?.tag || pending.userId,
    requestedName: pending.requestedName,
    rejectReason: reason,
    messageId: message.id,
  });

  await recordIcRed(guild.id, staffUser.id);
  await sendIcLog(guild, {
    action: 'red',
    staff: staffUser.toString(),
    target: `<@${pending.userId}>`,
    requested: pending.requestedName,
    reason,
    messageUrl: message.url,
  });

  if (targetUser) {
    await dmUser(targetUser, formatTemplate(IC.dm.red, { reason }));
  }

  await clearControlMessage(pending, message);
}

async function finalizeApprove(pending, message, staffUser) {
  const guild = message.guild;
  const rejectReason = validateName(pending.requestedName);
  if (rejectReason) {
    return finalizeReject(pending, message, staffUser, rejectReason);
  }

  const finalName = formatApprovedName(pending.requestedName);
  const targetMember = await guild.members.fetch(pending.userId).catch(() => null);
  const targetUser =
    targetMember?.user || (await guild.client.users.fetch(pending.userId).catch(() => null));

  if (targetMember) {
    try {
      await targetMember.setNickname(finalName.slice(0, 32), 'IC isim onayı');
    } catch (err) {
      console.warn('[IC İsim] Takma ad değiştirilemedi:', err.message);
    }
    await grantKarakterOnayRole(targetMember);
  }

  pending.status = 'onay';
  await pending.save();

  await IcIsimLog.create({
    guildId: guild.id,
    action: 'onay',
    staffId: staffUser.id,
    staffTag: staffUser.tag,
    targetId: pending.userId,
    targetTag: targetUser?.tag || pending.userId,
    requestedName: pending.requestedName,
    finalName,
    messageId: message.id,
  });

  await recordIcOnay(guild.id, staffUser.id);
  await sendIcLog(guild, {
    action: 'onay',
    staff: staffUser.toString(),
    target: `<@${pending.userId}>`,
    requested: pending.requestedName,
    final: finalName,
    messageUrl: message.url,
  });

  if (targetUser) {
    await dmUser(targetUser, formatTemplate(IC.dm.onay, { name: finalName }));
  }

  await addApproveReactionToMessage(message);
  await clearControlMessage(pending, message);
}

async function runIcIsimApprove(message, staffUser) {
  const pending = await claimPending(message.id);
  if (!pending) return { ok: false, reason: 'already_handled' };

  const check = await verifyStaffAction(pending, staffUser, message.guild);
  if (!check.ok) return check;

  try {
    await finalizeApprove(pending, message, staffUser);
    return { ok: true };
  } catch (err) {
    pending.status = 'pending';
    await pending.save();
    console.error('[IC İsim] İşlem hatası:', err);
    throw err;
  }
}

async function runIcIsimReject(message, staffUser, reason) {
  const pending = await claimPending(message.id);
  if (!pending) return { ok: false, reason: 'already_handled' };

  const check = await verifyStaffAction(pending, staffUser, message.guild);
  if (!check.ok) return check;

  try {
    await finalizeReject(pending, message, staffUser, reason);
    return { ok: true };
  } catch (err) {
    pending.status = 'pending';
    await pending.save();
    console.error('[IC İsim] İşlem hatası:', err);
    throw err;
  }
}

function buildRejectModal(messageId) {
  const modal = new ModalBuilder()
    .setCustomId(`${IC.buttons.rejectModalPrefix}${messageId}`)
    .setTitle(IC.modal.title);

  const input = new TextInputBuilder()
    .setCustomId(IC.modal.reasonId)
    .setLabel(IC.modal.reasonLabel)
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(3)
    .setMaxLength(500)
    .setRequired(true)
    .setPlaceholder(IC.modal.reasonPlaceholder);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

async function handleIcIsimButton(interaction, action) {
  const prefix =
    action === 'approve' ? IC.buttons.approvePrefix : IC.buttons.rejectPrefix;
  const messageId = interaction.customId.slice(prefix.length);

  if (!isIcChannel(interaction.channelId)) {
    return interaction.reply(
      ephemeralPayload({ content: '❌ Bu kanalda IC isim onayı kullanılamaz.' })
    );
  }

  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: '❌ Bu işlem için yetkiniz yok.' }));
  }

  const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    return interaction.reply(
      ephemeralPayload({ content: '❌ Başvuru mesajı bulunamadı.' })
    );
  }

  if (action === 'reject') {
    return interaction.showModal(buildRejectModal(messageId));
  }

  await interaction.deferUpdate();

  const result = await runIcIsimApprove(message, interaction.user);
  return respondIcIsimResult(interaction, result);
}

async function handleIcIsimRejectModal(interaction) {
  const messageId = interaction.customId.slice(IC.buttons.rejectModalPrefix.length);

  if (!isIcChannel(interaction.channelId)) {
    return interaction.reply(
      ephemeralPayload({ content: '❌ Bu kanalda IC isim onayı kullanılamaz.' })
    );
  }

  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: '❌ Bu işlem için yetkiniz yok.' }));
  }

  const reason = interaction.fields.getTextInputValue(IC.modal.reasonId)?.trim();
  if (!reason || reason.length < 3) {
    return interaction.reply(
      ephemeralPayload({ content: '❌ Geçerli bir red sebebi yazmalısınız (en az 3 karakter).' })
    );
  }

  const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    return interaction.reply(
      ephemeralPayload({ content: '❌ Başvuru mesajı bulunamadı.' })
    );
  }

  await interaction.deferReply(ephemeralPayload());

  const result = await runIcIsimReject(message, interaction.user, reason);

  if (result.ok) {
    return interaction.editReply({
      content: '✅ Başvuru reddedildi. Sebep oyuncuya DM ile gönderildi.',
    });
  }

  return interaction.editReply({
    content: icIsimResultMessage(result),
  });
}

function icIsimResultMessage(result) {
  if (result.reason === 'self') {
    return '❌ Kendi başvurunuzu onaylayamaz veya reddedemezsiniz.';
  }
  if (result.reason === 'not_staff') {
    return '❌ Bu işlem için yetkiniz yok.';
  }
  if (result.reason === 'already_handled') {
    return 'ℹ️ Bu başvuru zaten işlendi.';
  }
  return '❌ İşlem tamamlanamadı.';
}

async function respondIcIsimResult(interaction, result) {
  if (result.ok) return;

  return interaction.followUp(
    ephemeralPayload({ content: icIsimResultMessage(result) })
  );
}

module.exports = {
  handleIcNameRequest,
  handleIcIsimButton,
  handleIcIsimRejectModal,
  validateName,
  formatApprovedName,
};
