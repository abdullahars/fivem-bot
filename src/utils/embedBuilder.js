const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getConfig } = require('../config/loadConfig');
const PANEL = require('../constants/panel');
const TICKET = require('../constants/ticket');
const { getTicketTypes } = require('../constants');
const { formatTemplate } = require('./format');
const { buildV2PanelMessage } = require('./panelBuilder');
const { applyButtonEmoji } = require('./buttonEmoji');

const BUTTON_STYLES = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger,
};

const { parseEmbedColor } = require('./colors');

function baseEmbed() {
  const config = getConfig();
  return new EmbedBuilder()
    .setColor(parseEmbedColor(config.bot.embedColor))
    .setTimestamp();
}

function buildCategorySections(ticketTypes) {
  return ticketTypes
    .map(
      (t) =>
        `${t.sectionEmoji} **${t.sectionTitle}**\n> ${t.sectionDescription}`
    )
    .join('\n\n');
}

function buildModernPanelEmbeds() {
  const config = getConfig();
  const ticketTypes = getTicketTypes();

  const headerEmbed = baseEmbed()
    .setTitle(PANEL.title)
    .setDescription(PANEL.description);

  const imageUrl = config.panel?.imageUrl?.trim();
  if (imageUrl) headerEmbed.setImage(imageUrl);
  if (config.bot.footer) headerEmbed.setFooter({ text: config.bot.footer });

  const categoryEmbed = baseEmbed().setDescription(buildCategorySections(ticketTypes));
  return [headerEmbed, categoryEmbed];
}

function buildCompactPanelEmbed() {
  const config = getConfig();
  const ticketTypes = getTicketTypes();
  const imageUrl = config.panel?.imageUrl?.trim();

  const description = [PANEL.description, '', buildCategorySections(ticketTypes)]
    .filter(Boolean)
    .join('\n');

  const builder = baseEmbed().setTitle(PANEL.title).setDescription(description);
  if (imageUrl) builder.setImage(imageUrl);
  if (config.bot.footer) builder.setFooter({ text: config.bot.footer });

  return builder;
}

function buildPanelEmbeds() {
  if (PANEL.layout === 'modern') return buildModernPanelEmbeds();
  if (PANEL.layout === 'compact') return [buildCompactPanelEmbed()];
  return [];
}

function buildPanelButtons() {
  const onePerRow = PANEL.layout === 'modern';
  const rows = [];

  for (const type of getTicketTypes()) {
    const btn = new ButtonBuilder()
      .setCustomId(`ticket_open_${type.id}`)
      .setLabel(type.buttonLabel)
      .setStyle(BUTTON_STYLES[type.buttonStyle] || ButtonStyle.Primary);
    applyButtonEmoji(btn, type.buttonEmoji);

    if (onePerRow) {
      rows.push(new ActionRowBuilder().addComponents(btn));
    } else {
      const last = rows[rows.length - 1];
      if (!last || last.components.length >= 5) {
        rows.push(new ActionRowBuilder().addComponents(btn));
      } else {
        last.addComponents(btn);
      }
    }
  }

  return rows;
}

function buildPanelMessage() {
  if (PANEL.layout === 'v2') {
    return buildV2PanelMessage();
  }

  return {
    embeds: buildPanelEmbeds(),
    components: buildPanelButtons(),
    flags: undefined,
  };
}

function buildTicketEmbed(ticket, guild) {
  const opener = guild.members.cache.get(ticket.openerId);
  const claimed = ticket.claimedById
    ? guild.members.cache.get(ticket.claimedById)?.toString() || ticket.claimedByTag
    : '—';

  let status = TICKET.statusLabels.open;
  if (ticket.status === 'claimed') status = TICKET.statusLabels.claimed;
  if (ticket.status === 'closed') status = TICKET.statusLabels.closed;

  const vars = {
    ticketNumber: ticket.ticketNumber,
    ticketType: ticket.typeLabel,
    user: opener?.toString() || `<@${ticket.openerId}>`,
    status,
    claimedBy: claimed,
    ticketId: ticket._id.toString(),
  };

  const embed = baseEmbed()
    .setTitle(formatTemplate(TICKET.embed.title, vars))
    .setDescription(formatTemplate(TICKET.embed.description, vars));

  if (TICKET.embed.footer) {
    embed.setFooter({ text: formatTemplate(TICKET.embed.footer, vars) });
  }
  return embed;
}

function buildTicketControlButtons() {
  const b = TICKET.buttons;

  const claimBtn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel(b.claim.label)
      .setStyle(ButtonStyle.Success),
    b.claim.emoji
  );
  const closeBtn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel(b.close.label)
      .setStyle(ButtonStyle.Danger),
    b.close.emoji
  );
  const transferBtn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId('ticket_transfer')
      .setLabel(b.transfer.label)
      .setStyle(ButtonStyle.Secondary),
    b.transfer.emoji
  );
  const addBtn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId('ticket_add_member')
      .setLabel(b.addMember.label)
      .setStyle(ButtonStyle.Primary),
    b.addMember.emoji
  );

  return [
    new ActionRowBuilder().addComponents(claimBtn, closeBtn, transferBtn, addBtn),
  ];
}

function wrapContent(contentAbove, content, contentBelow) {
  return [contentAbove, content, contentBelow].filter((s) => s && s.trim()).join('\n\n');
}

module.exports = {
  buildPanelEmbeds,
  buildPanelButtons,
  buildPanelMessage,
  buildTicketEmbed,
  buildTicketControlButtons,
  wrapContent,
  baseEmbed,
  formatTemplate,
};
