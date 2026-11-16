const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} = require('discord.js');
const { MeslekAssignment } = require('../database/models/MeslekAssignment');
const { getConfig, getIds } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const { sendLogEmbed } = require('../utils/logChannel');
const { baseEmbed } = require('../utils/embedBuilder');
const { canManageMeslek } = require('../utils/permissions');
const { listOpenEkips, getEkipById } = require('./ekipService');
const { appendEkipAction } = require('./ekipActionLogService');
const EKIP = require('../constants/ekip');
const MESLEK = require('../constants/meslek');

const OPTIONS_PER_MENU = 25;

function panelFlags() {
  return MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;
}

function patchPanel(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.update(payload);
}

async function listAll(guildId) {
  return MeslekAssignment.find({ guildId }).sort({ createdAt: -1 });
}

async function listByType(guildId, targetType) {
  return MeslekAssignment.find({ guildId, targetType }).sort({ createdAt: -1 });
}

function buildRoleToEkipMap(ekipAssignments) {
  const map = new Map();
  for (const row of ekipAssignments) {
    const name = row.ekipName || `Ekip #${row.ekipId}`;
    if (!map.has(row.roleId)) map.set(row.roleId, []);
    const names = map.get(row.roleId);
    if (!names.includes(name)) names.push(name);
  }
  return map;
}

async function findDuplicate(guildId, targetType, { ekipId, userId, roleId }) {
  const query = { guildId, targetType, roleId };
  if (targetType === MESLEK.targetType.ekip) query.ekipId = ekipId;
  else query.userId = userId;
  return MeslekAssignment.findOne(query);
}

function formatAssignmentHolder(row) {
  if (row.targetType === MESLEK.targetType.ekip) {
    return `${row.ekipName || 'Ekip'} ekibi`;
  }
  return `<@${row.userId}>`;
}

async function findRoleTakenElsewhere(guildId, roleId) {
  return MeslekAssignment.findOne({ guildId, roleId });
}

function canBotManageRole(guild, role) {
  const me = guild.members.me;
  if (!me || !role) return false;
  return (
    me.permissions.has(PermissionFlagsBits.ManageRoles) &&
    role.position < me.roles.highest.position &&
    !role.managed
  );
}

async function getEkipRoleMembers(guild, ekip) {
  if (!ekip?.roleId) return [];
  const role =
    guild.roles.cache.get(ekip.roleId) ||
    (await guild.roles.fetch(ekip.roleId).catch(() => null));
  if (!role) return [];
  return [...role.members.values()];
}

async function applyRoleToMembers(guild, members, role) {
  if (!canBotManageRole(guild, role)) return false;
  for (const member of members) {
    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role).catch(() => {});
    }
  }
  return true;
}

async function removeRoleFromMembers(guild, members, role) {
  if (!canBotManageRole(guild, role)) return false;
  for (const member of members) {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role).catch(() => {});
    }
  }
  return true;
}

function formatRoleWithConflict(roleId, roleToEkips) {
  const roleMention = `<@&${roleId}>`;
  const ekipNames = roleToEkips.get(roleId);
  if (!ekipNames?.length) return roleMention;
  return `${roleMention} ${formatTemplate(MESLEK.panel.conflictNote, {
    ekip: ekipNames.join(', '),
  })}`;
}

async function formatUnifiedListText(guild) {
  const ekipRows = await listByType(guild.id, MESLEK.targetType.ekip);
  const userRows = await listByType(guild.id, MESLEK.targetType.kullanici);

  if (!ekipRows.length && !userRows.length) return MESLEK.panel.listEmpty;

  const roleToEkips = buildRoleToEkipMap(ekipRows);
  const P = MESLEK.panel;
  const parts = [];

  const ekips = await listOpenEkips(guild.id);
  const ekipMap = new Map(ekips.map((e) => [String(e._id), e]));
  const ekipGrouped = new Map();

  for (const row of ekipRows) {
    const key = String(row.ekipId);
    if (!ekipGrouped.has(key)) {
      const ekip = ekipMap.get(key);
      ekipGrouped.set(key, {
        label: ekip?.name || row.ekipName || `Ekip #${key}`,
        roles: [],
      });
    }
    ekipGrouped.get(key).roles.push(`<@&${row.roleId}>`);
  }

  const ekipLines = [...ekipGrouped.values()].map(
    (g) => `• **${g.label}** — ${g.roles.join(', ')}`
  );
  parts.push(`${P.ekipSection}\n${ekipLines.length ? ekipLines.join('\n') : P.sectionEmpty}`);

  const userGrouped = new Map();
  for (const row of userRows) {
    const key = row.userId;
    if (!userGrouped.has(key)) userGrouped.set(key, []);
    userGrouped.get(key).push(formatRoleWithConflict(row.roleId, roleToEkips));
  }

  const userLines = [...userGrouped.entries()].map(
    ([userId, roles]) => `• <@${userId}> — ${roles.join(', ')}`
  );
  parts.push(
    `\n${P.kullaniciSection}\n${userLines.length ? userLines.join('\n') : P.sectionEmpty}`
  );

  return parts.join('\n');
}

