const { isUstYonetim } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');
const ROLSUZ = require('../constants/rolsuz');
const COMMANDS = require('../constants/commands');
const { rolsuzVer } = require('../services/rolsuzService');

async function execute(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: ROLSUZ.messages.noPermission }));
  }

  const sub = interaction.options.getSubcommand();
  if (sub === COMMANDS.rolsuz.sub.ver.name) {
    return rolsuzVer(interaction);
  }
}

module.exports = { execute };
