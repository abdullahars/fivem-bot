const {
  ContainerBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { getConfig } = require('../config/loadConfig');
const { getIds } = require('../config/loadConfig');
const TICKET = require('../constants/ticket');
const MESSAGES = require('../constants/messages');
const { parseEmbedColor } = require('./colors');
const { applyButtonEmoji } = require('./buttonEmoji');
const { formatTemplate } = require('./format');

const STAFF_BUTTONS = [
  { key: 'claim', customId: 'ticket_claim', style: ButtonStyle.Success },
  { key: 'close', customId: 'ticket_close', style: ButtonStyle.Danger },
  { key: 'transfer', customId: 'ticket_transfer', style: ButtonStyle.Secondary },
  { key: 'addMember', customId: 'ticket_add_member', style: ButtonStyle.Primary },
];

function getStatusLabel(ticket) {
  if (ticket.status === 'claimed') return TICKET.statusLabels.claimed;
  if (ticket.status === 'closed') return TICKET.statusLabels.closed;
  return TICKET.statusLabels.open;
}

function buildTicketChannelPayload(ticket, guild, { includePing = false } = {}) {
  const config = getConfig();
  const ids = getIds();
  const imageUrl = config.panel?.imageUrl?.trim();

  const opener =
    guild.members.cache.get(ticket.openerId)?.toString() ||
    `<@${ticket.openerId}>`;
  const claimed = ticket.claimedById
    ? guild.members.cache.get(ticket.claimedById)?.toString() ||
      ticket.claimedByTag ||
      '—'
    : '—';

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  if (includePing) {
    const staffPing = ids.staffRoleId ? `<@&${ids.staffRoleId}>` : '';
    container.addTextDisplayComponents((td) =>
      td.setContent(
        `<@${ticket.openerId}> ${MESSAGES.ticketOpenNotify}${staffPing ? `\n${staffPing}` : ''}`
      )
    );
    container.addSeparatorComponents((sep) => sep);
  }

  container.addTextDisplayComponents((td) =>
    td.setContent(
      formatTemplate(TICKET.channel.title, { ticketNumber: ticket.ticketNumber })
    )
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(
      [
        `**Kategori:** ${ticket.typeLabel}`,
        `**Açan:** ${opener}`,
        `**Durum:** ${getStatusLabel(ticket)}`,
        `**İlgilenen:** ${claimed}`,
        '',
        `> ${TICKET.channel.welcome}`,
      ].join('\n')
    )
  );

  if (imageUrl) {
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) =>
        item.setURL(imageUrl).setDescription(`Ticket #${ticket.ticketNumber}`)
      )
    );
  }

  container.addSeparatorComponents((sep) => sep);
  container.addTextDisplayComponents((td) =>
    td.setContent(TICKET.channel.staffHeader)
  );

  for (const { key, customId, style } of STAFF_BUTTONS) {
    const def = TICKET.buttons[key];
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((td) =>
          td.setContent(`${def.emoji} **${def.label}**\n> ${def.hint}`)
        )
        .setButtonAccessory((button) => {
          const btn = button
            .setCustomId(customId)
            .setLabel(def.label)
            .setStyle(style);
          applyButtonEmoji(btn, def.emoji);
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

  const allowedMentions = { users: [ticket.openerId] };
  if (ids.staffRoleId) allowedMentions.roles = [ids.staffRoleId];

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions,
  };
}

async function updateTicketPanelMessage(channel, ticket, guild, includePing = false) {
  const payload = buildTicketChannelPayload(ticket, guild, { includePing });
  const msg = channel.messages.cache.get(ticket.panelMessageId);

  if (msg) {
    await msg.edit({
      content: null,
      embeds: [],
      components: payload.components,
      flags: payload.flags,
      allowedMentions: payload.allowedMentions,
    });
    return msg;
  }

  return channel.send(payload);
}

module.exports = {
  buildTicketChannelPayload,
  updateTicketPanelMessage,
};
