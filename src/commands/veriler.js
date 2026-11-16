const { openVerilerPanel } = require('../services/verilerPanelService');

async function execute(interaction) {
  return openVerilerPanel(interaction);
}

module.exports = { execute };
