const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Ticket } = require('../database/models/Ticket');
const { WhitelistLog } = require('../database/models/WhitelistLog');
const { RoleLog } = require('../database/models/RoleLog');
const { RoleManageLog } = require('../database/models/RoleManageLog');
const { BanLog } = require('../database/models/BanLog');
const { getOrCreate, formatVoiceDuration } = require('./userActivityService');
const { buildRollogEmbed } = require('./roleLogService');
const { buildBanBilgiMessage } = require('./banService');
const { buildSicilText } = require('./cezaService');
const { getInviteStatsForUser, formatInviterLabel } = require('./inviteService');
const { baseEmbed } = require('../utils/embedBuilder');
const { formatTemplate } = require('../utils/format');
const { applyButtonEmoji } = require('../utils/buttonEmoji');
const { getConfig } = require('../config/loadConfig');
const KB = require('../constants/kullaniciBilgi');

const PREFIX = 'kullanici';

function buildBtnId(action, userId) {
  return `${PREFIX}:${action}:${userId}`;
}

function parseBtnId(customId) {
  const parts = customId.split(':');
  if (parts[0] !== PREFIX || parts.length < 3) return null;
  return { action: parts[1], userId: parts[2] };
}

function resolveTargetId(interaction) {
  const user = interaction.options?.getUser(KB.options.user.name);
  const idOpt = interaction.options?.getString(KB.options.id.name);
  if (user) return user.id;
  const raw = (idOpt || '').trim();
  if (/^\d{17,20}$/.test(raw)) return raw;
  const mention = raw.match(/^<@!?(\d{17,20})>$/);
  return mention ? mention[1] : null;
}

async function buildInviteText(guild, userId) {
  const stats = await getInviteStatsForUser(guild, userId);
  const { joinRecord, invitesMade, inviteCodes, invitedCount } = stats;

  const joinedVia = joinRecord
    ? `${formatInviterLabel(joinRecord)} (${joinRecord.inviteUses ?? 0})`
    : KB.fields.inviteUnknown;

  return formatTemplate(KB.fields.inviteBlock, {
    joinedVia,
    invitesMade: String(invitesMade),
    inviteCodes: String(inviteCodes),
    invitedCount: String(invitedCount),
  });
}

