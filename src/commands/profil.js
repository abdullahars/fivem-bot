const { executeProfil } = require('../services/performanceReportService');

async function execute(interaction) {
  return executeProfil(interaction);
}

module.exports = { execute };
