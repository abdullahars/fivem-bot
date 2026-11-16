const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  UserSelectMenuBuilder,
} = require('discord.js');
const { Ticket } = require('../database/models/Ticket');
const { getNextTicketNumber } = require('../database/models/Counter');
const { getIds } = require('../config/loadConfig');
const { getTicketType } = require('../constants');
const MESSAGES = require('../constants/messages');
const { ephemeralPayload } = require('../utils/interaction');
const { formatTemplate } = require('../utils/format');
const {
  buildTicketChannelPayload,
  updateTicketPanelMessage,
} = require('../utils/ticketChannelBuilder');
const { recordClaim, recordClose } = require('./statsService');
const { sendTranscript } = require('./transcriptService');
const TC = require('../constants/ticketCommands');

function assertTransferAllowed(interaction, ticket) {
  if (!ticket.claimedById) {
    return TC.transferNotClaimed;
  }
  if (ticket.claimedById !== interaction.user.id) {
    return TC.transferNotClaimer;
  }
  return null;
}

async function recordTransferClaim(guildId, ticket, newStaffId) {
  const claimTimeMs = Date.now() - new Date(ticket.openedAt).getTime();
  await recordClaim(guildId, newStaffId, ticket.typeId, claimTimeMs);
}

async function getOpenTicketByUser(guildId, userId) {
  const ticket = await Ticket.findOne({
    guildId,
    openerId: userId,
    status: { $in: ['open', 'claimed'] },
  });
  
  // Eğer ticket varsa ama kanal yoksa, ticket'ı kapat
  if (ticket) {
    const guild = await global.client?.guilds.fetch(guildId).catch(() => null);
    if (guild) {
      const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
      if (!channel) {
        // Kanal silinmiş, ticket'ı kapat
        ticket.status = 'closed';
        ticket.closedAt = new Date();
        await ticket.save();
        return null; // Yeni ticket açılabilir
      }
    }
  }
  
  return ticket;
}

async function getTicketByChannel(channelId) {
  return Ticket.findOne({ channelId, status: { $in: ['open', 'claimed'] } });
}

function buildChannelPermissions(guild, openerId, staffRoleId) {
  return [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: openerId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];
}

async function createTicket(interaction, typeId) {
  const ids = getIds();
  const guild = interaction.guild;
  const user = interaction.user;
  const type = getTicketType(typeId);

  if (!type) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.invalidTicketType }));
  }

  const existing = await getOpenTicketByUser(guild.id, user.id);
  if (existing) {
    return interaction.reply(
      ephemeralPayload({
        content: formatTemplate(MESSAGES.alreadyHasTicket, {
          channel: `<#${existing.channelId}>`,
        }),
      })
    );
  }

  await interaction.deferReply(ephemeralPayload());

  const ticketNumber = await getNextTicketNumber(guild.id);
  const channelName = `${type.channelNamePrefix}-${user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 90);

  const channel = await guild.channels.create({
    name: channelName || `ticket-${ticketNumber}`,
    type: ChannelType.GuildText,
    parent: type.categoryId || undefined,
    permissionOverwrites: buildChannelPermissions(guild, user.id, ids.staffRoleId),
  });

  const ticket = await Ticket.create({
    ticketNumber,
    guildId: guild.id,
    channelId: channel.id,
    openerId: user.id,
    typeId: type.id,
    typeLabel: type.buttonLabel,
    status: 'open',
  });

  const payload = buildTicketChannelPayload(ticket, guild, { includePing: true });
  const msg = await channel.send(payload);

  ticket.panelMessageId = msg.id;
  await ticket.save();

  await interaction.editReply({
    content: formatTemplate(MESSAGES.ticketCreated, { channel: `<#${channel.id}>` }),
  });
}

async function claimTicket(interaction) {
  const ticket = await getTicketByChannel(interaction.channelId);

  if (!ticket) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.notTicketChannel }));
  }

  if (ticket.claimedById) {
    return interaction.reply(
      ephemeralPayload({
        content: formatTemplate(MESSAGES.alreadyClaimed, {
          staff: ticket.claimedByTag || `<@${ticket.claimedById}>`,
        }),
      })
    );
  }

  const claimTimeMs = Date.now() - new Date(ticket.openedAt).getTime();
  ticket.status = 'claimed';
  ticket.claimedById = interaction.user.id;
  ticket.claimedByTag = interaction.user.tag;
  ticket.claimedAt = new Date();
  await ticket.save();

  await recordClaim(interaction.guild.id, interaction.user.id, ticket.typeId, claimTimeMs);
  await updateTicketPanelMessage(interaction.channel, ticket, interaction.guild);

  await interaction.reply({
    content: formatTemplate(MESSAGES.claimed, { staff: interaction.user.toString() }),
  });
}

