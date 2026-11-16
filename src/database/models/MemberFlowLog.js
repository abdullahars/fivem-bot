const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { MemberFlowLog: createModel(MODELS.memberFlowLog) };
