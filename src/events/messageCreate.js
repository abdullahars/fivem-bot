const { Events } = require('discord.js');
const { handleIcNameRequest } = require('../services/icIsimService');

function registerMessageCreate(client) {
  client.on(Events.MessageCreate, (message) => {
    handleIcNameRequest(message).catch((err) => {
      console.error('[IC İsim]', err.message || err);
    });
  });
}

module.exports = { registerMessageCreate };
