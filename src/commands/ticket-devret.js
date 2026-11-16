const { isStaff } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const TC = require('../constants/ticketCommands');
const { ephemeralPayload } = require('../utils/interaction');
const { isTicketCategoryChannel } = require('../utils/ticketCategory');
const { transferTicketByCommand } = require('../services/ticketService');

async function execute(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
  }

  if (!isTicketCategoryChannel(interaction.channel)) {
    return interaction.reply(ephemeralPayload({ content: TC.notTicketCategory }));
  }

  const staffUser = interaction.options.getUser(TC.devret.optionStaff.name, true);
  return transferTicketByCommand(interaction, staffUser.id);
}

module.exports = { execute };
