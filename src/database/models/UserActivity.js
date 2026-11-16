const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { UserActivity: createModel(MODELS.userActivity) };
