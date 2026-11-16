const { canManageRoles } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');
const MESSAGES = require('../constants/messages');
const { getRoleBlockedMessage } = require('../services/blRolService');
const { topluRolVer, topluRolAl } = require('../services/topluRolService');

async function execute(interaction) {
  if (!canManageRoles(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
  }

  const subcommand = interaction.options.getSubcommand();
  const role = interaction.options.getRole('rol', true);

  const blockedMsg = await getRoleBlockedMessage(
    interaction.guild.id,
    role,
    interaction.member,
    { exemptUstYonetim: false }
  );
  if (blockedMsg) {
    return interaction.reply(ephemeralPayload({ content: blockedMsg }));
  }

  if (subcommand === 'ver') {
    return topluRolVer(interaction, role);
  }

  if (subcommand === 'al') {
    return topluRolAl(interaction, role);
  }
}

module.exports = { execute };
