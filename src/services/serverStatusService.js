const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  MessageFlags,
} = require('discord.js');
const { getFivemSettings, getConfig } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { applyButtonEmoji } = require('../utils/buttonEmoji');
const SS = require('../constants/serverStatus');

function buildConnectBlock(settings) {
  return `\`\`\`${settings.connectCommand}\`\`\``;
}

function buildConnectButton(settings) {
  if (!settings.connectLink?.trim()) return null;

  return applyButtonEmoji(
    new ButtonBuilder()
      .setLabel(SS.buttons.connect.label)
      .setStyle(ButtonStyle.Link)
      .setURL(settings.connectLink),
    SS.buttons.connect.emoji
  );
}

function baseServerContainer(settings, statusKey, additionalFields = '', mentionEveryone = false) {
  const config = getConfig();
  const status = SS.status[statusKey];

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  // @everyone mention + büyük başlık (ayrı satırlarda)
  if (mentionEveryone) {
    container.addTextDisplayComponents((td) =>
      td.setContent(`@everyone\n${status.title}`)
    );
    container.addSeparatorComponents((sep) => sep);
  }

  // Sunucu adı
  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${settings.serverName}`)
  );

  // Banner image varsa media gallery'ye ekle
  const banner = settings.images?.[statusKey]?.trim();
  if (banner) {
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) =>
        item.setURL(banner).setDescription(settings.serverName)
      )
    );
  }

  container.addSeparatorComponents((sep) => sep);

  // Ana section - status ve connect bilgisi
  const mainText = `**${SS.fields.status}**\n${status.label}\n\n${additionalFields}**${SS.fields.connect}**\n${buildConnectBlock(settings)}`;
  
  // Connect button varsa section'a ekle
  const connectBtn = buildConnectButton(settings);
  if (connectBtn) {
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((td) => td.setContent(mainText))
        .setButtonAccessory(() => connectBtn)
    );
  } else {
    container.addSectionComponents((section) =>
      section.addTextDisplayComponents((td) => td.setContent(mainText))
    );
  }

  // Footer
  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  return container;
}

async function buildAktifPayload() {
  const settings = getFivemSettings();
  if (!settings.configured) return { error: SS.notConfigured };

  const container = baseServerContainer(settings, 'aktif', '', true);

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: ['everyone'] },
  };
}

function buildBakimPayload(sebep, acilis) {
  const settings = getFivemSettings();
  if (!settings.configured) return { error: SS.notConfigured };

  const additionalFields = `**${SS.fields.acilis}**\n${acilis}\n\n**${SS.fields.sebep}**\n${sebep}\n\n`;

  const container = baseServerContainer(settings, 'bakim', additionalFields, true);

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: ['everyone'] },
  };
}

function buildRestartPayload(saat) {
  const settings = getFivemSettings();
  if (!settings.configured) return { error: SS.notConfigured };

  const additionalFields = `**${SS.fields.restart}**\n${saat}\n\n`;

  const container = baseServerContainer(settings, 'restart', additionalFields, true);

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: ['everyone'] },
  };
}

module.exports = {
  buildAktifPayload,
  buildBakimPayload,
  buildRestartPayload,
};
