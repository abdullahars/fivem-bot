const { buildAvatarReply } = require('../services/userMediaService');

async function execute(interaction) {
  const payload = await buildAvatarReply(interaction);
  return interaction.reply(payload);
}

module.exports = { execute };
