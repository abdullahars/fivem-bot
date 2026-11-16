const { getConfig } = require('../config/loadConfig');
const { getTicketTypes } = require('../constants');

function getTicketCategoryIds() {
  const { ids } = getConfig();
  const set = new Set();

  if (ids.categories?.parent) set.add(ids.categories.parent);
  for (const type of getTicketTypes()) {
    if (type.categoryId) set.add(type.categoryId);
  }

  return set;
}

function isTicketCategoryChannel(channel) {
  if (!channel?.parentId) return false;
  return getTicketCategoryIds().has(channel.parentId);
}

module.exports = { getTicketCategoryIds, isTicketCategoryChannel };
