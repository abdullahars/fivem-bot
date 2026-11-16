const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { MulakatQueue: createModel(MODELS.mulakatQueue) };