function buildPanelPayload(listText, { notice } = {}) {
  const config = getConfig();
  const P = MESLEK.panel;

  let body = listText;
  if (notice) body += `\n\n${notice}`;

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${P.title}\n\n${body}`)
  );
  container.addSeparatorComponents((sep) => sep);

  const addBtn = new ButtonBuilder()
    .setCustomId(MESLEK.buttons.add)
    .setLabel(P.addBtn)
    .setStyle(ButtonStyle.Success);
  const removeBtn = new ButtonBuilder()
    .setCustomId(MESLEK.buttons.remove)
    .setLabel(P.removeBtn)
    .setStyle(ButtonStyle.Danger);

  container.addActionRowComponents((row) => row.addComponents(addBtn, removeBtn));

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  return {
    embeds: [],
    components: [container],
    flags: panelFlags(),
  };
}

async function buildMeslekPanel(guild, notice) {
  const listText = await formatUnifiedListText(guild);
  return buildPanelPayload(listText, { notice });
}

async function replyMeslekPanel(interaction, notice) {
  const payload = await buildMeslekPanel(interaction.guild, notice);
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

async function sendMeslekLog(guild, { action, targetLabel, role, staff }) {
  const ids = getIds();
  if (!ids.meslekLogChannelId) return;

  const L = MESLEK.log;
  const embed = baseEmbed()
    .setTitle(action === 'add' ? L.addTitle : L.removeTitle)
    .addFields(
      {
        name: L.fields.action,
        value: action === 'add' ? L.actionAdd : L.actionRemove,
        inline: true,
      },
      { name: L.fields.target, value: targetLabel, inline: true },
      { name: L.fields.meslek, value: role?.toString?.() || '—', inline: true },
      {
        name: L.fields.staff,
        value: `${staff} (\`${staff.tag}\`)`,
        inline: false,
      }
    )
    .setFooter({ text: `ID: ${staff.id}` });

  await sendLogEmbed(guild, ids.meslekLogChannelId, embed);
}

