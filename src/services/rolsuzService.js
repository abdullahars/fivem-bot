const { PermissionFlagsBits } = require('discord.js');
const { getIds } = require('../config/loadConfig');
const { ephemeralPayload } = require('../utils/interaction');
const ROLSUZ = require('../constants/rolsuz');
const { formatTemplate } = require('../utils/format');

function isPlaceholderRole(id) {
  return !id || String(id).includes('ROL_ID') || String(id).includes('_ID');
}

function isEligible(member, kayitsizRoleId, whitelistRoleId) {
  if (member.user.bot) return false;
  if (member.roles.cache.has(kayitsizRoleId)) return false;
  if (member.roles.cache.has(whitelistRoleId)) return false;
  return true;
}

async function rolsuzVer(interaction) {
  await interaction.deferReply(ephemeralPayload());

  const ids = getIds();
  const kayitsizRoleId = ids.kayitsizRoleId;
  const whitelistRoleId = ids.whitelistRoleId;

  if (isPlaceholderRole(kayitsizRoleId) || isPlaceholderRole(whitelistRoleId)) {
    return interaction.editReply({ content: ROLSUZ.messages.roleNotConfigured });
  }

  const guild = interaction.guild;
  const me = guild.members.me;

  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.editReply({ content: ROLSUZ.messages.botCantManage });
  }

  const kayitsizRole = guild.roles.cache.get(kayitsizRoleId);
  if (!kayitsizRole) {
    return interaction.editReply({ content: ROLSUZ.messages.roleNotConfigured });
  }

  if (kayitsizRole.position >= me.roles.highest.position) {
    return interaction.editReply({ content: ROLSUZ.messages.botCantManage });
  }

  await interaction.editReply({ content: ROLSUZ.messages.scanning });

  try {
    await guild.members.fetch();
  } catch (err) {
    console.warn('[Rolsüz] Üye listesi tam yüklenemedi:', err.message);
  }

  let success = 0;
  let skipped = 0;
  let failed = 0;
  const total = guild.members.cache.size;
  const reason = `Rolsüz ver — ${interaction.user.tag}`;

  for (const member of guild.members.cache.values()) {
    if (!isEligible(member, kayitsizRoleId, whitelistRoleId)) {
      if (!member.user.bot) skipped += 1;
      continue;
    }

    try {
      await member.roles.add(kayitsizRoleId, reason);
      success += 1;
    } catch (err) {
      failed += 1;
      console.warn(`[Rolsüz] Rol verilemedi ${member.id}:`, err.message);
    }
  }

  if (success === 0 && failed === 0) {
    return interaction.editReply({ content: ROLSUZ.messages.noEligible });
  }

  return interaction.editReply({
    content: formatTemplate(ROLSUZ.messages.done, {
      success,
      skipped,
      failed,
      total,
    }),
  });
}

module.exports = { rolsuzVer };
