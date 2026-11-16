const { openBlRolPanel } = require('../services/blRolPanelService');

async function execute(interaction) {
  return openBlRolPanel(interaction);
}

module.exports = { execute };