async function createAssignment(interaction, targetType, data) {
  const { ekip, userId, role } = data;
  const guild = interaction.guild;
  const staff = interaction.user;

  if (!canBotManageRole(guild, role)) {
    return { ok: false, message: MESLEK.messages.botMissingRolePerm };
  }

  const dup = await findDuplicate(guild.id, targetType, {
    ekipId: ekip?._id,
    userId,
    roleId: role.id,
  });
  if (dup) return { ok: false, message: MESLEK.messages.duplicate };

  const taken = await findRoleTakenElsewhere(guild.id, role.id);
  if (taken) {
    return {
      ok: false,
      message: formatTemplate(MESLEK.messages.roleTaken, {
        role: role.toString(),
        holder: formatAssignmentHolder(taken),
      }),
    };
  }

  if (targetType === MESLEK.targetType.ekip) {
    const members = await getEkipRoleMembers(guild, ekip);
    await applyRoleToMembers(guild, members, role);
    await MeslekAssignment.create({
      guildId: guild.id,
      targetType,
      ekipId: ekip._id,
      ekipName: ekip.name,
      roleId: role.id,
      roleName: role.name,
      assignedById: staff.id,
      assignedByTag: staff.tag,
    });
    await appendEkipAction(ekip, {
      byId: staff.id,
      byTag: staff.tag,
      text: formatTemplate(EKIP.messages.islemMeslekAdd, { role: role.toString() }),
    });
    await sendMeslekLog(guild, {
      action: 'add',
      targetLabel: `**Ekip:** ${ekip.name}`,
      role,
      staff,
    });
    return { ok: true, message: MESLEK.messages.added };
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return { ok: false, message: MESLEK.messages.userNotFound };
  await applyRoleToMembers(guild, [member], role);
  await MeslekAssignment.create({
    guildId: guild.id,
    targetType,
    userId,
    roleId: role.id,
    roleName: role.name,
    assignedById: staff.id,
    assignedByTag: staff.tag,
  });
  await sendMeslekLog(guild, {
    action: 'add',
    targetLabel: `**Kullanıcı:** ${member}`,
    role,
    staff,
  });

  return { ok: true, message: MESLEK.messages.added };
}

async function removeAssignment(interaction, assignmentId) {
  const guild = interaction.guild;
  const staff = interaction.user;
  const row = await MeslekAssignment.findById(assignmentId);
  if (!row || row.guildId !== guild.id) {
    return { ok: false, message: MESLEK.messages.assignmentNotFound };
  }

  const role = guild.roles.cache.get(row.roleId);
  if (!role) {
    await MeslekAssignment.deleteOne({ _id: row._id });
    return { ok: true, message: MESLEK.messages.removed };
  }

  if (row.targetType === MESLEK.targetType.ekip) {
    const ekip = await getEkipById(row.ekipId);
    const members = ekip ? await getEkipRoleMembers(guild, ekip) : [];
    await removeRoleFromMembers(guild, members, role);
    await MeslekAssignment.deleteOne({ _id: row._id });
    if (ekip) {
      await appendEkipAction(ekip, {
        byId: staff.id,
        byTag: staff.tag,
        text: formatTemplate(EKIP.messages.islemMeslekRemove, { role: role.toString() }),
      });
    }
    await sendMeslekLog(guild, {
      action: 'remove',
      targetLabel: `**Ekip:** ${ekip?.name || row.ekipName || '—'}`,
      role,
      staff,
    });
    return { ok: true, message: MESLEK.messages.removed };
  }

  const member = await guild.members.fetch(row.userId).catch(() => null);
  if (member) await removeRoleFromMembers(guild, [member], role);
  await MeslekAssignment.deleteOne({ _id: row._id });
  await sendMeslekLog(guild, {
    action: 'remove',
    targetLabel: `**Kullanıcı:** ${member || `<@${row.userId}>`}`,
    role,
    staff,
  });
  return { ok: true, message: MESLEK.messages.removed };
}

function buildAddTypePayload() {
  const config = getConfig();
  const opts = MESLEK.addTypeOptions;

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );
  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${MESLEK.panel.title}\n\n${MESLEK.panel.addTypeHint}`)
  );
  container.addSeparatorComponents((sep) => sep);
  container.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(MESLEK.select.addType)
        .setPlaceholder(MESLEK.panel.addTypePlaceholder)
        .addOptions([
          {
            label: opts.ekip.label,
            value: opts.ekip.value,
            description: opts.ekip.description,
          },
          {
            label: opts.kullanici.label,
            value: opts.kullanici.value,
            description: opts.kullanici.description,
          },
        ])
    )
  );

  return { embeds: [], components: [container], flags: panelFlags() };
}

function buildEkipPickPayload(ekips) {
  const config = getConfig();
  const options = ekips.slice(0, OPTIONS_PER_MENU).map((e) => ({
    label: e.name.slice(0, 100),
    value: String(e._id),
    description: `Boss: ${e.bossId || e.ownerId}`.slice(0, 100),
  }));

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );
  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${MESLEK.panel.title}\n\n${MESLEK.panel.ekipPickHint}`)
  );
  container.addSeparatorComponents((sep) => sep);
  container.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(MESLEK.select.ekipPick)
        .setPlaceholder(MESLEK.panel.ekipSelectPlaceholder)
        .addOptions(options)
    )
  );

  return { embeds: [], components: [container], flags: panelFlags() };
}

function buildRolePickPayload(targetType, targetId, hint) {
  const config = getConfig();
  const prefix =
    targetType === MESLEK.targetType.ekip
      ? MESLEK.select.ekipRolePrefix
      : MESLEK.select.kullaniciRolePrefix;

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );
  container.addTextDisplayComponents((td) => td.setContent(hint));
  container.addSeparatorComponents((sep) => sep);
  container.addActionRowComponents((row) =>
    row.addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(`${prefix}${targetId}`)
        .setPlaceholder(MESLEK.panel.roleSelectPlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
    )
  );

  return { embeds: [], components: [container], flags: panelFlags() };
}

