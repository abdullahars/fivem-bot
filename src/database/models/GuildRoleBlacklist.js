const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = { GuildRoleBlacklist: createModel(MODELS.guildRoleBlacklist) };
