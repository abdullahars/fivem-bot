const OYL = require('../constants/oylama');
const { executeOylama } = require('../services/oylamaService');
const { ephemeralPayload } = require('../utils/interaction');
const { canCreateOylama } = require('../utils/permissions');

async function execute(interaction) {
  if (!canCreateOylama(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: OYL.messages.noPermission }));
  }

  return executeOylama(interaction);
}

module.exports = { execute };
