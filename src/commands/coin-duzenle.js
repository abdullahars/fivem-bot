const { openCoinManagePanel } = require('../services/coinManageService');

async function execute(interaction) {
  return openCoinManagePanel(interaction);
}

module.exports = { execute };
