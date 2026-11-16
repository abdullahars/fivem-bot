const { isUstYonetim } = require('../utils/permissions');
const ST = require('../constants/staffTop');
const { buildStaffTopPayload } = require('../services/staffTopService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: ST.noPermission }));
  }

  await interaction.deferReply();

  const payload = await buildStaffTopPayload(interaction.guild);
  await interaction.editReply(payload);
}

module.exports = { execute };
