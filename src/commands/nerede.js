const { isStaff } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');
const { buildNeredePayload } = require('../services/neredeService');
const COMMANDS = require('../constants/commands');
const NEREDE = require('../constants/nerede');

async function execute(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: NEREDE.noPermission }));
  }

  const targetUser = interaction.options.getUser(COMMANDS.nerede.optionUser.name, true);
  const payload = await buildNeredePayload(interaction.guild, targetUser);

  if (!payload) {
    return interaction.reply(
      ephemeralPayload({ content: '❌ Kullanıcı sunucuda bulunamadı.' })
    );
  }

  return interaction.reply(payload);
}

module.exports = { execute };
