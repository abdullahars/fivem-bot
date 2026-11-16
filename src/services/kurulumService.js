const {
  ChannelType,
  PermissionFlagsBits,
  ContainerBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  ButtonStyle,
} = require('discord.js');
const LOG = require('../constants/logChannels');
const { getIds, getConfig } = require('../config/loadConfig');
const { syncChannelsFromGuild } = require('../config/channelRegistry');
const KURULUM = require('../constants/kurulum');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');
const { isUstYonetim } = require('../utils/permissions');
const { buildPanelMessage } = require('../utils/embedBuilder');
const { buildPanelPayload: buildMulakatPanelPayload } = require('./mulakatService');
const EKIP_TICKET = require('../constants/ekipTicket');

function canUseKurulum(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return isUstYonetim(member);
}

function buildOverwrites(guild, ustYonetimRoleId, isPrivate) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: isPrivate ? [PermissionFlagsBits.ViewChannel] : [],
      allow: isPrivate ? [] : [PermissionFlagsBits.ViewChannel],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];

  if (ustYonetimRoleId) {
    overwrites.push({
      id: ustYonetimRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  return overwrites;
}

async function findOrCreateCategory(guild, ustYonetimRoleId) {
  let category = guild.channels.cache.find(
    (ch) => ch.type === ChannelType.GuildCategory && ch.name === LOG.categoryName
  );

  if (!category) {
    category = await guild.channels.create({
      name: LOG.categoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites: buildOverwrites(guild, ustYonetimRoleId, true),
      reason: 'Bot log kurulumu',
    });
  }

  return category;
}

async function findOrCreateLogChannel(guild, category, def, ustYonetimRoleId) {
  let channel = guild.channels.cache.find(
    (ch) => ch.isTextBased?.() && ch.name === def.name
  );

  if (channel) {
    if (channel.parentId !== category.id) {
      await channel.setParent(category.id, { lockPermissions: false }).catch(() => {});
    }
    return { channel, created: false };
  }

  channel = await guild.channels.create({
    name: def.name,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: def.label,
    permissionOverwrites: buildOverwrites(guild, ustYonetimRoleId, def.private !== false),
    reason: 'Bot log kurulumu',
  });

  return { channel, created: true };
}

async function runKanalKurulum(guild) {
  const ids = getIds();
  const ustYonetimRoleId = ids.ustYonetimRoleId;

  if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error(KURULUM.messages.noManageChannels);
  }

  const category = await findOrCreateCategory(guild, ustYonetimRoleId);
  const created = [];
  const existing = [];

  for (const [, def] of Object.entries(LOG.channels)) {
    const result = await findOrCreateLogChannel(guild, category, def, ustYonetimRoleId);
    if (result.created) created.push(def.name);
    else existing.push(def.name);
  }

  const sync = syncChannelsFromGuild(guild);

  return { category, created, existing, sync };
}

function formatKanalKurulumMessage(result) {
  const created =
    result.created.length > 0 ? result.created.join(', ') : KURULUM.messages.noneCreated;
  const existing =
    result.existing.length > 0 ? result.existing.join(', ') : KURULUM.messages.noneExisting;

  let missingNote = '';
  if (result.sync.missing.length > 0) {
    missingNote = formatTemplate(KURULUM.messages.missingNote, {
      names: result.sync.missing.join(', '),
    });
  }

  return formatTemplate(KURULUM.messages.success, {
    category: result.category.toString(),
    created,
    existing,
    found: result.sync.found,
    total: result.sync.total,
    missingNote,
  });
}

async function resolveTextChannel(guild, channelId) {
  if (!channelId || String(channelId).includes('KANAL')) return null;

  const channel =
    guild.channels.cache.get(channelId) ||
    (await guild.channels.fetch(channelId).catch(() => null));

  return channel?.isTextBased() ? channel : null;
}

async function runTicketPanelKur(guild) {
  const ids = getIds();
  const channel = await resolveTextChannel(guild, ids.ticketPanelChannelId);
  if (!channel) {
    throw new Error(KURULUM.messages.channelMissing);
  }

  const panel = buildPanelMessage();
  const payload = {
    embeds: panel.embeds?.length ? panel.embeds : undefined,
    components: panel.components,
  };
  if (panel.flags) payload.flags = panel.flags;

  await channel.send(payload);
  return formatTemplate(KURULUM.messages.ticketPanelSent, { channel: channel.toString() });
}

async function runMulakatPanelKur(guild) {
  const ids = getIds();
  const channel = await resolveTextChannel(guild, ids.mulakatPanelChannelId);
  if (!channel) {
    throw new Error(KURULUM.messages.channelMissing);
  }

  await channel.send(buildMulakatPanelPayload());
  return formatTemplate(KURULUM.messages.mulakatPanelSent, { channel: channel.toString() });
}

function buildEkipTicketPanelPayload() {
  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${EKIP_TICKET.title}\n${EKIP_TICKET.description}`)
  );

  if (config.ekipTicket?.imageUrl) {
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) =>
        item.setURL(config.ekipTicket.imageUrl).setDescription(EKIP_TICKET.title)
      )
    );
  }

  container.addSeparatorComponents((sep) => sep);

  for (const typeKey of ['illegal', 'legal', 'isletme']) {
    const typeDef = EKIP_TICKET.types[typeKey];
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((td) =>
          td.setContent(`**${typeDef.emoji} ${typeDef.label}**\n${typeDef.description}`)
        )
        .setButtonAccessory((button) =>
          button
            .setCustomId(`ekip_ticket_open_${typeDef.id}`)
            .setLabel(typeDef.buttonLabel)
            .setStyle(ButtonStyle[typeDef.buttonStyle])
        )
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

async function runEkipTicketPanelKur(guild) {
  const ids = getIds();
  const channel = await resolveTextChannel(guild, ids.ekipTicketPanelChannelId);
  if (!channel) {
    throw new Error(KURULUM.messages.channelMissing);
  }

  await channel.send(buildEkipTicketPanelPayload());
  return formatTemplate(KURULUM.messages.ekipTicketPanelSent, { channel: channel.toString() });
}

function buildKurulumPanelPayload() {
  const config = getConfig();
  const opts = KURULUM.select.options;

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${KURULUM.messages.panelTitle}\n\n${KURULUM.messages.panelDesc}`)
  );
  container.addSeparatorComponents((sep) => sep);
  container.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(KURULUM.select.customId)
        .setPlaceholder(KURULUM.select.placeholder)
        .addOptions(
          Object.values(opts).map((opt) => ({
            label: opt.label,
            value: opt.value,
            description: opt.description,
          }))
        )
    )
  );

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

