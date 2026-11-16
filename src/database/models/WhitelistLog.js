const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { WhitelistLog: createModel(MODELS.whitelistLog) };
