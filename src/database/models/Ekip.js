const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { Ekip: createModel(MODELS.ekip) };
