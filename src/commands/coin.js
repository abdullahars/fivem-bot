const { openCoinBalance } = require('../services/coinPanelService');

async function execute(interaction) {
  return openCoinBalance(interaction);
}

module.exports = { execute };
