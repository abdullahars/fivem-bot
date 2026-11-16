const { isStaff } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const { giveWhitelist } = require('../services/whitelistService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
  }
  return giveWhitelist(interaction);
}

module.exports = { execute };
