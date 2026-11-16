const { canManageRoles } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const COMMANDS = require('../constants/commands');
const { giveRole, removeRole } = require('../services/rolService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!canManageRoles(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
  }

  const sub = interaction.options.getSubcommand();
  if (sub === COMMANDS.rol.sub.ver.name) return giveRole(interaction);
  if (sub === COMMANDS.rol.sub.al.name) return removeRole(interaction);
}

module.exports = { execute };
