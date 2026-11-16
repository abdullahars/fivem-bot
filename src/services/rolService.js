const { RoleManageLog } = require('../database/models/RoleManageLog');
const { getIds } = require('../config/loadConfig');
const ROL = require('../constants/rol');
const { formatTemplate } = require('../utils/format');
const { baseEmbed } = require('../utils/embedBuilder');
const { sendLogEmbed } = require('../utils/logChannel');
const { ephemeralPayload } = require('../utils/interaction');
const { getRoleBlockedMessage } = require('./blRolService');

function canManageRoleHierarchy(guild, role) {
  const me = guild.members.me;
  if (!me?.permissions.has('ManageRoles')) return ROL.messages.botCantManage;
  if (role.position >= me.roles.highest.position) return ROL.messages.botCantManage;
  if (role.managed) return ROL.messages.botCantManage;
  return null;
}

async function canManageRole(guild, role, actorMember) {
  const hierarchyErr = canManageRoleHierarchy(guild, role);
  if (hierarchyErr) return hierarchyErr;
  return getRoleBlockedMessage(guild.id, role, actorMember);
}

async function saveAndLog(guild, action, staff, target, role) {
  await RoleManageLog.create({
    guildId: guild.id,
    action,
    staffId: staff.id,
    staffTag: staff.tag,
    targetId: target.id,
    targetTag: target.tag,
    roleId: role.id,
    roleName: role.name,
  });

  const ids = getIds();
  const title = action === 'ver' ? ROL.log.verTitle : ROL.log.alTitle;
  const embed = baseEmbed()
    .setTitle(title)
    .setDescription(
      formatTemplate(ROL.log.desc, {
        staff: staff.toString(),
        target: target.toString(),
        role: role.toString(),
      })
    )
    .setTimestamp();

  await sendLogEmbed(guild, ids.roleLogChannelId, embed);
}

async function giveRole(interaction) {
  const targetUser = interaction.options.getUser(ROL.options.user.name, true);
  const role = interaction.options.getRole(ROL.options.role.name, true);

  if (targetUser.bot) {
    return interaction.reply(ephemeralPayload({ content: ROL.messages.targetBot }));
  }

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.reply(ephemeralPayload({ content: '❌ Kullanıcı sunucuda bulunamadı.' }));
  }

  const err = await canManageRole(interaction.guild, role, interaction.member);
  if (err) return interaction.reply(ephemeralPayload({ content: err }));

  if (member.roles.cache.has(role.id)) {
    return interaction.reply(
      ephemeralPayload({
        content: formatTemplate(ROL.messages.alreadyHas, {
          target: targetUser.toString(),
          role: role.name,
        }),
      })
    );
  }

  await member.roles.add(role, `Rol ver — ${interaction.user.tag}`);
  await saveAndLog(interaction.guild, 'ver', interaction.user, targetUser, role);

  return interaction.reply(
    ephemeralPayload({
      content: formatTemplate(ROL.messages.verSuccess, {
        target: targetUser.toString(),
        role: role.name,
      }),
    })
  );
}

async function removeRole(interaction) {
  const targetUser = interaction.options.getUser(ROL.options.user.name, true);
  const role = interaction.options.getRole(ROL.options.role.name, true);

  if (targetUser.bot) {
    return interaction.reply(ephemeralPayload({ content: ROL.messages.targetBot }));
  }

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.reply(ephemeralPayload({ content: '❌ Kullanıcı sunucuda bulunamadı.' }));
  }

  const err = await canManageRole(interaction.guild, role, interaction.member);
  if (err) return interaction.reply(ephemeralPayload({ content: err }));

  if (!member.roles.cache.has(role.id)) {
    return interaction.reply(
      ephemeralPayload({
        content: formatTemplate(ROL.messages.doesntHave, {
          target: targetUser.toString(),
          role: role.name,
        }),
      })
    );
  }

  await member.roles.remove(role, `Rol al — ${interaction.user.tag}`);
  await saveAndLog(interaction.guild, 'al', interaction.user, targetUser, role);

  return interaction.reply(
    ephemeralPayload({
      content: formatTemplate(ROL.messages.alSuccess, {
        target: targetUser.toString(),
        role: role.name,
      }),
    })
  );
}

module.exports = { giveRole, removeRole };
