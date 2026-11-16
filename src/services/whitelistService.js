const { WhitelistLog } = require('../database/models/WhitelistLog');
const { getIds, getWhitelistSettings } = require('../config/loadConfig');
const WL = require('../constants/whitelist');
const KAYITSIZ = require('../constants/kayitsiz');
const { formatTemplate } = require('../utils/format');
const { baseEmbed } = require('../utils/embedBuilder');
const { ephemeralPayload } = require('../utils/interaction');
const { recordWhitelistVer, recordKayitsiz } = require('./statsService');
const { sendRatingRequestDm } = require('./kayitPuanService');
const { buildSicilText } = require('./cezaService');
const {
  ContainerBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { parseEmbedColor } = require('../utils/colors');
const { getConfig } = require('../config/loadConfig');

function isPlaceholderRole(id) {
  return !id || id.includes('ROL_ID') || id.includes('_ID');
}

async function countTodayActions(guildId, staffId, action) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return WhitelistLog.countDocuments({
    guildId,
    staffId,
    action,
    createdAt: { $gte: start },
  });
}

async function checkLimit(guildId, staffId, action) {
  const settings = getWhitelistSettings();
  const limits = {
    ver: settings.verPerDay,
    kayitsiz: settings.kayitsizPerDay,
  };
  const limit = limits[action];
  if (!limit || limit <= 0) return null;

  const count = await countTodayActions(guildId, staffId, action);
  if (count >= limit) {
    if (action === 'ver') return formatTemplate(WL.messages.limitVer, { limit });
    return formatTemplate(KAYITSIZ.limit, { limit });
  }
  return null;
}

function validateIds(steam, hex) {
  const settings = getWhitelistSettings();
  if (settings.requireSteam && !steam?.trim()) return WL.messages.steamRequired;
  if (settings.requireHex && !hex?.trim()) return WL.messages.hexRequired;
  return null;
}

function isPlaceholderChannel(channelId) {
  return !channelId || String(channelId).includes('KANAL') || String(channelId).includes('_ID');
}

async function fetchTextChannel(guild, channelId) {
  if (isPlaceholderChannel(channelId)) return null;
  const cached = guild.channels.cache.get(channelId);
  if (cached?.isTextBased()) return cached;
  try {
    const fetched = await guild.channels.fetch(channelId);
    return fetched?.isTextBased() ? fetched : null;
  } catch {
    return null;
  }
}

async function sendEmbedToChannel(guild, channelId, embed) {
  const channel = await fetchTextChannel(guild, channelId);
  if (!channel) return;
  await channel.send({ embeds: [embed] });
}

function buildWhitelistOnayEmbed(data) {
  return baseEmbed()
    .setTitle(WL.log.onayTitle)
    .setDescription(
      formatTemplate(WL.log.onayDesc, {
        staff: data.staff,
        target: data.target,
        steam: data.steam || '—',
        hex: data.hex || '—',
      })
    )
    .setTimestamp();
}

function buildWhitelistRedEmbed(data) {
  return baseEmbed()
    .setTitle(WL.log.redTitle)
    .setDescription(
      formatTemplate(WL.log.redDesc, {
        staff: data.staff,
        target: data.target,
        reason: data.reason || '—',
        steam: data.steam || '—',
        hex: data.hex || '—',
      })
    )
    .setTimestamp();
}

function buildWhitelistSummaryOnayEmbed(data) {
  return baseEmbed()
    .setTitle(WL.log.summaryOnayTitle)
    .setDescription(
      formatTemplate(WL.log.onayDesc, {
        staff: data.staff,
        target: data.target,
        steam: data.steam || '—',
        hex: data.hex || '—',
      })
    )
    .setTimestamp();
}

function buildWhitelistSummaryRedEmbed(data) {
  return baseEmbed()
    .setTitle(WL.log.summaryRedTitle)
    .setDescription(
      formatTemplate(WL.log.redDesc, {
        staff: data.staff,
        target: data.target,
        reason: data.reason || '—',
        steam: data.steam || '—',
        hex: data.hex || '—',
      })
    )
    .setTimestamp();
}

