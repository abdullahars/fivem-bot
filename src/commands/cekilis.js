const CEK = require('../constants/cekilis');
const { executeCekilis } = require('../services/cekilisService');
const { ephemeralPayload } = require('../utils/interaction');
const { isUstYonetim } = require('../utils/permissions');

async function execute(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: CEK.messages.noPermission }));
  }

  return executeCekilis(interaction);
}

module.exports = { execute };
