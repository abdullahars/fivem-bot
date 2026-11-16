const { openKurulumPanel } = require('../services/kurulumService');

async function execute(interaction) {
  return openKurulumPanel(interaction);
}

module.exports = { execute };
