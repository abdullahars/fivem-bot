const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { BlacklistLog: createModel(MODELS.blacklistLog) };
