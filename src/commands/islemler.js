const { isBotCommand } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const COMMANDS = require('../constants/commands');
const { ephemeralPayload } = require('../utils/interaction');
const { buildIslemlerPayload } = require('../services/islemlerService');

async function execute(interaction) {
  if (!isBotCommand(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
  }

  const targetUser = interaction.options.getUser(COMMANDS.islemler.optionUser.name, true);

  await interaction.deferReply(ephemeralPayload());

  const payload = await buildIslemlerPayload(interaction.guild, targetUser, 0);
  return interaction.editReply(payload);
}

module.exports = { execute };
