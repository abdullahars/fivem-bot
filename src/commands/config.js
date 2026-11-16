const { openConfigPanel } = require('../services/configPanelService');

async function execute(interaction) {
  return openConfigPanel(interaction);
}

module.exports = { execute };
