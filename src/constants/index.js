const { getConfig } = require('../config/loadConfig');
const PANEL = require('./panel');
const MESSAGES = require('./messages');
const TICKET = require('./ticket');
const STAT = require('./stat');
const TRANSCRIPT = require('./transcript');
const COMMANDS = require('./commands');

/** Config'deki kategori ID'lerini ticket tipleriyle birleştirir */
function getTicketTypes() {
  const { ids } = getConfig();
  return PANEL.ticketTypes.map((type) => ({
    ...type,
    categoryId: ids.categories[type.id] || ids.categories.parent,
  }));
}

function getTicketType(typeId) {
  const id = typeId === 'bug' ? 'ac' : typeId;
  return getTicketTypes().find((t) => t.id === id) || null;
}

module.exports = {
  PANEL,
  MESSAGES,
  TICKET,
  STAT,
  TRANSCRIPT,
  COMMANDS,
  getTicketTypes,
  getTicketType,
};
