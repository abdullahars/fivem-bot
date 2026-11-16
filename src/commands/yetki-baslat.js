const { handleYetkiBaslatCommand } = require('../services/yetkiBaslatService');

async function execute(interaction) {
  return handleYetkiBaslatCommand(interaction);
}

module.exports = { execute };
