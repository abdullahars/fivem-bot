const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

const RankSuggestionLog = createModel(MODELS.rankSuggestionLog);

module.exports = { RankSuggestionLog };
