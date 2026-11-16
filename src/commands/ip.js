const { getFivemSettings, getConnectAddress } = require('../config/loadConfig');
const SS = require('../constants/serverStatus');
const { ephemeralPayload } = require('../utils/interaction');
const { formatTemplate } = require('../utils/format');

async function execute(interaction) {
  const settings = getFivemSettings();
  if (!settings.configured) {
    return interaction.reply(ephemeralPayload({ content: SS.notConfigured }));
  }

  const address = getConnectAddress();
  const content = formatTemplate(SS.ip.message, {
    server: settings.serverName,
    connect: settings.connectCommand,
    address,
  });

  return interaction.reply({ content, allowedMentions: { parse: [] } });
}

module.exports = { execute };