function buildRemovePickPayload(assignments) {
  const config = getConfig();

  const options = assignments.slice(0, OPTIONS_PER_MENU).map((row) => {
    if (row.targetType === MESLEK.targetType.ekip) {
      return {
        label: `[Ekip] ${row.ekipName || 'Ekip'} — ${row.roleName}`.slice(0, 100),
        value: String(row._id),
        description: `Rol: ${row.roleName}`.slice(0, 100),
      };
    }
    return {
      label: `[Kullanıcı] ${row.roleName}`.slice(0, 100),
      value: String(row._id),
      description: `Kullanıcı: ${row.userId}`.slice(0, 100),
    };
  });

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );
  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${MESLEK.panel.removeHint}`)
  );
  container.addSeparatorComponents((sep) => sep);
  container.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(MESLEK.select.removePick)
        .setPlaceholder(MESLEK.panel.removeSelectPlaceholder)
        .addOptions(options)
    )
  );

  return { embeds: [], components: [container], flags: panelFlags() };
}

function buildKullaniciPickPayload() {
  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );
  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${MESLEK.panel.title}\n\n${MESLEK.panel.kullaniciPickHint}`)
  );
  container.addSeparatorComponents((sep) => sep);
  container.addActionRowComponents((row) =>
    row.addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(MESLEK.select.kullaniciPick)
        .setPlaceholder(MESLEK.panel.kullaniciSelectPlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
    )
  );
  return { embeds: [], components: [container], flags: panelFlags() };
}

async function executeMeslek(interaction) {
  if (!canManageMeslek(interaction.member)) {
    return replyMeslekPanel(interaction, MESLEK.messages.noPermission);
  }
  return replyMeslekPanel(interaction);
}

async function handleMeslekButton(interaction) {
  if (!canManageMeslek(interaction.member)) {
    return replyMeslekPanel(interaction, MESLEK.messages.noPermission);
  }

  const id = interaction.customId;

  if (id === MESLEK.buttons.add) {
    return patchPanel(interaction, buildAddTypePayload());
  }

  if (id === MESLEK.buttons.remove) {
    const assignments = await listAll(interaction.guild.id);
    if (!assignments.length) {
      return patchPanel(
        interaction,
        await buildMeslekPanel(interaction.guild, MESLEK.messages.noAssignments)
      );
    }
    return patchPanel(interaction, buildRemovePickPayload(assignments));
  }
}

async function handleMeslekStringSelect(interaction) {
  if (!canManageMeslek(interaction.member)) {
    return replyMeslekPanel(interaction, MESLEK.messages.noPermission);
  }

  const id = interaction.customId;
  const selected = interaction.values[0];

  if (id === MESLEK.select.addType) {
    if (selected === MESLEK.targetType.ekip) {
      const ekips = await listOpenEkips(interaction.guild.id);
      if (!ekips.length) {
        return patchPanel(
          interaction,
          await buildMeslekPanel(interaction.guild, MESLEK.messages.noEkips)
        );
      }
      return patchPanel(interaction, buildEkipPickPayload(ekips));
    }
    return patchPanel(interaction, buildKullaniciPickPayload());
  }

  if (id === MESLEK.select.ekipPick) {
    const ekip = await getEkipById(selected);
    if (!ekip || ekip.status !== 'open') {
      return patchPanel(
        interaction,
        await buildMeslekPanel(interaction.guild, MESLEK.messages.ekipNotFound)
      );
    }
    return patchPanel(
      interaction,
      buildRolePickPayload(
        MESLEK.targetType.ekip,
        selected,
        formatTemplate(MESLEK.panel.ekipRoleHint, { name: ekip.name })
      )
    );
  }

  if (id === MESLEK.select.removePick) {
    const result = await removeAssignment(interaction, selected);
    return patchPanel(
      interaction,
      await buildMeslekPanel(interaction.guild, result.message)
    );
  }
}

async function handleMeslekUserSelect(interaction) {
  if (!canManageMeslek(interaction.member)) {
    return replyMeslekPanel(interaction, MESLEK.messages.noPermission);
  }

  if (interaction.customId !== MESLEK.select.kullaniciPick) return;

  const userId = interaction.values[0];
  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return patchPanel(
      interaction,
      await buildMeslekPanel(interaction.guild, MESLEK.messages.userNotFound)
    );
  }

  return patchPanel(
    interaction,
    buildRolePickPayload(
      MESLEK.targetType.kullanici,
      userId,
      formatTemplate(MESLEK.panel.kullaniciRoleHint, { user: member.toString() })
    )
  );
}

