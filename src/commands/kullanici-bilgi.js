const { isStaff } = require('../utils/permissions');
const MESSAGES = require('../constants/messages');
const KB = require('../constants/kullaniciBilgi');
const {
  resolveTargetId,
  buildKullaniciBilgiPayload,
} = require('../services/kullaniciBilgiService');
const { ephemeralPayload } = require('../utils/interaction');

async function execute(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
  }

  const targetId = resolveTargetId(interaction);
  if (!targetId) {
    return interaction.reply(ephemeralPayload({ content: KB.noTarget }));
  }

  await interaction.deferReply(ephemeralPayload());

  const payload = await buildKullaniciBilgiPayload(interaction.guild, targetId);
  if (!payload) {
    return interaction.editReply({ content: KB.notFound });
  }

  await interaction.editReply(payload);
}

module.exports = { execute };
