const { canViewHelp } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');
const HELP = require('../constants/help');
const { buildHelpPayload } = require('../services/helpService');

async function execute(interaction) {
  if (!canViewHelp(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: HELP.noPermission }));
  }

  const payload = buildHelpPayload('genel', interaction.guild);
  return interaction.reply(ephemeralPayload(payload));
}

module.exports = { execute };
