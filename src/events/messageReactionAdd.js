const { Events } = require('discord.js');
const { processReaction } = require('../services/icIsimService');

function registerMessageReactionAdd(client) {
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    processReaction(reaction, user).catch((err) => {
      console.error('[IC İsim Reaction]', err.message || err);
    });
  });
}

module.exports = { registerMessageReactionAdd };
