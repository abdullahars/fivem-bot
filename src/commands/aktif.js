const { isUstYonetim } = require('../utils/permissions');
const SS = require('../constants/serverStatus');
const { buildAktifPayload } = require('../services/serverStatusService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: SS.noPermission }));
  }

  await interaction.deferReply();

  const payload = await buildAktifPayload();
  if (payload.error) {
    return interaction.editReply(ephemeralPayload({ content: payload.error }));
  }

  await interaction.editReply(payload);
}

module.exports = { execute };
