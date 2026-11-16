const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
} = require('discord.js');
const { getConfig } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const { applyButtonEmoji } = require('../utils/buttonEmoji');
const { buildMarkdownTable } = require('./userActivityService');
const { ephemeralPayload } = require('../utils/interaction');
const OYL = require('../constants/oylama');

const activePolls = new Map();
const pollTimers = new Map();

function generatePollId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function getVoteCounts(poll) {
  return {
    option1: poll.votes.option1.size,
    option2: poll.votes.option2.size,
  };
}

function isValidLabel(label) {
  const text = label?.trim();
  return (
    text &&
    text.length >= OYL.limits.labelMin &&
    text.length <= OYL.limits.labelMax
  );
}

function buildPollQuestion(poll) {
  const P = OYL.panel;
  return `${P.questionLabel}\n\n# ${poll.description}`;
}

function buildPollDetails(poll) {
  const P = OYL.panel;
  const counts = getVoteCounts(poll);
  const total = counts.option1 + counts.option2;
  const ended = Date.now() >= poll.endsAt;

  const voteTable = buildMarkdownTable(
    [P.colOption, P.colVotes],
    [
      [`${OYL.emojis.evet} ${poll.option1Label}`, String(counts.option1)],
      [`${OYL.emojis.hayir} ${poll.option2Label}`, String(counts.option2)],
    ]
  );

  const status = ended ? P.statusEnded : P.statusActive;

  return (
    `${P.title}\n\n` +
    `${status}\n` +
    `${formatTemplate(P.endsAt, { time: `<t:${Math.floor(poll.endsAt / 1000)}:R>` })}\n` +
    `${formatTemplate(P.createdBy, { user: `<@${poll.creatorId}>` })}\n` +
    `${formatTemplate(P.totalVotes, { count: total })}\n\n` +
    `${P.votesTitle}\n${voteTable}`
  );
}

function buildPollButtons(poll, disabled = false) {
  const option1Btn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId(`${OYL.buttons.option1Prefix}${poll.id}`)
      .setLabel(poll.option1Label)
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    OYL.emojis.evet
  );

  const option2Btn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId(`${OYL.buttons.option2Prefix}${poll.id}`)
      .setLabel(poll.option2Label)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    OYL.emojis.hayir
  );

  return [new ActionRowBuilder().addComponents(option1Btn, option2Btn)];
}

function buildPollPayload(poll, disabled = false) {
  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) => td.setContent(buildPollQuestion(poll)));

  container.addSeparatorComponents((sep) => sep);

  container.addTextDisplayComponents((td) => td.setContent(buildPollDetails(poll)));

  if (!disabled) {
    container.addSeparatorComponents((sep) => sep);
    container.addActionRowComponents((row) =>
      row.addComponents(...buildPollButtons(poll, false)[0].components)
    );
  } else {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${OYL.labels.ended}`)
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

async function updatePollMessage(client, poll, disabled = false) {
  const channel = await client.channels.fetch(poll.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return;

  const message = await channel.messages.fetch(poll.messageId).catch(() => null);
  if (!message) return;

  await message.edit(buildPollPayload(poll, disabled));
}

function clearPollTimer(pollId) {
  const timer = pollTimers.get(pollId);
  if (timer) {
    clearTimeout(timer);
    pollTimers.delete(pollId);
  }
}

function schedulePollEnd(client, poll) {
  clearPollTimer(poll.id);

  const delay = Math.max(0, poll.endsAt - Date.now());
  const timer = setTimeout(async () => {
    pollTimers.delete(poll.id);
    const current = activePolls.get(poll.id);
    if (!current) return;

    try {
      await updatePollMessage(client, current, true);
    } catch (err) {
      console.error('[Oylama] Bitiş güncellemesi:', err?.message || err);
    } finally {
      activePolls.delete(poll.id);
    }
  }, delay);

  pollTimers.set(poll.id, timer);
}

function toggleVote(poll, userId, choice) {
  const other = choice === 'option1' ? 'option2' : 'option1';
  const sameSet = poll.votes[choice];
  const otherSet = poll.votes[other];

  if (sameSet.has(userId)) {
    sameSet.delete(userId);
    return 'removed';
  }

  otherSet.delete(userId);
  sameSet.add(userId);
  return 'recorded';
}

async function executeOylama(interaction) {
  const description = interaction.options.getString(OYL.options.aciklama.name)?.trim();
  const minutes = interaction.options.getInteger(OYL.options.sure.name);
  const option1Label = interaction.options.getString(OYL.options.buton1.name)?.trim();
  const option2Label = interaction.options.getString(OYL.options.buton2.name)?.trim();

  if (!interaction.channel?.isTextBased?.() || interaction.channel.isDMBased()) {
    return interaction.reply(ephemeralPayload({ content: OYL.messages.notTextChannel }));
  }

  if (
    !description ||
    minutes == null ||
    minutes < OYL.limits.minMinutes ||
    minutes > OYL.limits.maxMinutes
  ) {
    return interaction.reply(ephemeralPayload({ content: OYL.messages.invalidDuration }));
  }

  if (
    !isValidLabel(option1Label) ||
    !isValidLabel(option2Label) ||
    option1Label.toLowerCase() === option2Label.toLowerCase()
  ) {
    return interaction.reply(ephemeralPayload({ content: OYL.messages.invalidLabels }));
  }

  const pollId = generatePollId();
  const poll = {
    id: pollId,
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    messageId: null,
    creatorId: interaction.user.id,
    description,
    option1Label,
    option2Label,
    endsAt: Date.now() + minutes * 60 * 1000,
    votes: {
      option1: new Set(),
      option2: new Set(),
    },
  };

  const message = await interaction.channel.send(buildPollPayload(poll));
  poll.messageId = message.id;
  activePolls.set(pollId, poll);
  schedulePollEnd(interaction.client, poll);

  return interaction.reply(ephemeralPayload({ content: OYL.messages.created }));
}

async function handleOylamaVote(interaction, choice) {
  const pollId = interaction.customId.slice(
    choice === 'option1'
      ? OYL.buttons.option1Prefix.length
      : OYL.buttons.option2Prefix.length
  );
  const poll = activePolls.get(pollId);

  if (!poll) {
    return interaction.reply(ephemeralPayload({ content: OYL.messages.pollNotFound }));
  }

  if (Date.now() >= poll.endsAt) {
    activePolls.delete(pollId);
    return interaction.reply(ephemeralPayload({ content: OYL.messages.pollEnded }));
  }

  await interaction.deferUpdate();

  try {
    const result = toggleVote(poll, interaction.user.id, choice);
    await updatePollMessage(interaction.client, poll);

    const content =
      result === 'removed' ? OYL.messages.voteRemoved : OYL.messages.voteRecorded;

    return interaction.followUp(ephemeralPayload({ content }));
  } catch (err) {
    console.error('[Oylama]', err?.message || err);
    return interaction.followUp(ephemeralPayload({ content: OYL.messages.failed }));
  }
}

module.exports = {
  executeOylama,
  handleOylamaVote,
};
