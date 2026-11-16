const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed } = require('../utils/embedBuilder');
const { formatTemplate } = require('../utils/format');
const UM = require('../constants/userMedia');

async function resolveUser(interaction, optionName) {
  const picked = interaction.options.getUser(optionName);
  const id = picked?.id || interaction.user.id;
  return interaction.client.users.fetch(id, { force: true });
}

function linkRow(label, url) {
  if (!url) return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url)
    ),
  ];
}

async function buildAvatarReply(interaction) {
  const user = await resolveUser(interaction, UM.avatar.optionUser.name);
  const url = user.displayAvatarURL({ size: 4096, extension: 'png' });

  const embed = baseEmbed()
    .setTitle(formatTemplate(UM.avatar.title, { user: user.tag }))
    .setImage(url)
    .setFooter({ text: `ID: ${user.id}` });

  return {
    embeds: [embed],
    components: linkRow(UM.avatar.linkLabel, url),
  };
}

async function buildBannerReply(interaction) {
  const user = await resolveUser(interaction, UM.banner.optionUser.name);
  const url = user.bannerURL({ size: 4096 });

  if (!url) {
    return { content: UM.banner.noBanner, embeds: [], components: [] };
  }

  const embed = baseEmbed()
    .setTitle(formatTemplate(UM.banner.title, { user: user.tag }))
    .setImage(url)
    .setFooter({ text: `ID: ${user.id}` });

  return {
    embeds: [embed],
    components: linkRow(UM.banner.linkLabel, url),
  };
}

module.exports = { buildAvatarReply, buildBannerReply };
