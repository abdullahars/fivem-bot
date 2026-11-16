const { isUstYonetim } = require('../utils/permissions');
const SS = require('../constants/serverStatus');
const { buildRestartPayload } = require('../services/serverStatusService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: SS.noPermission }));
  }

  const saat = interaction.options.getString(SS.options.saat.name, true);

  const payload = buildRestartPayload(saat);
  if (payload.error) {
    return interaction.reply(ephemeralPayload({ content: payload.error }));
  }

  await interaction.reply(payload);
}

module.exports = { execute };
