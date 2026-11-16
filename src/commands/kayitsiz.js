const { isBotCommand } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const { assignKayitsiz } = require('../services/whitelistService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isBotCommand(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
  }
  return assignKayitsiz(interaction);
}

module.exports = { execute };
