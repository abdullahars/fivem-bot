const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { EkipTicket: createModel(MODELS.ekipTicket) };
