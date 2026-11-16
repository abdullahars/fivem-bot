const { AttachmentBuilder } = require('discord.js');
const { getIds } = require('../config/loadConfig');
const TRANSCRIPT = require('../constants/transcript');
const { formatTemplate, formatDuration } = require('../utils/format');
const { baseEmbed } = require('../utils/embedBuilder');

async function fetchChannelMessages(channel, limit = 500) {
  const messages = [];
  let lastId;

  while (messages.length < limit) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (!batch.size) break;

    const arr = [...batch.values()];
    messages.push(...arr);
    lastId = arr[arr.length - 1].id;
    if (batch.size < 100) break;
  }

  return messages.reverse();
}

function buildTranscriptText(ticket, messages, guild) {
  const lines = [
    '='.repeat(50),
    `TICKET GEÇMİŞİ #${ticket.ticketNumber}`,
    '='.repeat(50),
    `Sunucu: ${guild.name}`,
    `Kategori: ${ticket.typeLabel}`,
    `Açan: ${ticket.openerId}`,
    `İlgilenen: ${ticket.claimedByTag || '—'}`,
    `Kapatan: ${ticket.closedByTag || '—'}`,
    `Açılış: ${ticket.openedAt?.toISOString() || '—'}`,
    `Kapanış: ${ticket.closedAt?.toISOString() || '—'}`,
    '='.repeat(50),
    '',
  ];

  for (const msg of messages) {
    if (msg.author.bot && msg.embeds.length && !msg.content) continue;
    const time = msg.createdAt.toLocaleString('tr-TR');
    const author = msg.author.tag;
    const content = msg.content || '[Embed/Dosya]';
    const attachments = msg.attachments.map((a) => a.url).join(', ');
    lines.push(`[${time}] ${author}: ${content}`);
    if (attachments) lines.push(`  Ekler: ${attachments}`);
  }

  lines.push('', '='.repeat(50), 'SON');
  return lines.join('\n');
}

async function sendTranscript(client, ticket, channel, closedBy) {
  const ids = getIds();
  const guild = channel.guild;
  const messages = await fetchChannelMessages(channel);
  const text = buildTranscriptText(ticket, messages, guild);

  const fileName = formatTemplate(TRANSCRIPT.fileName, {
    ticketNumber: ticket.ticketNumber,
  });
  const attachment = new AttachmentBuilder(Buffer.from(text, 'utf-8'), {
    name: fileName,
  });

  const duration =
    ticket.closedAt && ticket.openedAt
      ? formatDuration(ticket.closedAt - ticket.openedAt)
      : '—';

  const logVars = {
    ticketNumber: ticket.ticketNumber,
    ticketType: ticket.typeLabel,
    user: `<@${ticket.openerId}>`,
    closedBy: closedBy?.toString() || ticket.closedByTag || '—',
    claimedBy: ticket.claimedByTag || '—',
    duration,
  };

  const logEmbed = baseEmbed()
    .setTitle(formatTemplate(TRANSCRIPT.logEmbed.title, logVars))
    .setDescription(formatTemplate(TRANSCRIPT.logEmbed.description, logVars));

  const logChannel = guild.channels.cache.get(ids.ticketLogChannelId);
  if (logChannel?.isTextBased()) {
    await logChannel.send({ embeds: [logEmbed], files: [attachment] });
  }

  try {
    const opener = await client.users.fetch(ticket.openerId);
    const dmAttachment = new AttachmentBuilder(Buffer.from(text, 'utf-8'), {
      name: fileName,
    });
    await opener.send({
      content: formatTemplate(TRANSCRIPT.dmMessage, {
        ticketNumber: ticket.ticketNumber,
      }),
      files: [dmAttachment],
    });
  } catch {
    if (logChannel?.isTextBased()) {
      await logChannel.send({
        content: formatTemplate(TRANSCRIPT.dmFailed, { userId: ticket.openerId }),
      });
    }
  }
}

module.exports = { sendTranscript, buildTranscriptText };
