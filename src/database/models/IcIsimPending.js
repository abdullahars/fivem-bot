const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { IcIsimPending: createModel(MODELS.icIsimPending) };
