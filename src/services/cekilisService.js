const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
} = require('discord.js');
const { Giveaway } = require('../database/models/Giveaway');
const { getConfig } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const { applyButtonEmoji } = require('../utils/buttonEmoji');
const { ephemeralPayload } = require('../utils/interaction');
const CEK = require('../constants/cekilis');

const giveawayTimers = new Map();

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickUnique(participants, count) {
  return shuffle(participants).slice(0, Math.min(count, participants.length));
}

function buildProgressBar(current, target, width = 10) {
  const safeTarget = Math.max(target, 1);
  const filled = Math.min(width, Math.round((current / safeTarget) * width));
  return `${'▰'.repeat(filled)}${'▱'.repeat(width - filled)}`;
}

function formatUserList(userIds, emptyText) {
  if (!userIds?.length) return emptyText;
  return userIds.map((id, index) => `${index + 1}. <@${id}>`).join('\n');
}

function buildPrizeLines(winnerCount) {
  const P = CEK.panel;
  return (
    `🟢 ${formatTemplate(P.prizeWinner, { count: winnerCount })}\n` +
    `🟡 ${formatTemplate(P.prizeBackup, { count: winnerCount })}`
  );
}

function buildDescriptionHeader(giveaway, ended = false) {
  const P = CEK.panel;
  const lines = String(giveaway.description || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const badge = ended ? P.endedBadge : P.badge;
  if (!lines.length) return `${badge}\n\n# —`;

  const [headline, ...rest] = lines;
  let content = `${badge}\n\n# ${headline}`;
  if (rest.length) content += `\n\n${rest.join('\n')}`;
  return content;
}

function buildActiveDetails(giveaway) {
  const P = CEK.panel;
  const count = giveaway.participants?.length ?? 0;
  const progressTarget = Math.max(giveaway.winnerCount * 3, 10);
  const progressBar = buildProgressBar(count, progressTarget);
  const endsTs = Math.floor(new Date(giveaway.endsAt).getTime() / 1000);

  return (
    `${P.progressTitle}\n` +
    `${progressBar}  ${formatTemplate(P.joinedCount, { count })}\n\n` +
    `${P.prizesTitle}\n${buildPrizeLines(giveaway.winnerCount)}\n\n` +
    `${P.timeTitle}\n<t:${endsTs}:R>\n<t:${endsTs}:F>\n\n` +
    `${formatTemplate(P.createdBy, { user: `<@${giveaway.creatorId}>` })}`
  );
}

function buildEndedDetails(giveaway) {
  const P = CEK.panel;
  const endedTs = giveaway.endedAt
    ? Math.floor(new Date(giveaway.endedAt).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  return (
    `${P.winnersTitle}\n${formatUserList(giveaway.winners, P.noWinners)}\n\n` +
    `${P.backupsTitle}\n${formatUserList(giveaway.backups, P.noBackups)}\n\n` +
    `${P.endedTime}\n<t:${endedTs}:F>\n\n` +
    `${formatTemplate(P.createdBy, { user: `<@${giveaway.creatorId}>` })}`
  );
}

function buildGiveawayButtons(giveaway, disabled = false) {
  const joinBtn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId(`${CEK.buttons.joinPrefix}${giveaway._id}`)
      .setLabel(CEK.labels.join)
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    '✅'
  );

  const listBtn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId(`${CEK.buttons.listPrefix}${giveaway._id}`)
      .setLabel(CEK.labels.list)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    '👥'
  );

  return [new ActionRowBuilder().addComponents(joinBtn, listBtn)];
}

