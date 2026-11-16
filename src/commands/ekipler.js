const { executeEkipler } = require('../services/ekipManageService');

async function execute(interaction) {
  return executeEkipler(interaction);
}

module.exports = { execute };
