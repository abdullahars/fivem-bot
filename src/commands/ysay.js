const { isBotCommand } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const { buildYsayMessage, sendDmsToAbsent } = require('../services/ysayService');
const YSAY = require('../constants/ysay');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isBotCommand(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
  }

  await interaction.deferReply(ephemeralPayload());

  const result = await buildYsayMessage(interaction.guild);

  if (result.error) {
    return interaction.editReply(ephemeralPayload({ content: result.error }));
  }

  if (result.empty) {
    return interaction.editReply(ephemeralPayload({ content: result.text }));
  }

  await interaction.channel.send({
    content: result.text,
    allowedMentions: result.allowedMentions,
  });

  const { dmSent, dmFail } = await sendDmsToAbsent(
    result.absent,
    interaction.guild.name
  );

  return interaction.editReply(
    ephemeralPayload({
      content: formatTemplate(YSAY.sent, {
        count: String(result.count),
        dmSent: String(dmSent),
        dmFail: String(dmFail),
      }),
    })
  );
}

module.exports = { execute };
