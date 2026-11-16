const BLACKLIST = require('../constants/blacklist');
const MESSAGES = require('../constants/messages');
const { showBlacklistInfo } = require('../services/blacklistService');
const { isStaff } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
  }

  const targetUser = interaction.options.getUser(BLACKLIST.options.user.name, true);
  await interaction.deferReply(ephemeralPayload());
  return showBlacklistInfo(interaction, targetUser);
}

module.exports = { execute };