async function getSteamHex(guildId, userId) {
  const wl = await WhitelistLog.findOne({
    guildId,
    targetId: userId,
    $or: [{ steamId: { $ne: null } }, { hexId: { $ne: null } }],
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!wl) return KB.fields.idsEmpty;
  const parts = [];
  if (wl.steamId) parts.push(`Steam: \`${wl.steamId}\``);
  if (wl.hexId) parts.push(`Hex: \`${wl.hexId}\``);
  return parts.length ? parts.join('\n') : KB.fields.idsEmpty;
}

async function getLastRoleChanges(guildId, userId, limit = 3) {
  const [audit, manage] = await Promise.all([
    RoleLog.find({ guildId, targetId: userId }).sort({ createdAt: -1 }).limit(limit).lean(),
    RoleManageLog.find({ guildId, targetId: userId }).sort({ createdAt: -1 }).limit(limit).lean(),
  ]);

  const merged = [
    ...audit.map((r) => ({
      at: r.createdAt,
      action: r.action === 'add' ? 'Verildi' : 'Alındı',
      role: r.roleName,
      staff: r.executorTag || 'Sistem',
    })),
    ...manage.map((r) => ({
      at: r.createdAt,
      action: r.action === 'ver' ? 'Verildi' : 'Alındı',
      role: r.roleName,
      staff: r.staffTag,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);

  if (!merged.length) return KB.fields.rolesEmpty;

  return merged
    .map((r) => {
      const ts = Math.floor(new Date(r.at).getTime() / 1000);
      return formatTemplate(KB.roleLine, {
        action: r.action,
        role: r.role,
        staff: r.staff,
        ts: String(ts),
      });
    })
    .join('\n');
}

async function gatherUserInfo(guild, userId) {
  const user = await guild.client.users.fetch(userId).catch(() => null);
  const member = await guild.members.fetch(userId).catch(() => null);

  const [ticketCount, activity, steamHex, rolesText, activeBan, sicilText, inviteText] =
    await Promise.all([
    Ticket.countDocuments({ guildId: guild.id, openerId: userId }),
    getOrCreate(guild.id, userId),
    getSteamHex(guild.id, userId),
    getLastRoleChanges(guild.id, userId, 3),
    BanLog.findOne({ guildId: guild.id, targetId: userId, active: true }).lean(),
    buildSicilText(guild.id, userId),
    buildInviteText(guild, userId),
  ]);

  let liveVoiceMs = activity.voiceTimeMs || 0;
  const { sessions } = require('./voiceTrackingService');
  const key = `${guild.id}:${userId}`;
  const live = sessions.get(key);
  if (live) liveVoiceMs += Date.now() - live.joinedAt;

  return {
    user,
    member,
    ticketCount,
    messageCount: activity.messageCount || 0,
    voiceText: formatVoiceDuration(liveVoiceMs),
    steamHex,
    rolesText,
    sicilText,
    banText: activeBan
      ? formatTemplate(KB.fields.banActive, { reason: activeBan.reason })
      : KB.fields.banNone,
    inviteText,
    joinedAt: member?.joinedAt
      ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`
      : 'Sunucuda değil',
    createdAt: user
      ? `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`
      : '—',
  };
}

function buildButtons(userId) {
  return new ActionRowBuilder().addComponents(
    applyButtonEmoji(
      new ButtonBuilder()
        .setCustomId(buildBtnId(KB.buttons.refresh.id, userId))
        .setLabel(KB.buttons.refresh.label)
        .setStyle(ButtonStyle.Primary),
      KB.buttons.refresh.emoji
    ),
    applyButtonEmoji(
      new ButtonBuilder()
        .setCustomId(buildBtnId(KB.buttons.rollog.id, userId))
        .setLabel(KB.buttons.rollog.label)
        .setStyle(ButtonStyle.Secondary),
      KB.buttons.rollog.emoji
    ),
    applyButtonEmoji(
      new ButtonBuilder()
        .setCustomId(buildBtnId(KB.buttons.ban.id, userId))
        .setLabel(KB.buttons.ban.label)
        .setStyle(ButtonStyle.Danger),
      KB.buttons.ban.emoji
    )
  );
}

async function buildKullaniciBilgiPayload(guild, userId) {
  const info = await gatherUserInfo(guild, userId);
  if (!info.user) return null;

  const config = getConfig();
  const embed = baseEmbed()
    .setTitle(KB.title)
    .setAuthor({
      name: info.user.tag,
      iconURL: info.user.displayAvatarURL({ size: 64 }),
    })
    .setThumbnail(info.user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '🔗 Steam / Hex', value: info.steamHex, inline: false },
      { name: '🎫 Açılan Ticket', value: `**${info.ticketCount}**`, inline: true },
      { name: '💬 Mesaj', value: `**${info.messageCount}**`, inline: true },
      { name: '🔊 Ses', value: `**${info.voiceText}**`, inline: true },
      { name: '📅 Sunucuya Giriş', value: info.joinedAt, inline: true },
      { name: '📅 Hesap', value: info.createdAt, inline: true },
      { name: '🔨 Ban', value: info.banText, inline: true },
      { name: '📨 Davet', value: info.inviteText, inline: false },
      { name: '📋 Sicil', value: info.sicilText.substring(0, 1024), inline: false },
      { name: '🎭 Son 3 Rol İşlemi', value: info.rolesText, inline: false }
    );

  if (config.bot.footer?.trim()) {
    embed.setFooter({ text: config.bot.footer });
  }

  return {
    embeds: [embed],
    components: [buildButtons(userId)],
  };
}

async function handleKullaniciButton(interaction) {
  const parsed = parseBtnId(interaction.customId);
  if (!parsed) return;

  const targetUser = await interaction.client.users.fetch(parsed.userId).catch(() => null);
  if (!targetUser) {
    return interaction.reply({
      content: KB.notFound,
      ephemeral: true,
    });
  }

  if (parsed.action === KB.buttons.refresh.id) {
    const payload = await buildKullaniciBilgiPayload(interaction.guild, parsed.userId);
    if (!payload) {
      return interaction.update({ content: KB.notFound, embeds: [], components: [] });
    }
    return interaction.update({ ...payload, content: null });
  }

  if (parsed.action === KB.buttons.rollog.id) {
    const embed = await buildRollogEmbed(interaction.guild, targetUser);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (parsed.action === KB.buttons.ban.id) {
    const record =
      (await BanLog.findOne({
        guildId: interaction.guild.id,
        targetId: parsed.userId,
        active: true,
      })) ||
      (await BanLog.findOne({
        guildId: interaction.guild.id,
        targetId: parsed.userId,
      }).sort({ createdAt: -1 }));

    if (!record) {
      return interaction.reply({ content: '❌ Ban kaydı bulunamadı.', ephemeral: true });
    }

    const payload = buildBanBilgiMessage(record, targetUser);
    return interaction.reply({ ...payload, ephemeral: true });
  }
}

module.exports = {
  resolveTargetId,
  buildKullaniciBilgiPayload,
  handleKullaniciButton,
  buildBtnId,
};
