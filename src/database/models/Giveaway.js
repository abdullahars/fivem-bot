const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { Giveaway: createModel(MODELS.giveaway) };
