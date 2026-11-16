const {
  ContainerBuilder,
  MessageFlags,
} = require('discord.js');
const { BlacklistLog } = require('../database/models/BlacklistLog');
const { Counter } = require('../database/models/Counter');
const { getIds, getConfig } = require('../config/loadConfig');
const BLACKLIST = require('../constants/blacklist');
const { formatTemplate } = require('../utils/format');
const { parseEmbedColor } = require('../utils/colors');
const { getTextChannel } = require('../utils/logChannel');
const { ephemeralPayload } = require('../utils/interaction');

async function getNextBlacklistNumber(guildId) {
  const counter = await Counter.findByIdAndUpdate(
    `blacklist_${guildId}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

async function getActiveBlacklist(guildId, userId) {
  return BlacklistLog.findOne({
    guildId,
    userId,
    active: true,
  });
}

function buildBlacklistContainer(title, body) {
  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) => td.setContent(`## ${title}`));
  container.addSeparatorComponents((sep) => sep);
  container.addTextDisplayComponents((td) => td.setContent(body));

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  return container;
}

async function sendV2ToChannel(guild, channelId, container) {
  const channel = await getTextChannel(guild, channelId);
  if (!channel) return false;

  await channel.send({
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  return true;
}

function rolesToMentionList(roleIds) {
  if (!roleIds?.length) return 'Yok';
  return roleIds.map((id) => `<@&${id}>`).join(', ');
}

async function applyBlacklistToMember(member, ids) {
  const removedRoles = [];
  const rolesToRemove = member.roles.cache
    .filter((role) => role.id !== member.guild.id && role.id !== ids.blacklistRoleId)
    .map((role) => role.id);

  removedRoles.push(...rolesToRemove);

  for (const roleId of rolesToRemove) {
    await member.roles.remove(roleId).catch(() => {});
  }

  if (ids.blacklistRoleId) {
    await member.roles.add(ids.blacklistRoleId).catch(() => {});
  }

  if (member.manageable) {
    await member.setNickname('Blacklist').catch(() => {});
  }

  return removedRoles;
}

async function applyUnblacklistToMember(member, ids) {
  if (ids.blacklistRoleId && member.roles.cache.has(ids.blacklistRoleId)) {
    await member.roles.remove(ids.blacklistRoleId).catch(() => {});
  }

  if (ids.kayitsizRoleId) {
    await member.roles.add(ids.kayitsizRoleId).catch(() => {});
  }

  if (member.manageable) {
    await member.setNickname(null).catch(() => {});
  }
}

async function sendPublicBlacklistLog(guild, data) {
  const ids = getIds();
  if (!ids.blacklistPublicChannelId) return;

  const body = formatTemplate(BLACKLIST.publicLog.desc, {
    number: data.number,
    user: data.user.toString(),
    reason: data.reason,
    staff: data.staff.toString(),
    timestamp: data.timestamp,
  });

  const container = buildBlacklistContainer(BLACKLIST.publicLog.title, body);
  await sendV2ToChannel(guild, ids.blacklistPublicChannelId, container);
}

async function sendPrivateBlacklistLog(guild, data) {
  const ids = getIds();
  if (!ids.blacklistLogChannelId) return;

  const body = formatTemplate(BLACKLIST.privateLog.desc, {
    number: data.number,
    user: data.user.toString(),
    userId: data.userId,
    reason: data.reason,
    staff: data.staff.toString(),
    staffId: data.staffId,
    roles: rolesToMentionList(data.roles),
    timestamp: data.timestamp,
  });

  const container = buildBlacklistContainer(BLACKLIST.privateLog.title, body);
  await sendV2ToChannel(guild, ids.blacklistLogChannelId, container);
}

async function sendRemovePublicLog(guild, data) {
  const ids = getIds();
  if (!ids.blacklistPublicChannelId) return;

  const body = formatTemplate(BLACKLIST.removePublicLog.desc, {
    number: data.number,
    user: data.user.toString(),
    staff: data.staff.toString(),
    timestamp: data.timestamp,
  });

  const container = buildBlacklistContainer(BLACKLIST.removePublicLog.title, body);
  await sendV2ToChannel(guild, ids.blacklistPublicChannelId, container);
}

async function addBlacklist(interaction, targetUser, reason) {
  const guild = interaction.guild;
  const staff = interaction.user;
  const ids = getIds();

  if (targetUser.bot) {
    return interaction.reply(
      ephemeralPayload({ content: BLACKLIST.messages.targetBot })
    );
  }

  const existing = await getActiveBlacklist(guild.id, targetUser.id);
  if (existing) {
    return interaction.reply(
      ephemeralPayload({
        content: formatTemplate(BLACKLIST.messages.alreadyBlacklisted, {
          user: targetUser.toString(),
          number: existing.blacklistNumber,
        }),
      })
    );
  }

  await interaction.deferReply(ephemeralPayload());

  const member = await guild.members.fetch(targetUser.id).catch(() => null);
  let removedRoles = [];

  if (member) {
    removedRoles = await applyBlacklistToMember(member, ids);
  }

  const blacklistNumber = await getNextBlacklistNumber(guild.id);
  const timestamp = Math.floor(Date.now() / 1000);

  await BlacklistLog.create({
    blacklistNumber,
    guildId: guild.id,
    userId: targetUser.id,
    userTag: targetUser.tag,
    reason,
    staffId: staff.id,
    staffTag: staff.tag,
    removedRoles,
    active: true,
  });

  try {
    await sendPublicBlacklistLog(guild, {
      number: blacklistNumber,
      user: targetUser,
      reason,
      staff,
      timestamp,
    });
    await sendPrivateBlacklistLog(guild, {
      number: blacklistNumber,
      user: targetUser,
      userId: targetUser.id,
      reason,
      staff,
      staffId: staff.id,
      roles: removedRoles,
      timestamp,
    });
  } catch (err) {
    console.error('[Blacklist] Log gönderilemedi:', err);
  }

  return interaction.editReply({
    content: formatTemplate(BLACKLIST.messages.success, {
      user: targetUser.toString(),
      number: blacklistNumber,
    }),
  });
}

async function removeBlacklist(interaction, targetUser) {
  const guild = interaction.guild;
  const staff = interaction.user;
  const ids = getIds();

  const record = await getActiveBlacklist(guild.id, targetUser.id);
  if (!record) {
    return interaction.reply(
      ephemeralPayload({ content: BLACKLIST.messages.notFound })
    );
  }

  await interaction.deferReply(ephemeralPayload());

  const member = await guild.members.fetch(targetUser.id).catch(() => null);
  if (member) {
    await applyUnblacklistToMember(member, ids);
  }

  record.active = false;
  record.removedAt = new Date();
  record.removedById = staff.id;
  record.removedByTag = staff.tag;
  await record.save();

  const timestamp = Math.floor(Date.now() / 1000);

  try {
    await sendRemovePublicLog(guild, {
      number: record.blacklistNumber,
      user: targetUser,
      staff,
      timestamp,
    });
    if (ids.blacklistLogChannelId) {
      await sendV2ToChannel(
        guild,
        ids.blacklistLogChannelId,
        buildBlacklistContainer(
          BLACKLIST.removePublicLog.title,
          formatTemplate(BLACKLIST.removePublicLog.desc, {
            number: record.blacklistNumber,
            user: targetUser.toString(),
            staff: staff.toString(),
            timestamp,
          })
        )
      );
    }
  } catch (err) {
    console.error('[Blacklist] Kaldırma logu gönderilemedi:', err);
  }

  return interaction.editReply({
    content: formatTemplate(BLACKLIST.messages.removed, {
      user: targetUser.toString(),
      number: record.blacklistNumber,
    }),
  });
}

async function showBlacklistInfo(interaction, targetUser) {
  const guild = interaction.guild;

  const active = await getActiveBlacklist(guild.id, targetUser.id);
  const record =
    active ||
    (await BlacklistLog.findOne({ guildId: guild.id, userId: targetUser.id }).sort({
      createdAt: -1,
    }));

  if (!record) {
    return interaction.editReply(
      ephemeralPayload({
        content: BLACKLIST.infoPanel.notFound,
        embeds: [],
        components: [],
      })
    );
  }

  const createdTs = Math.floor(new Date(record.createdAt).getTime() / 1000);
  let body;

  if (record.active) {
    body = formatTemplate(BLACKLIST.infoPanel.activeDesc, {
      number: record.blacklistNumber,
      user: targetUser.toString(),
      userId: targetUser.id,
      reason: record.reason,
      staff: `<@${record.staffId}> (${record.staffTag})`,
      timestamp: createdTs,
      roles: rolesToMentionList(record.removedRoles),
    });
  } else {
    const removedTs = record.removedAt
      ? Math.floor(record.removedAt.getTime() / 1000)
      : createdTs;
    body = formatTemplate(BLACKLIST.infoPanel.inactiveDesc, {
      number: record.blacklistNumber,
      user: targetUser.toString(),
      reason: record.reason,
      staff: `<@${record.staffId}> (${record.staffTag})`,
      timestamp: createdTs,
      removedBy: record.removedById
        ? `<@${record.removedById}> (${record.removedByTag || '—'})`
        : '—',
      removedAt: removedTs,
    });
  }

  const container = buildBlacklistContainer(BLACKLIST.infoPanel.title, body);

  return interaction.editReply({
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  });
}

async function handleMemberJoin(member) {
  const blacklist = await getActiveBlacklist(member.guild.id, member.user.id);
  if (!blacklist) return;

  const ids = getIds();
  await applyBlacklistToMember(member, ids);

  if (ids.blacklistLogChannelId) {
    const body = formatTemplate(BLACKLIST.autoBlacklist.desc, {
      user: member.user.toString(),
      number: blacklist.blacklistNumber,
    });
    const container = buildBlacklistContainer(BLACKLIST.autoBlacklist.title, body);
    await sendV2ToChannel(member.guild, ids.blacklistLogChannelId, container).catch(
      () => {}
    );
  }
}

module.exports = {
  addBlacklist,
  removeBlacklist,
  showBlacklistInfo,
  getActiveBlacklist,
  handleMemberJoin,
};
