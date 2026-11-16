const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { RoleLog: createModel(MODELS.roleLog) };
