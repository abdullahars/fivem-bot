const CHANGELOG = require('../constants/changelog');
const { executeChangelog } = require('../services/changelogService');
const { ephemeralPayload } = require('../utils/interaction');
const { isUstYonetim } = require('../utils/permissions');

async function execute(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply(
      ephemeralPayload({ content: CHANGELOG.messages.noPermission })
    );
  }

  return executeChangelog(interaction);
}

module.exports = { execute };
