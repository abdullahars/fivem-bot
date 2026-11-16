const { isBotCommand } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const { bulkUnmute } = require('../services/moderationService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isBotCommand(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
  }
  return bulkUnmute(interaction);
}

module.exports = { execute };