function buildKurulumResultPayload(text) {
  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) => td.setContent(text));

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

async function openKurulumPanel(interaction) {
  if (!canUseKurulum(interaction.member)) {
    return interaction.reply(
      ephemeralPayload({ content: KURULUM.messages.noPermission })
    );
  }

  return interaction.reply(ephemeralPayload(buildKurulumPanelPayload()));
}

async function handleKurulumSelect(interaction) {
  if (!canUseKurulum(interaction.member)) {
    return interaction.reply(
      ephemeralPayload({ content: KURULUM.messages.noPermission })
    );
  }

  const value = interaction.values[0];
  await interaction.deferUpdate();

  try {
    let content;

    switch (value) {
      case KURULUM.select.options.kanallar.value: {
        const result = await runKanalKurulum(interaction.guild);
        content = formatKanalKurulumMessage(result);
        break;
      }
      case KURULUM.select.options.ticket.value:
        content = await runTicketPanelKur(interaction.guild);
        break;
      case KURULUM.select.options.mulakat.value:
        content = await runMulakatPanelKur(interaction.guild);
        break;
      case KURULUM.select.options.ekipTicket.value:
        content = await runEkipTicketPanelKur(interaction.guild);
        break;
      default:
        content = KURULUM.messages.invalidOption;
    }

    return interaction.editReply(ephemeralPayload(buildKurulumResultPayload(content)));
  } catch (err) {
    console.error('[Kurulum]', err);
    return interaction.editReply(
      ephemeralPayload(
        buildKurulumResultPayload(`❌ Kurulum başarısız: ${err.message || err}`)
      )
    );
  }
}

module.exports = {
  canUseKurulum,
  runKanalKurulum,
  openKurulumPanel,
  handleKurulumSelect,
  buildKurulumPanelPayload,
};
