const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  AttachmentBuilder,
} = require('discord.js');
const { EkipTicket } = require('../database/models/EkipTicket');
const { Counter } = require('../database/models/Counter');
const { getIds } = require('../config/loadConfig');
const EKIP_TICKET = require('../constants/ekipTicket');
const MESSAGES = require('../constants/messages');
const { ephemeralPayload } = require('../utils/interaction');
const { formatTemplate } = require('../utils/format');
const { sendLogEmbed } = require('../utils/logChannel');
const { baseEmbed } = require('../utils/embedBuilder');

async function getNextEkipTicketNumber(guildId) {
  const counter = await Counter.findByIdAndUpdate(
    `ekip_ticket_${guildId}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

async function getOpenEkipTicketByUser(guildId, userId) {
  const ticket = await EkipTicket.findOne({
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

async function getEkipTicketByChannel(channelId) {
  return EkipTicket.findOne({ channelId, status: { $in: ['open', 'claimed'] } });
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

async function createEkipTicket(interaction, typeId) {
  const ids = getIds();
  const guild = interaction.guild;
  const user = interaction.user;
  const type = EKIP_TICKET.types[typeId];

  if (!type) {
    return interaction.reply(ephemeralPayload({ content: '❌ Geçersiz ticket türü.' }));
  }

  const existing = await getOpenEkipTicketByUser(guild.id, user.id);
  if (existing) {
    return interaction.reply(
      ephemeralPayload({
        content: formatTemplate(EKIP_TICKET.messages.alreadyHasTicket, {
          channel: `<#${existing.channelId}>`,
        }),
      })
    );
  }

  await interaction.deferReply(ephemeralPayload());

  const ticketNumber = await getNextEkipTicketNumber(guild.id);
  const channelName = `${type.channelNamePrefix}-${user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 90);

  const channel = await guild.channels.create({
    name: channelName || `ekip-ticket-${ticketNumber}`,
    type: ChannelType.GuildText,
    parent: ids.ekipTicketCategoryId || undefined,
    permissionOverwrites: buildChannelPermissions(guild, user.id, ids.staffRoleId),
  });

  const ticket = await EkipTicket.create({
    ticketNumber,
    guildId: guild.id,
    channelId: channel.id,
    openerId: user.id,
    openerTag: user.tag,
    typeId: type.id,
    typeLabel: type.label,
    status: 'open',
  });

  const payload = await buildEkipTicketChannelPayload(ticket, guild, user);
  const msg = await channel.send(payload);

  ticket.panelMessageId = msg.id;
  await ticket.save();

  await interaction.editReply({
    content: formatTemplate(EKIP_TICKET.messages.ticketCreated, { channel: `<#${channel.id}>` }),
  });
}