async function sendWhitelistOnayLogs(guild, data) {
  const ids = getIds();
  const onayEmbed = buildWhitelistOnayEmbed(data);
  const summaryEmbed = buildWhitelistSummaryOnayEmbed(data);
  await sendEmbedToChannel(guild, ids.whitelistOnayLogChannelId, onayEmbed);
  await sendEmbedToChannel(guild, ids.whitelistLogChannelId, summaryEmbed);
}

async function sendWhitelistRedLogs(guild, data) {
  const ids = getIds();
  const redEmbed = buildWhitelistRedEmbed(data);
  const summaryEmbed = buildWhitelistSummaryRedEmbed(data);
  await sendEmbedToChannel(guild, ids.whitelistRedLogChannelId, redEmbed);
  await sendEmbedToChannel(guild, ids.whitelistLogChannelId, summaryEmbed);
}

async function sendKayitsizWhitelistLog(guild, data) {
  const ids = getIds();
  const embed = baseEmbed()
    .setTitle(WL.log.kayitsizTitle)
    .setDescription(
      formatTemplate(WL.log.kayitsizDesc, {
        staff: data.staff,
        target: data.target,
      })
    )
    .setTimestamp();
  await sendEmbedToChannel(guild, ids.whitelistLogChannelId, embed);
}

async function saveLog(guildId, action, staff, target, steam, hex, rejectReason = null) {
  await WhitelistLog.create({
    guildId,
    action,
    staffId: staff.id,
    staffTag: staff.tag,
    targetId: target.id,
    targetTag: target.tag,
    steamId: steam?.trim() || null,
    hexId: hex?.trim() || null,
    rejectReason: rejectReason?.trim() || null,
  });
}

async function dmUser(user, content) {
  try {
    await user.send(content);
  } catch {
    /* DM kapalı */
  }
}

async function applyWhitelistRoles(member) {
  const ids = getIds();
  if (isPlaceholderRole(ids.whitelistRoleId) || isPlaceholderRole(ids.kayitsizRoleId)) {
    return WL.messages.roleNotConfigured;
  }

  const me = member.guild.members.me;
  if (!me.permissions.has('ManageRoles')) return WL.messages.botCantManage;

  const wlRole = member.guild.roles.cache.get(ids.whitelistRoleId);
  const kayitsizRole = member.guild.roles.cache.get(ids.kayitsizRoleId);
  if (!wlRole || !kayitsizRole) return WL.messages.roleNotConfigured;
  if (wlRole.position >= me.roles.highest.position) return WL.messages.botCantManage;

  if (member.roles.cache.has(ids.whitelistRoleId)) {
    return formatTemplate(WL.messages.alreadyWhitelist, { target: member.toString() });
  }

  await member.roles.add(ids.whitelistRoleId);
  if (member.roles.cache.has(ids.kayitsizRoleId)) {
    await member.roles.remove(ids.kayitsizRoleId);
  }

  if (me.permissions.has('ManageNicknames') && member.manageable) {
    try {
      await member.setNickname(WL.pendingIcNickname, 'Whitelist kaydı — IC isim bekleniyor');
    } catch (err) {
      console.warn('[Whitelist] Takma ad değiştirilemedi:', err.message);
    }
  }

  return null;
}

async function applyKayitsizRoles(member) {
  const ids = getIds();
  if (isPlaceholderRole(ids.kayitsizRoleId)) {
    return WL.messages.roleNotConfigured;
  }

  const me = member.guild.members.me;
  if (!me.permissions.has('ManageRoles')) return WL.messages.botCantManage;

  const kayitsizRole = member.guild.roles.cache.get(ids.kayitsizRoleId);
  if (!kayitsizRole) return WL.messages.roleNotConfigured;
  if (kayitsizRole.position >= me.roles.highest.position) return WL.messages.botCantManage;

  const removable = member.roles.cache.filter(
    (role) =>
      role.id !== member.guild.id &&
      role.id !== ids.kayitsizRoleId &&
      role.position < me.roles.highest.position
  );

  if (removable.size > 0) {
    await member.roles.remove([...removable.keys()], 'Kayıtsıza atıldı — roller alındı');
  }

  if (!member.roles.cache.has(ids.kayitsizRoleId)) {
    await member.roles.add(ids.kayitsizRoleId, 'Kayıtsıza atıldı');
  }

  if (me.permissions.has('ManageNicknames') && member.manageable) {
    try {
      await member.setNickname(null, 'Kayıtsıza atıldı — isim sıfırlandı');
    } catch {
      /* sunucu sahibi veya yetki yetersiz */
    }
  }

  return null;
}

