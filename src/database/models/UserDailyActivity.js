const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { UserDailyActivity: createModel(MODELS.userDailyActivity) };
