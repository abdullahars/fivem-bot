const { executeLeaderboard } = require('../services/performanceReportService');

async function execute(interaction) {
  return executeLeaderboard(interaction);
}

module.exports = { execute };