async function getRecentJoinLeaveEvents(guild, userId, limit = 5) {
  try {
    const auditLogs = await guild.fetchAuditLogs({
      limit: 100,
      type: null, // Fetch all types
    });

    const events = [];
    
    // Check member join events from audit logs
    const joins = auditLogs.entries.filter(
      entry => entry.targetId === userId && entry.action === 'MEMBER_JOIN'
    );
    
    for (const entry of joins) {
      events.push({
        type: 'join',
        timestamp: entry.createdTimestamp,
      });
    }

    // For leaves, we need to check the member's join history
    // Since we can't reliably get leave events from audit logs,
    // we'll just show the current join if member is in server
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member?.joinedTimestamp) {
      events.push({
        type: 'join',
        timestamp: member.joinedTimestamp,
      });
    }

    // Sort by timestamp descending and limit
    events.sort((a, b) => b.timestamp - a.timestamp);
    return events.slice(0, limit);
  } catch (error) {
    console.error('[Whitelist] Join/Leave fetch error:', error);
    return [];
  }
}

async function buildApprovalPanel(guild, targetUser, steam, hex) {
  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  // Title
  container.addTextDisplayComponents((td) =>
    td.setContent(`## Whitelist Onay Paneli\n### ${targetUser.tag}`)
  );

  container.addSeparatorComponents((sep) => sep);

  // User info
  container.addTextDisplayComponents((td) =>
    td.setContent(`**Kullanıcı:** ${targetUser.toString()}\n**ID:** ${targetUser.id}`)
  );

  // Join/Leave history
  const joinLeaveEvents = await getRecentJoinLeaveEvents(guild, targetUser.id, 5);
  let joinLeaveText = '**Son Giriş/Çıkışlar:**\n';
  
  if (joinLeaveEvents.length === 0) {
    joinLeaveText += '• Kayıt bulunamadı';
  } else {
    joinLeaveEvents.forEach((event, index) => {
      const ts = Math.floor(event.timestamp / 1000);
      const icon = event.type === 'join' ? '🟢' : '🔴';
      const label = event.type === 'join' ? 'Giriş' : 'Çıkış';
      joinLeaveText += `${icon} ${label}: <t:${ts}:R>\n`;
    });
  }

  container.addTextDisplayComponents((td) => td.setContent(joinLeaveText));

  // Sicil (Penalty history)
  const sicilText = await buildSicilText(guild.id, targetUser.id);
  container.addTextDisplayComponents((td) =>
    td.setContent(`**Sicil:**\n${sicilText}`)
  );

  // Steam and Hex if provided
  if (steam || hex) {
    let idsText = '**ID Bilgileri:**\n';
    if (steam) idsText += `• Steam: ${steam}\n`;
    if (hex) idsText += `• Hex: ${hex}\n`;
    container.addTextDisplayComponents((td) => td.setContent(idsText));
  }

  container.addSeparatorComponents((sep) => sep);

  // Approve button section
  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((td) => td.setContent('**Whitelist Onay**'))
      .setButtonAccessory((button) =>
        button
          .setCustomId(`${WL.buttons.approvePrefix}${targetUser.id}`)
          .setLabel('Onay')
          .setStyle(ButtonStyle.Success)
      )
  );

  // Reject button section
  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((td) => td.setContent('**Whitelist Red**'))
      .setButtonAccessory((button) =>
        button
          .setCustomId(`${WL.buttons.rejectPrefix}${targetUser.id}`)
          .setLabel('Red')
          .setStyle(ButtonStyle.Danger)
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

async function giveWhitelist(interaction, targetMemberOverride = null) {
  let targetUser, steam, hex;
  
  // Context menu'den mi yoksa slash command'dan mı geldiğini kontrol et
  if (targetMemberOverride) {
    // Context menu
    targetUser = targetMemberOverride.user;
    steam = null;
    hex = null;
  } else {
    // Slash command
    targetUser = interaction.options.getUser(WL.options.user.name, true);
    steam = interaction.options.getString(WL.options.steam.name);
    hex = interaction.options.getString(WL.options.hex.name);
  }

  if (targetUser.bot) {
    return interaction.reply(ephemeralPayload({ content: WL.messages.targetBot }));
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply(ephemeralPayload());
  }

  const limitErr = await checkLimit(interaction.guild.id, interaction.user.id, 'ver');
  if (limitErr) return interaction.editReply(ephemeralPayload({ content: limitErr }));

  const idErr = validateIds(steam, hex);
  if (idErr) return interaction.editReply(ephemeralPayload({ content: idErr }));

  const member = targetMemberOverride || await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.editReply(
      ephemeralPayload({ content: '❌ Kullanıcı sunucuda bulunamadı.' })
    );
  }

  // Show approval panel
  const panelPayload = await buildApprovalPanel(interaction.guild, targetUser, steam, hex);
  
  // Store the pending whitelist data in the interaction message
  // We'll retrieve it when the button is clicked
  global.pendingWhitelists = global.pendingWhitelists || new Map();
  global.pendingWhitelists.set(targetUser.id, {
    staffId: interaction.user.id,
    steam,
    hex,
    member,
  });

  return interaction.editReply(panelPayload);
}

