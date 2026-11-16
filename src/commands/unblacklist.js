const BLACKLIST = require('../constants/blacklist');
const BAN = require('../constants/ban');
const { removeBlacklist } = require('../services/blacklistService');
const { isBanhammer } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isBanhammer(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.noBanhammer }));
  }

  const targetUser = interaction.options.getUser(BLACKLIST.options.user.name, true);
  return removeBlacklist(interaction, targetUser);
}

module.exports = { execute };