async function buildEkipTicketChannelPayload(ticket, guild, user) {
  const { ContainerBuilder, MessageFlags, ButtonStyle } = require('discord.js');
  const { parseEmbedColor } = require('../utils/colors');
  const { getConfig } = require('../config/loadConfig');
  
  const config = getConfig();
  const type = EKIP_TICKET.types[ticket.typeId];
  
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  // Görsel varsa ekle
  if (config.ekipTicket?.imageUrl) {
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) =>
        item.setURL(config.ekipTicket.imageUrl).setDescription(type.label)
      )
    );
    container.addSeparatorComponents((sep) => sep);
  }

  // Başlık (mention sadece açıklama metninde)
  container.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${formatTemplate(EKIP_TICKET.channel.welcomeTitle, { number: ticket.ticketNumber })}`
    )
  );

  container.addSeparatorComponents((sep) => sep);

  // Açıklama
  container.addTextDisplayComponents((td) =>
    td.setContent(
      formatTemplate(EKIP_TICKET.channel.welcomeDesc, {
        user: user.toString(),
        category: type.label,
        number: ticket.ticketNumber,
      })
    )
  );

  container.addSeparatorComponents((sep) => sep);

  // Butonlar
  const buttons = EKIP_TICKET.channel.buttons;

  // İlgilen butonu
  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((td) => td.setContent('**Ticket İşlemleri**'))
      .setButtonAccessory((button) =>
        button
          .setCustomId(buttons.claim.id)
          .setLabel(buttons.claim.label)
          .setStyle(ButtonStyle.Primary)
      )
  );

  // Kapat butonu
  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((td) => td.setContent('**Ticket\'ı Kapat**'))
      .setButtonAccessory((button) =>
        button
          .setCustomId(buttons.close.id)
          .setLabel(buttons.close.label)
          .setStyle(ButtonStyle.Danger)
      )
  );

  // Devret butonu
  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((td) => td.setContent('**Başka Yetkiliye Devret**'))
      .setButtonAccessory((button) =>
        button
          .setCustomId(buttons.transfer.id)
          .setLabel(buttons.transfer.label)
          .setStyle(ButtonStyle.Secondary)
      )
  );

  // Üye ekle butonu
  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((td) => td.setContent('**Ticket\'a Üye Ekle**'))
      .setButtonAccessory((button) =>
        button
          .setCustomId(buttons.addMember.id)
          .setLabel(buttons.addMember.label)
          .setStyle(ButtonStyle.Secondary)
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

async function claimEkipTicket(interaction) {
  const ticket = await getEkipTicketByChannel(interaction.channelId);

  if (!ticket) {
    return interaction.reply(ephemeralPayload({ content: EKIP_TICKET.messages.notTicketChannel }));
  }

  if (ticket.claimedById) {
    return interaction.reply(
      ephemeralPayload({
        content: formatTemplate(EKIP_TICKET.messages.alreadyClaimed, {
          staff: ticket.claimedByTag || `<@${ticket.claimedById}>`,
        }),
      })
    );
  }

  ticket.status = 'claimed';
  ticket.claimedById = interaction.user.id;
  ticket.claimedByTag = interaction.user.tag;
  ticket.claimedAt = new Date();
  await ticket.save();

  await interaction.reply({
    content: formatTemplate(EKIP_TICKET.messages.claimed, { staff: interaction.user.toString() }),
  });
}

async function closeEkipTicket(interaction) {
  const ticket = await getEkipTicketByChannel(interaction.channelId);

  if (!ticket) {
    return interaction.reply(ephemeralPayload({ content: EKIP_TICKET.messages.notTicketChannel }));
  }

  await interaction.deferReply();

  ticket.status = 'closed';
  ticket.closedById = interaction.user.id;
  ticket.closedByTag = interaction.user.tag;
  ticket.closedAt = new Date();
  await ticket.save();

  // Transcript oluştur ve gönder
  await sendEkipTicketTranscript(interaction.client, ticket, interaction.channel, interaction.user);

  // Log gönder
  await sendEkipTicketLog(interaction.guild, ticket);

  await interaction.editReply({
    content: formatTemplate(EKIP_TICKET.messages.closed, { staff: interaction.user.toString() }),
  });

  setTimeout(async () => {
    try {
      await interaction.channel.delete('Ekip ticket kapatıldı');
    } catch {
      /* kanal zaten silinmiş */
    }
  }, 5000);
}

async function sendEkipTicketTranscript(client, ticket, channel, closer) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = [...messages.values()].reverse();

    const type = EKIP_TICKET.types[ticket.typeId];
    const opener = await client.users.fetch(ticket.openerId).catch(() => null);
    const claimer = ticket.claimedById
      ? await client.users.fetch(ticket.claimedById).catch(() => null)
      : null;

    // Text transcript oluştur
    let transcript = `${EKIP_TICKET.transcript.header.replace('{number}', ticket.ticketNumber)}\n\n`;
    transcript += formatTemplate(EKIP_TICKET.transcript.info, {
      opener: opener?.tag || ticket.openerTag,
      category: type.label,
      openedAt: ticket.createdAt.toLocaleString('tr-TR'),
      closedAt: ticket.closedAt.toLocaleString('tr-TR'),
      claimer: claimer?.tag || ticket.claimedByTag || 'Yok',
      closer: closer.tag,
    });
    transcript += '\n\n' + '='.repeat(50) + '\n\n';

    for (const msg of sortedMessages) {
      const time = msg.createdAt.toLocaleTimeString('tr-TR');
      const author = msg.author.tag;
      const content = msg.content || '';

      transcript += formatTemplate(EKIP_TICKET.transcript.messageFormat, {
        time,
        author,
        content,
      });
      transcript += '\n';

      if (msg.attachments.size > 0) {
        msg.attachments.forEach((att) => {
          transcript += `  ${formatTemplate(EKIP_TICKET.transcript.attachmentNote, { name: att.name })}\n`;
        });
      }
    }

    const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), {
      name: `ekip-ticket-${ticket.ticketNumber}.txt`,
    });

    // Açana gönder
    if (opener) {
      try {
        await opener.send({
          content: `📋 Ekip Ticket #${ticket.ticketNumber} geçmişi:`,
          files: [attachment],
        });
      } catch {
        console.warn('[Ekip Ticket] Transcript gönderilemedi:', opener.tag);
      }
    }

    // Log kanalına gönder
    const ids = getIds();
    if (ids.ekipTicketLogChannelId) {
      const logChannel = await channel.guild.channels.fetch(ids.ekipTicketLogChannelId).catch(() => null);
      if (logChannel?.isTextBased()) {
        await logChannel.send({
          content: `📋 Ekip Ticket #${ticket.ticketNumber} Transcript`,
          files: [attachment],
        });
      }
    }
  } catch (err) {
    console.error('[Ekip Ticket] Transcript hatası:', err);
  }
}

