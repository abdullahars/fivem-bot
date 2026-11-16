const { isStaff } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const { buildStatPanel } = require('../services/statPanelService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
  }

  const targetUser = interaction.options.getUser('kullanici') || interaction.user;

  await interaction.deferReply(ephemeralPayload());

  const payload = await buildStatPanel(interaction.guild, targetUser, 'ozet');
  await interaction.editReply(payload);
}

module.exports = { execute };
