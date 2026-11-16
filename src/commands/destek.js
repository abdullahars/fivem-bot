const { isStaff } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const { createSupport } = require('../services/destekService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
  }
  return createSupport(interaction);
}

module.exports = { execute };