async function sendEkipTicketLog(guild, ticket) {
  const ids = getIds();
  if (!ids.ekipTicketLogChannelId) return;

  const type = EKIP_TICKET.types[ticket.typeId];
  const duration = ticket.closedAt && ticket.createdAt
    ? Math.floor((ticket.closedAt - ticket.createdAt) / 1000 / 60)
    : 0;

  const embed = baseEmbed()
    .setTitle(EKIP_TICKET.log.title)
    .setDescription(
      formatTemplate(EKIP_TICKET.log.desc, {
        number: ticket.ticketNumber,
        category: type.label,
        opener: `<@${ticket.openerId}>`,
        claimer: ticket.claimedById ? `<@${ticket.claimedById}>` : 'Yok',
        closer: ticket.closedById ? `<@${ticket.closedById}>` : 'Yok',
        openedAt: Math.floor(ticket.createdAt.getTime() / 1000),
        closedAt: Math.floor(ticket.closedAt.getTime() / 1000),
        duration: `${duration} dakika`,
      })
    )
    .setTimestamp();

  await sendLogEmbed(guild, ids.ekipTicketLogChannelId, embed);
}

async function showTransferMenu(interaction) {
  const ticket = await getEkipTicketByChannel(interaction.channelId);
  if (!ticket) {
    return interaction.reply(ephemeralPayload({ content: EKIP_TICKET.messages.notTicketChannel }));
  }

  // Sadece ticket'ı claim eden kişi devredebilir
  if (ticket.claimedById && ticket.claimedById !== interaction.user.id) {
    return interaction.reply(
      ephemeralPayload({
        content: '❌ Bu ticket\'ı sadece ilgilenen yetkili devredebilir.',
      })
    );
  }

  if (!ticket.claimedById) {
    return interaction.reply(
      ephemeralPayload({
        content: '❌ Bu ticket henüz ilgilenilmedi. Önce ticket\'ı claim edin.',
      })
    );
  }

  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId('ekip_ticket_transfer_select')
      .setPlaceholder('Devredilecek staff üyesini seçin')
      .setMinValues(1)
      .setMaxValues(1)
  );

  await interaction.reply(
    ephemeralPayload({ content: EKIP_TICKET.messages.transferPrompt, components: [row] })
  );
}

async function transferEkipTicket(interaction, newStaffId) {
  const ticket = await getEkipTicketByChannel(interaction.channelId);
  if (!ticket) {
    return interaction.update({ content: EKIP_TICKET.messages.notTicketChannel, components: [] });
  }

  const oldStaff = ticket.claimedByTag || '—';
  const newMember = await interaction.guild.members.fetch(newStaffId).catch(() => null);

  ticket.claimedById = newStaffId;
  ticket.claimedByTag = newMember?.user.tag || newStaffId;
  ticket.status = 'claimed';
  ticket.claimedAt = new Date();
  await ticket.save();

  await interaction.update({
    content: formatTemplate(EKIP_TICKET.messages.transferred, {
      oldStaff,
      newStaff: newMember?.toString() || `<@${newStaffId}>`,
    }),
    components: [],
  });
}

async function showAddMemberMenu(interaction) {
  const ticket = await getEkipTicketByChannel(interaction.channelId);
  if (!ticket) {
    return interaction.reply(ephemeralPayload({ content: EKIP_TICKET.messages.notTicketChannel }));
  }

  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId('ekip_ticket_add_member_select')
      .setPlaceholder('Eklenecek üyeyi seçin')
      .setMinValues(1)
      .setMaxValues(1)
  );

  await interaction.reply(
    ephemeralPayload({ content: EKIP_TICKET.messages.addMemberPrompt, components: [row] })
  );
}

async function addMemberToEkipTicket(interaction, memberId) {
  const ticket = await getEkipTicketByChannel(interaction.channelId);
  if (!ticket) {
    return interaction.update({ content: EKIP_TICKET.messages.notTicketChannel, components: [] });
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
    content: formatTemplate(EKIP_TICKET.messages.memberAdded, { member: `<@${memberId}>` }),
    components: [],
  });
}

module.exports = {
  createEkipTicket,
  claimEkipTicket,
  closeEkipTicket,
  showTransferMenu,
  transferEkipTicket,
  showAddMemberMenu,
  addMemberToEkipTicket,
  getEkipTicketByChannel,
};
