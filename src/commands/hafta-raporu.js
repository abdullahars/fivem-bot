const { executeWeekReport } = require('../services/performanceReportService');

async function execute(interaction) {
  return executeWeekReport(interaction);
}

module.exports = { execute };
