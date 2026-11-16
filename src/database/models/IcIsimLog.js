const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { IcIsimLog: createModel(MODELS.icIsimLog) };
