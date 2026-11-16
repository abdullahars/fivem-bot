const STREAMER = require('../constants/streamer');
const { executeStreamer } = require('../services/streamerService');
const { ephemeralPayload } = require('../utils/interaction');
const { isStreamer } = require('../utils/permissions');

async function execute(interaction) {
  if (!isStreamer(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: STREAMER.messages.noPermission }));
  }

  return executeStreamer(interaction);
}

module.exports = { execute };
