const { isBanhammer } = require('../utils/permissions');
const BAN = require('../constants/ban');
const { banUser } = require('../services/banService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isBanhammer(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.noBanhammer }));
  }
  return banUser(interaction);
}

module.exports = { execute };
