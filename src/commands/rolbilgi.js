const { isBotCommand } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const COMMANDS = require('../constants/commands');
const { sendRolbilgiPanel } = require('../services/rolbilgiService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isBotCommand(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
  }

  const role = interaction.options.getRole(COMMANDS.rolbilgi.optionRole.name, true);
  return sendRolbilgiPanel(interaction, role);
}

module.exports = { execute };
