const { Events } = require('discord.js');
const { incrementMessage } = require('../services/userActivityService');
const {
  logMessageDelete,
  logMessageEdit,
} = require('../services/loggingService');
const { handleIcNameRequest } = require('../services/icIsimService');

function registerLoggingEvents(client) {
  client.on(Events.MessageCreate, (message) => {
    if (message.guild && !message.author?.bot) {
      incrementMessage(message.guild.id, message.author.id, message.channel.id).catch(() => {});
    }
    handleIcNameRequest(message).catch((err) => {
      console.error('[IC İsim]', err.message || err);
    });
  });

  client.on(Events.MessageDelete, (message) => {
    logMessageDelete(message).catch((err) => {
      console.error('[MsgLog Delete]', err.message || err);
    });
  });

  client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
    logMessageEdit(oldMessage, newMessage).catch((err) => {
      console.error('[MsgLog Edit]', err.message || err);
    });
  });
}

module.exports = { registerLoggingEvents };
