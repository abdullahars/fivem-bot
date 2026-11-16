const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

const WeeklyPerformance = createModel(MODELS.weeklyPerformance);

module.exports = { WeeklyPerformance };
