const { openCoinShop } = require('../services/coinPanelService');

async function execute(interaction) {
  return openCoinShop(interaction);
}

module.exports = { execute };
