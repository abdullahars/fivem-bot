const MESSAGES = require('../constants/messages');
const { executeSay } = require('../services/sayService');
const { ephemeralPayload } = require('../utils/interaction');
const { isBotCommand } = require('../utils/permissions');

async function execute(interaction) {
  if (!isBotCommand(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
  }

  return executeSay(interaction);
}

module.exports = { execute };