async function handleMeslekRoleSelect(interaction) {
  if (!canManageMeslek(interaction.member)) {
    return replyMeslekPanel(interaction, MESLEK.messages.noPermission);
  }

  const customId = interaction.customId;
  const roleId = interaction.values[0];
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return patchPanel(
      interaction,
      await buildMeslekPanel(interaction.guild, MESLEK.messages.roleNotFound)
    );
  }

  if (customId.startsWith(MESLEK.select.ekipRolePrefix)) {
    const ekipId = customId.slice(MESLEK.select.ekipRolePrefix.length);
    const ekip = await getEkipById(ekipId);
    if (!ekip || ekip.status !== 'open') {
      return patchPanel(
        interaction,
        await buildMeslekPanel(interaction.guild, MESLEK.messages.ekipNotFound)
      );
    }
    const result = await createAssignment(interaction, MESLEK.targetType.ekip, {
      ekip,
      role,
    });
    return patchPanel(
      interaction,
      await buildMeslekPanel(interaction.guild, result.message)
    );
  }

  if (customId.startsWith(MESLEK.select.kullaniciRolePrefix)) {
    const userId = customId.slice(MESLEK.select.kullaniciRolePrefix.length);
    const result = await createAssignment(interaction, MESLEK.targetType.kullanici, {
      userId,
      role,
    });
    return patchPanel(
      interaction,
      await buildMeslekPanel(interaction.guild, result.message)
    );
  }
}

async function getMeslekRowsForEkip(guildId, ekipId) {
  return MeslekAssignment.find({
    guildId,
    targetType: MESLEK.targetType.ekip,
    ekipId,
  });
}

/** Tüm ekip mesleklerini tek sorguda — /ekip bilgi için */
async function buildMeslekMapByEkipId(guildId) {
  const rows = await MeslekAssignment.find({
    guildId,
    targetType: MESLEK.targetType.ekip,
  });
  const map = new Map();
  for (const row of rows) {
    const key = String(row.ekipId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(`<@&${row.roleId}>`);
  }
  return map;
}

async function formatMeslekFieldForEkip(guildId, ekipId) {
  const rows = await getMeslekRowsForEkip(guildId, ekipId);
  if (!rows.length) return '—';
  return rows.map((r) => `<@&${r.roleId}>`).join(', ');
}

async function formatMeslekNamesForEkip(guild, ekipId) {
  const rows = await getMeslekRowsForEkip(guild.id, ekipId);
  if (!rows.length) return '—';
  return rows
    .map((r) => {
      const role = guild.roles.cache.get(r.roleId);
      return role?.name || r.roleName || '—';
    })
    .join(', ');
}

async function applyMeslekRolesToMember(guild, ekipId, member) {
  const rows = await MeslekAssignment.find({
    guildId: guild.id,
    targetType: MESLEK.targetType.ekip,
    ekipId,
  });
  for (const row of rows) {
    const role = guild.roles.cache.get(row.roleId);
    if (role && canBotManageRole(guild, role) && !member.roles.cache.has(role.id)) {
      await member.roles.add(role).catch(() => {});
    }
  }
}

async function removeMeslekRolesFromMember(guild, ekipId, member) {
  const rows = await MeslekAssignment.find({
    guildId: guild.id,
    targetType: MESLEK.targetType.ekip,
    ekipId,
  });
  for (const row of rows) {
    const role = guild.roles.cache.get(row.roleId);
    if (role && member.roles.cache.has(role.id)) {
      await member.roles.remove(role).catch(() => {});
    }
  }
}

async function clearMeslekForEkip(guildId, ekipId) {
  const rows = await MeslekAssignment.find({
    guildId,
    targetType: MESLEK.targetType.ekip,
    ekipId,
  });
  for (const row of rows) {
    await MeslekAssignment.deleteOne({ _id: row._id });
  }
}

module.exports = {
  executeMeslek,
  handleMeslekButton,
  handleMeslekStringSelect,
  handleMeslekUserSelect,
  handleMeslekRoleSelect,
  formatMeslekFieldForEkip,
  formatMeslekNamesForEkip,
  buildMeslekMapByEkipId,
  applyMeslekRolesToMember,
  removeMeslekRolesFromMember,
  clearMeslekForEkip,
};
