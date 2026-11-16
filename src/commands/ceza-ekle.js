const { addPenalty } = require('../services/cezaService');

async function execute(interaction) {
  return addPenalty(interaction);
}

module.exports = { execute };
