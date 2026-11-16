const { isStaff } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');
const { baseEmbed } = require('../utils/embedBuilder');
const { buildSicilText } = require('../services/cezaService');
const { formatTemplate } = require('../utils/format');
const { getConfig } = require('../config/loadConfig');
const CEZA = require('../constants/ceza');
const COMMANDS = require('../constants/commands');

async function showSicil(interaction, targetUser) {
  await interaction.deferReply(ephemeralPayload());

  const sicilText = await buildSicilText(interaction.guild.id, targetUser.id);

  const config = getConfig();
  const embed = baseEmbed()
    .setTitle(formatTemplate(CEZA.sicil.title, { user: targetUser.tag }))
    .setDescription(sicilText)
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
    .setTimestamp();

  if (config.bot.footer?.trim()) {
    embed.setFooter({ text: config.bot.footer });
  }

  return interaction.editReply({ embeds: [embed] });
}

async function execute(interaction) {
  const targetUser = interaction.options.getUser(
    COMMANDS.sicil.optionUser.name,
    true
  );

  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: CEZA.messages.noPermission }));
  }

  return showSicil(interaction, targetUser);
}

module.exports = { execute };
