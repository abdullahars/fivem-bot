const { ActionRowBuilder, RoleSelectMenuBuilder } = require('discord.js');
const { canManageRoles } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');
const MESSAGES = require('../constants/messages');

async function execute(interaction) {
  if (!canManageRoles(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
  }

  const targetUser = interaction.targetUser;
  
  const row = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`context_rol_ekle:${targetUser.id}`)
      .setPlaceholder('Eklenecek rolü seçin')
      .setMinValues(1)
      .setMaxValues(1)
  );

  return interaction.reply({
    content: `👤 **${targetUser.tag}** kullanıcısına eklenecek rolü seçin:`,
    components: [row],
    ephemeral: true,
  });
}

module.exports = { execute };
