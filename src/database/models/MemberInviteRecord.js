const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { MemberInviteRecord: createModel(MODELS.memberInviteRecord) };
