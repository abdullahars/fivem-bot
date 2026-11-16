const { submitMazaretSlash } = require('../services/mazaretService');

async function execute(interaction) {
  return submitMazaretSlash(interaction);
}

module.exports = { execute };
