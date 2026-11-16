const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

const Mazaret = createModel(MODELS.mazaret);

module.exports = { Mazaret };
