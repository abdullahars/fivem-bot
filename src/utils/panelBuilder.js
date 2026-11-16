const {
  ContainerBuilder,
  SeparatorBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { getConfig } = require('../config/loadConfig');
const PANEL = require('../constants/panel');
const { getTicketTypes } = require('../constants');
const { applyButtonEmoji } = require('./buttonEmoji');

const BUTTON_STYLES = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger,
};

const { parseEmbedColor } = require('./colors');

function buildV2PanelMessage() {
  const config = getConfig();
  const ticketTypes = getTicketTypes();
  const imageUrl = config.panel?.imageUrl?.trim();

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${PANEL.title}\n${PANEL.description}`)
  );

  if (imageUrl) {
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) =>
        item.setURL(imageUrl).setDescription(PANEL.title)
      )
    );
  }

  container.addSeparatorComponents((sep) => sep);

  for (const type of ticketTypes) {
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((td) =>
          td.setContent(
            `${type.sectionEmoji} **${type.sectionTitle}**\n> ${type.sectionDescription}`
          )
        )
        .setButtonAccessory((button) => {
          const btn = button
            .setCustomId(`ticket_open_${type.id}`)
            .setLabel(type.buttonLabel)
            .setStyle(BUTTON_STYLES[type.buttonStyle] || ButtonStyle.Primary);
          applyButtonEmoji(btn, type.buttonEmoji);
          return btn;
        })
    );
  }

  if (config.bot.footer?.trim()) {
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

module.exports = { buildV2PanelMessage };
