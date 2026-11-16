const SIL = require('../constants/sil');
const { executeSil } = require('../services/silService');
const { ephemeralPayload } = require('../utils/interaction');
const { canSilMessages } = require('../utils/permissions');

async function execute(interaction) {
  if (!canSilMessages(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: SIL.messages.noPermission }));
  }

  return executeSil(interaction);
}

module.exports = { execute };
