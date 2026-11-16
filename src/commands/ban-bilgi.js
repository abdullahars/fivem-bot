const { isStaff } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const { showBanBilgi } = require('../services/banService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
  }

  await interaction.deferReply(ephemeralPayload());
  return showBanBilgi(interaction);
}

module.exports = { execute };