function buildGiveawayPayload(giveaway, ended = false) {
  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(buildDescriptionHeader(giveaway, ended))
  );

  container.addSeparatorComponents((sep) => sep);

  container.addTextDisplayComponents((td) =>
    td.setContent(ended ? buildEndedDetails(giveaway) : buildActiveDetails(giveaway))
  );

  if (!ended) {
    container.addSeparatorComponents((sep) => sep);
    container.addActionRowComponents((row) =>
      row.addComponents(...buildGiveawayButtons(giveaway, false)[0].components)
    );
  } else {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${CEK.labels.ended}`)
    );
  }

  const imageUrl = config.panel?.imageUrl?.trim();
  if (imageUrl) {
    container.addSeparatorComponents((sep) => sep);
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) =>
        item
          .setURL(imageUrl)
          .setDescription(
            ended ? CEK.panel.endedBadge.replace(/\*/g, '') : CEK.panel.badge.replace(/\*/g, '')
          )
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

async function updateGiveawayMessage(client, giveaway, ended = false) {
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return;

  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) return;

  await message.edit(buildGiveawayPayload(giveaway, ended));
}

function clearGiveawayTimer(giveawayId) {
  const timer = giveawayTimers.get(String(giveawayId));
  if (timer) {
    clearTimeout(timer);
    giveawayTimers.delete(String(giveawayId));
  }
}

function drawResults(participants, winnerCount) {
  const pool = [...new Set(participants)];
  const winners = pickUnique(pool, winnerCount);
  const remaining = pool.filter((id) => !winners.includes(id));
  const backups = pickUnique(remaining, winnerCount);
  return { winners, backups };
}

async function endGiveaway(client, giveawayDoc) {
  clearGiveawayTimer(giveawayDoc._id);

  const fresh = await getActiveGiveaway(giveawayDoc._id);
  if (!fresh) return;

  const { winners, backups } = drawResults(fresh.participants || [], fresh.winnerCount);

  fresh.status = 'ended';
  fresh.winners = winners;
  fresh.backups = backups;
  fresh.endedAt = new Date();
  await fresh.save();

  await updateGiveawayMessage(client, fresh, true);
}

function scheduleGiveawayEnd(client, giveaway) {
  clearGiveawayTimer(giveaway._id);

  const delay = Math.max(0, new Date(giveaway.endsAt).getTime() - Date.now());
  const timer = setTimeout(() => {
    giveawayTimers.delete(String(giveaway._id));
    endGiveaway(client, giveaway).catch((err) => {
      console.error('[Çekiliş] Bitiş hatası:', err?.message || err);
    });
  }, delay);

  giveawayTimers.set(String(giveaway._id), timer);
}

async function restoreActiveGiveaways(client) {
  const active = await Giveaway.find({ status: 'active' });
  for (const giveaway of active) {
    if (new Date(giveaway.endsAt).getTime() <= Date.now()) {
      await endGiveaway(client, giveaway);
    } else {
      scheduleGiveawayEnd(client, giveaway);
    }
  }
}

async function executeCekilis(interaction) {
  const description = interaction.options.getString(CEK.options.aciklama.name)?.trim();
  const winnerCount = interaction.options.getInteger(CEK.options.kazanan.name);
  const minutes = interaction.options.getInteger(CEK.options.sure.name);

  if (!interaction.channel?.isTextBased?.() || interaction.channel.isDMBased()) {
    return interaction.reply(ephemeralPayload({ content: CEK.messages.notTextChannel }));
  }

  if (
    !description ||
    winnerCount == null ||
    winnerCount < CEK.limits.minWinners ||
    winnerCount > CEK.limits.maxWinners
  ) {
    return interaction.reply(ephemeralPayload({ content: CEK.messages.invalidWinners }));
  }

  if (
    minutes == null ||
    minutes < CEK.limits.minMinutes ||
    minutes > CEK.limits.maxMinutes
  ) {
    return interaction.reply(ephemeralPayload({ content: CEK.messages.invalidDuration }));
  }

  const endsAt = new Date(Date.now() + minutes * 60 * 1000);
  const giveaway = await Giveaway.create({
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    messageId: '0',
    description,
    winnerCount,
    endsAt,
    creatorId: interaction.user.id,
    creatorTag: interaction.user.tag,
    participants: [],
    status: 'active',
    winners: [],
    backups: [],
  });

  const message = await interaction.channel.send(buildGiveawayPayload(giveaway));
  giveaway.messageId = message.id;
  await giveaway.save();

  scheduleGiveawayEnd(interaction.client, giveaway);

  return interaction.reply(ephemeralPayload({ content: CEK.messages.created }));
}

async function getActiveGiveaway(giveawayId) {
  return Giveaway.findOne({ _id: Number(giveawayId), status: 'active' });
}

async function handleCekilisJoin(interaction) {
  const giveawayId = interaction.customId.slice(CEK.buttons.joinPrefix.length);
  const giveaway = await getActiveGiveaway(giveawayId);

  if (!giveaway) {
    return interaction.reply(ephemeralPayload({ content: CEK.messages.notFound }));
  }

  if (new Date(giveaway.endsAt).getTime() <= Date.now()) {
    return interaction.reply(ephemeralPayload({ content: CEK.messages.notFound }));
  }

  const userId = interaction.user.id;
  const participants = giveaway.participants || [];

  if (participants.includes(userId)) {
    return interaction.reply(ephemeralPayload({ content: CEK.messages.alreadyJoined }));
  }

  participants.push(userId);
  giveaway.participants = participants;
  await giveaway.save();

  await interaction.deferUpdate();
  await updateGiveawayMessage(interaction.client, giveaway, false);

  return interaction.followUp(ephemeralPayload({ content: CEK.messages.joined }));
}

async function handleCekilisList(interaction) {
  const giveawayId = interaction.customId.slice(CEK.buttons.listPrefix.length);
  const giveaway = await Giveaway.findById(Number(giveawayId));

  if (!giveaway) {
    return interaction.reply(ephemeralPayload({ content: CEK.messages.notFound }));
  }

  const participants = giveaway.participants || [];
  if (!participants.length) {
    return interaction.reply(ephemeralPayload({ content: CEK.panel.listEmpty }));
  }

  const preview = participants.slice(0, CEK.limits.listPreview);
  const lines = preview.map((id, index) => `${index + 1}. <@${id}>`).join('\n');
  const extra =
    participants.length > CEK.limits.listPreview
      ? `\n\n_+${participants.length - CEK.limits.listPreview} kişi daha_`
      : '';

  return interaction.reply(
    ephemeralPayload({
      content: `${formatTemplate(CEK.panel.listTitle, { count: participants.length })}\n${lines}${extra}`,
    })
  );
}

module.exports = {
  executeCekilis,
  handleCekilisJoin,
  handleCekilisList,
  restoreActiveGiveaways,
};
