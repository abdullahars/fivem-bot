const KILIT = require('../constants/kilit');
const { executeKilit } = require('../services/kilitService');
const { ephemeralPayload } = require('../utils/interaction');
const { isUstYonetim } = require('../utils/permissions');

async function execute(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: KILIT.messages.noPermission }));
  }

  return executeKilit(interaction);
}

module.exports = { execute };
