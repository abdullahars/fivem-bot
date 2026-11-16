const EKIP = require('../constants/ekip');
const {
  executeOlustur,
  executeKapat,
} = require('../services/ekipManageService');

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  switch (sub) {
    case EKIP.slash.sub.olustur.name:
      return executeOlustur(interaction);
    case EKIP.slash.sub.kapat.name:
      return executeKapat(interaction);
    default:
      return;
  }
}

module.exports = { execute };
