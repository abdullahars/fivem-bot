const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
} = require('discord.js');
const { getIds, getConfig, getMulakatSettings } = require('../config/loadConfig');
const { baseEmbed } = require('../utils/embedBuilder');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');
const { parseEmbedColor } = require('../utils/colors');
const MULAKAT = require('../constants/mulakat');

// Kullanıcı bazlı cooldown takibi
const userCooldowns = new Map();

function buildPanelPayload() {
  const config = getConfig();
  const imageUrl = getMulakatSettings().imageUrl || config.panel?.imageUrl;

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${MULAKAT.panel.title}\n${MULAKAT.panel.description}`)
  );

  if (imageUrl) {
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) =>
        item.setURL(imageUrl).setDescription(MULAKAT.panel.title)
      )
    );
  }

  container.addSeparatorComponents((sep) => sep);

  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((td) =>
        td.setContent('Yetkilileri çağırmak için aşağıdaki butona tıklayın.')
      )
      .setButtonAccessory((button) =>
        button
          .setCustomId(MULAKAT.buttons.call)
          .setLabel(MULAKAT.panel.callLabel)
          .setStyle(ButtonStyle.Primary)
      )
  );

  if (config.bot?.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

async function handleCall(interaction) {
  const cooldownMinutes = getMulakatSettings().callCooldownMinutes;
  const cooldownMs = cooldownMinutes * 60 * 1000;

  const userId = interaction.user.id;
  const lastCall = userCooldowns.get(userId);

  if (lastCall && Date.now() - lastCall < cooldownMs) {
    const remainingMs = cooldownMs - (Date.now() - lastCall);
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return interaction.reply(
      ephemeralPayload({ 
        content: `⏳ Lütfen ${remainingMinutes} dakika bekleyip tekrar deneyin.` 
      })
    );
  }

  const notifyChannelId = getMulakatSettings().notifyChannelId;
  if (!notifyChannelId) {
    return interaction.reply(
      ephemeralPayload({ content: MULAKAT.messages.noNotifyChannel })
    );
  }

  const notifyChannel =
    interaction.guild.channels.cache.get(notifyChannelId) ||
    (await interaction.guild.channels.fetch(notifyChannelId).catch(() => null));

  if (!notifyChannel?.isTextBased()) {
    return interaction.reply(
      ephemeralPayload({ content: MULAKAT.messages.noNotifyChannel })
    );
  }

  userCooldowns.set(userId, Date.now());

  const ids = getIds();
  const mentions = `<@&${ids.staffRoleId}>`;

  const content = formatTemplate(MULAKAT.messages.staffCalled, {
    mentions,
    caller: `<@${interaction.user.id}>`,
  });

  await notifyChannel.send({
    content,
    allowedMentions: { roles: [ids.staffRoleId] },
  });

  return interaction.reply(
    ephemeralPayload({ content: MULAKAT.messages.called })
  );
}

async function setupPanel(interaction) {
  const ids = getIds();
  const channelId = ids.mulakatPanelChannelId;

  if (!channelId) {
    return interaction.reply(ephemeralPayload({ content: MULAKAT.messages.noChannel }));
  }

  const channel =
    interaction.guild.channels.cache.get(channelId) ||
    (await interaction.guild.channels.fetch(channelId).catch(() => null));

  if (!channel?.isTextBased()) {
    return interaction.reply(ephemeralPayload({ content: MULAKAT.messages.noChannel }));
  }

  await interaction.reply(ephemeralPayload({ content: MULAKAT.messages.panelSent }));

  const payload = buildPanelPayload();
  await channel.send(payload);
}

module.exports = {
  buildPanelPayload,
  handleCall,
  setupPanel,
};
