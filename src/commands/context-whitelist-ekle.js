const { isStaff } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');
const MESSAGES = require('../constants/messages');
const { giveWhitelist } = require('../services/whitelistService');

async function execute(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
  }

  const targetUser = interaction.targetUser;
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (!targetMember) {
    return interaction.reply(ephemeralPayload({ content: '❌ Kullanıcı bulunamadı.' }));
  }

  return giveWhitelist(interaction, targetMember);
}

module.exports = { execute };
