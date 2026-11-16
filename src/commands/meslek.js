const MESLEK = require('../constants/meslek');
const { executeMeslek } = require('../services/meslekService');

async function execute(interaction) {
  return executeMeslek(interaction);
}

module.exports = { execute };
