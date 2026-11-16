const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { GuildDailyReport: createModel(MODELS.guildDailyReport) };
