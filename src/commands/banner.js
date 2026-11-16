const { buildBannerReply } = require('../services/userMediaService');

async function execute(interaction) {
  const payload = await buildBannerReply(interaction);
  return interaction.reply(payload);
}

module.exports = { execute };