async function handleWhitelistApproval(interaction) {
  const targetUserId = interaction.customId.slice(WL.buttons.approvePrefix.length);
  const pendingData = global.pendingWhitelists?.get(targetUserId);

  if (!pendingData) {
    return interaction.reply(
      ephemeralPayload({ content: '❌ Bu whitelist isteği artık geçerli değil.' })
    );
  }

  await interaction.deferUpdate();

  const { member, steam, hex, staffId } = pendingData;
  const targetUser = member.user;

  // Apply whitelist roles
  const roleErr = await applyWhitelistRoles(member);
  if (roleErr) {
    return interaction.followUp(ephemeralPayload({ content: roleErr }));
  }

  // Save log and stats
  await saveLog(interaction.guild.id, 'ver', interaction.user, targetUser, steam, hex);
  await recordWhitelistVer(interaction.guild.id, interaction.user.id);
  await sendWhitelistOnayLogs(interaction.guild, {
    staff: interaction.user.toString(),
    target: targetUser.toString(),
    steam: steam?.trim(),
    hex: hex?.trim(),
  });

  sendRatingRequestDm(
    interaction.client,
    interaction.guild,
    targetUser,
    interaction.user
  ).catch(() => {});

  // Clean up pending data
  global.pendingWhitelists.delete(targetUserId);

  const container = buildWhitelistResultContainer(
    'Whitelist Onaylandı',
    `**Kullanıcı:** ${targetUser.toString()}\n**Onaylayan:** ${interaction.user.toString()}`
  );

  try {
    await interaction.editReply({
      embeds: [],
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    console.warn('[Whitelist] Onay paneli güncellenemedi:', err.message);
  }

  return interaction
    .followUp(
      ephemeralPayload({
        content: formatTemplate(WL.messages.verSuccess, { target: targetUser.toString() }),
      })
    )
    .catch(() => {});
}

function buildRejectModal(targetUserId) {
  const modal = new ModalBuilder()
    .setCustomId(`${WL.buttons.rejectModalPrefix}${targetUserId}`)
    .setTitle(WL.modal.title);

  const input = new TextInputBuilder()
    .setCustomId(WL.modal.reasonId)
    .setLabel(WL.modal.reasonLabel)
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(3)
    .setMaxLength(500)
    .setRequired(true)
    .setPlaceholder(WL.modal.reasonPlaceholder);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

async function handleWhitelistRejection(interaction) {
  const targetUserId = interaction.customId.slice(WL.buttons.rejectPrefix.length);
  const pendingData = global.pendingWhitelists?.get(targetUserId);

  if (!pendingData) {
    return interaction.reply(
      ephemeralPayload({ content: '❌ Bu whitelist isteği artık geçerli değil.' })
    );
  }

  return interaction.showModal(buildRejectModal(targetUserId));
}

function buildWhitelistResultContainer(title, body) {
  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );
  container.addTextDisplayComponents((td) => td.setContent(`## ${title}\n\n${body}`));
  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }
  return container;
}

async function handleWhitelistRejectModal(interaction) {
  const targetUserId = interaction.customId.slice(WL.buttons.rejectModalPrefix.length);
  const pendingData = global.pendingWhitelists?.get(targetUserId);

  if (!pendingData) {
    return interaction.reply(
      ephemeralPayload({ content: '❌ Bu whitelist isteği artık geçerli değil.' })
    );
  }

  const reason = interaction.fields.getTextInputValue(WL.modal.reasonId)?.trim();
  if (!reason || reason.length < 3) {
    return interaction.reply(
      ephemeralPayload({ content: '❌ Geçerli bir red sebebi yazmalısınız (en az 3 karakter).' })
    );
  }

  const { member, steam, hex } = pendingData;
  const targetUser = member.user;

  await interaction.deferUpdate();

  try {
    await saveLog(interaction.guild.id, 'red', interaction.user, targetUser, steam, hex, reason);
    await sendWhitelistRedLogs(interaction.guild, {
      staff: interaction.user.toString(),
      target: targetUser.toString(),
      reason,
      steam: steam?.trim(),
      hex: hex?.trim(),
    });
    await dmUser(targetUser, formatTemplate(WL.dm.red, { reason }));
  } catch (err) {
    console.error('[Whitelist] Red işlemi hatası:', err);
    global.pendingWhitelists.delete(targetUserId);
    return interaction.followUp(
      ephemeralPayload({
        content: '❌ Log veya DM gönderilirken hata oluştu. Konsolu kontrol edin.',
      })
    );
  }

  global.pendingWhitelists.delete(targetUserId);

  const container = buildWhitelistResultContainer(
    'Whitelist Reddedildi',
    `**Kullanıcı:** ${targetUser.toString()}\n**Reddeden:** ${interaction.user.toString()}\n**Sebep:** ${reason}`
  );

  try {
    await interaction.editReply({
      embeds: [],
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    console.warn('[Whitelist] Panel güncellenemedi:', err.message);
    await interaction
      .followUp(
        ephemeralPayload({
          content: `❌ ${targetUser.toString()} reddedildi (panel güncellenemedi). Loglar gönderildi.`,
        })
      )
      .catch(() => {});
    return;
  }

  await interaction
    .followUp(
      ephemeralPayload({
        content: `❌ ${targetUser.toString()} reddedildi. Log kanallarına ve oyuncuya bildirim gönderildi.`,
      })
    )
    .catch(() => {});
}

async function assignKayitsiz(interaction) {
  const COMMANDS = require('../constants/commands');
  const targetUser = interaction.options.getUser(COMMANDS.kayitsiz.optionUser.name, true);

  if (targetUser.bot) {
    return interaction.reply(ephemeralPayload({ content: WL.messages.targetBot }));
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply(ephemeralPayload());
  }

  const limitErr = await checkLimit(interaction.guild.id, interaction.user.id, 'kayitsiz');
  if (limitErr) return interaction.editReply(ephemeralPayload({ content: limitErr }));

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.editReply(
      ephemeralPayload({ content: '❌ Kullanıcı sunucuda bulunamadı.' })
    );
  }

  const roleErr = await applyKayitsizRoles(member);
  if (roleErr) return interaction.editReply(ephemeralPayload({ content: roleErr }));

  await saveLog(interaction.guild.id, 'kayitsiz', interaction.user, targetUser, null, null);
  await recordKayitsiz(interaction.guild.id, interaction.user.id);
  await sendKayitsizWhitelistLog(interaction.guild, {
    staff: interaction.user.toString(),
    target: targetUser.toString(),
  });

  return interaction.editReply(
    ephemeralPayload({
      content: formatTemplate(KAYITSIZ.success, { target: targetUser.toString() }),
    })
  );
}

module.exports = {
  giveWhitelist,
  assignKayitsiz,
  handleWhitelistApproval,
  handleWhitelistRejection,
  handleWhitelistRejectModal,
};
