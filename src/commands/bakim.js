const { isUstYonetim } = require('../utils/permissions');
const SS = require('../constants/serverStatus');
const { buildBakimPayload } = require('../services/serverStatusService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: SS.noPermission }));
  }

  const sebep = interaction.options.getString(SS.options.sebep.name, true);
  const acilis = interaction.options.getString(SS.options.acilis.name, true);

  const payload = buildBakimPayload(sebep, acilis);
  if (payload.error) {
    return interaction.reply(ephemeralPayload({ content: payload.error }));
  }

  await interaction.reply(payload);
}

module.exports = { execute };
