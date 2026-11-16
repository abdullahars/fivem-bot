const { isBotCommand } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const { buildTopStatEmbed } = require('../services/topStatService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isBotCommand(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
  }

  await interaction.deferReply(ephemeralPayload());

  const payload = await buildTopStatEmbed(interaction.guild);
  await interaction.editReply(payload);
}

module.exports = { execute };