async function closeTicket(interaction) {
  const ticket = await getTicketByChannel(interaction.channelId);

  if (!ticket) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.notTicketChannel }));
  }

  await interaction.deferReply();

  const closeTimeMs = ticket.claimedAt
    ? Date.now() - new Date(ticket.claimedAt).getTime()
    : Date.now() - new Date(ticket.openedAt).getTime();

  ticket.status = 'closed';
  ticket.closedById = interaction.user.id;
  ticket.closedByTag = interaction.user.tag;
  ticket.closedAt = new Date();
  await ticket.save();

  const staffForStats = ticket.claimedById || interaction.user.id;
  await recordClose(interaction.guild.id, staffForStats, closeTimeMs);

  await sendTranscript(interaction.client, ticket, interaction.channel, interaction.user);

  await interaction.editReply({
    content: formatTemplate(MESSAGES.closed, { staff: interaction.user.toString() }),
  });

  setTimeout(async () => {
    try {
      await interaction.channel.delete('Ticket kapatıldı');
    } catch {
      /* kanal zaten silinmiş */
    }
  }, 5000);
}

async function showTransferMenu(interaction) {
  const ticket = await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.notTicketChannel }));
  }

  const transferError = assertTransferAllowed(interaction, ticket);
  if (transferError) {
    return interaction.reply(ephemeralPayload({ content: transferError }));
  }

  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId('ticket_transfer_select')
      .setPlaceholder('Devredilecek staff üyesini seçin')
      .setMinValues(1)
      .setMaxValues(1)
  );

  await interaction.reply(
    ephemeralPayload({ content: MESSAGES.transferPrompt, components: [row] })
  );
}

async function transferTicket(interaction, newStaffId) {
  const ticket = await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    return interaction.update({ content: MESSAGES.notTicketChannel, components: [] });
  }

  const transferError = assertTransferAllowed(interaction, ticket);
  if (transferError) {
    return interaction.update({ content: transferError, components: [] });
  }

  const oldStaff = ticket.claimedByTag || '—';
  const newMember = await interaction.guild.members.fetch(newStaffId).catch(() => null);

  ticket.claimedById = newStaffId;
  ticket.claimedByTag = newMember?.user.tag || newStaffId;
  ticket.status = 'claimed';
  ticket.claimedAt = new Date();
  await ticket.save();

  await recordTransferClaim(interaction.guild.id, ticket, newStaffId);

  const transferText = formatTemplate(MESSAGES.transferred, {
    oldStaff,
    newStaff: newMember?.toString() || `<@${newStaffId}>`,
  });

  await interaction.channel.send({ content: transferText });
  await interaction.update({ content: '✅ Ticket devredildi.', components: [] });
}

async function renameTicketChannel(interaction, newName) {
  const ticket = await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.notTicketChannel }));
  }

  const TC = require('../constants/ticketCommands');
  const sanitized = newName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

  if (!sanitized) {
    return interaction.reply(ephemeralPayload({ content: TC.invalidName }));
  }

  await interaction.channel.setName(sanitized, 'Ticket isim değiştir');
  await interaction.reply({
    content: formatTemplate(TC.renamed, { name: sanitized }),
  });
}

async function transferTicketByCommand(interaction, newStaffId) {
  const ticket = await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.notTicketChannel }));
  }

  const transferError = assertTransferAllowed(interaction, ticket);
  if (transferError) {
    return interaction.reply(ephemeralPayload({ content: transferError }));
  }

  if (newStaffId === interaction.user.id) {
    return interaction.reply(ephemeralPayload({ content: TC.transferSelf }));
  }

  const newMember = await interaction.guild.members.fetch(newStaffId).catch(() => null);
  if (!newMember) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.interactionError }));
  }

  const { isStaff } = require('../utils/permissions');
  if (!isStaff(newMember)) {
    return interaction.reply(ephemeralPayload({ content: TC.transferNotStaff }));
  }

  const oldStaff = ticket.claimedByTag || '—';

  ticket.claimedById = newStaffId;
  ticket.claimedByTag = newMember.user.tag;
  ticket.status = 'claimed';
  ticket.claimedAt = new Date();
  await ticket.save();

  await recordTransferClaim(interaction.guild.id, ticket, newStaffId);

  await interaction.reply({
    content: formatTemplate(MESSAGES.transferred, {
      oldStaff,
      newStaff: newMember.toString(),
    }),
  });
}

async function showAddMemberMenu(interaction) {
  const ticket = await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.notTicketChannel }));
  }

  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId('ticket_add_member_select')
      .setPlaceholder('Eklenecek üyeyi seçin')
      .setMinValues(1)
      .setMaxValues(1)
  );

  await interaction.reply(
    ephemeralPayload({ content: MESSAGES.addMemberPrompt, components: [row] })
  );
}

async function addMemberToTicket(interaction, memberId) {
  const ticket = await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    return interaction.update({ content: MESSAGES.notTicketChannel, components: [] });
  }

  if (!ticket.addedMembers.includes(memberId)) {
    ticket.addedMembers.push(memberId);
    await ticket.save();
  }

  await interaction.channel.permissionOverwrites.edit(memberId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });

  await interaction.update({
    content: formatTemplate(MESSAGES.memberAdded, { member: `<@${memberId}>` }),
    components: [],
  });
}

module.exports = {
  createTicket,
  claimTicket,
  closeTicket,
  showTransferMenu,
  transferTicket,
  transferTicketByCommand,
  renameTicketChannel,
  showAddMemberMenu,
  addMemberToTicket,
  getTicketByChannel,
};
