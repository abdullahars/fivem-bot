const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} = require('discord.js');
const { Counter } = require('../database/models/Counter');
const { getIds, getConfig } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');
const { buildMarkdownTable } = require('./userActivityService');
const CHANGELOG = require('../constants/changelog');

const changelogDrafts = new Map();

function draftKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function getDraftAuthorIds(guildId, userId) {
  return changelogDrafts.get(draftKey(guildId, userId))?.authorIds ?? [];
}

function setDraftAuthorIds(guildId, userId, authorIds) {
  changelogDrafts.set(draftKey(guildId, userId), { authorIds });
}

function clearDraft(guildId, userId) {
  changelogDrafts.delete(draftKey(guildId, userId));
}

function formatAuthorMentions(authorIds) {
  return authorIds.map((id) => `<@${id}>`).join(' ');
}

function formatVersion(seq) {
  if (seq <= 0) return '0.0';
  if (seq % 10 === 0) return `${seq / 10}.0`;
  const major = Math.floor(seq / 10);
  const minor = seq % 10;
  return `${major}.${minor}`;
}

async function getNextVersion(guildId) {
  const counter = await Counter.findByIdAndUpdate(
    `changelog_${guildId}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return formatVersion(counter.seq);
}

function buildMetaTable(version) {
  const P = CHANGELOG.panel;
  return buildMarkdownTable([P.colMetric, P.colValue], [[P.rowVersion, `v${version}`]]);
}

function buildChangelogContainer({ version, authorIds, timestamp, notes, title }) {
  const config = getConfig();
  const P = CHANGELOG.panel;
  const metaTable = buildMetaTable(version);
  const safeNotes = notes.length > 3800 ? `${notes.slice(0, 3797)}...` : notes;
  const authorsLine = formatAuthorMentions(
    (authorIds ?? []).filter((id) => id != null && String(id).length > 0)
  );

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${title}\n\n${P.tableTitle}\n${metaTable}\n` +
        `**${P.rowAuthor}:** ${authorsLine || '—'}\n` +
        `**${P.rowDate}:** <t:${timestamp}:F>\n\n` +
        `${P.notesTitle}\n${safeNotes}`
    )
  );

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  return container;
}

function buildEphemeralPanelPayload(selectedAuthorIds = []) {
  const config = getConfig();
  const P = CHANGELOG.panel;
  let panelText = `## ${P.title}\n${P.description}\n\n${P.authorsSelectHint}`;

  if (selectedAuthorIds.length) {
    panelText += `\n\n${formatTemplate(P.selectedAuthors, {
      authors: formatAuthorMentions(selectedAuthorIds),
    })}`;
  }

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) => td.setContent(panelText));

  container.addSeparatorComponents((sep) => sep);

  container.addActionRowComponents((row) =>
    row.addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(CHANGELOG.selects.authors)
        .setPlaceholder(P.authorsSelectPlaceholder)
        .setMinValues(1)
        .setMaxValues(25)
    )
  );

  container.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(CHANGELOG.buttons.openModal)
        .setLabel(P.openBtn)
        .setStyle(ButtonStyle.Primary)
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
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  };
}

function buildChangelogModal() {
  const modal = new ModalBuilder()
    .setCustomId(CHANGELOG.buttons.modal)
    .setTitle(CHANGELOG.modal.title);

  const input = new TextInputBuilder()
    .setCustomId(CHANGELOG.modal.notesId)
    .setLabel(CHANGELOG.modal.notesLabel)
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(10)
    .setMaxLength(4000)
    .setRequired(true)
    .setPlaceholder(CHANGELOG.modal.notesPlaceholder);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

async function publishChangelog(guild, authorIds, notes) {
  const ids = getIds();
  const channelId = ids.changelogChannelId;
  if (!channelId) {
    throw new Error('CHANNEL_MISSING');
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    throw new Error('CHANNEL_INVALID');
  }

  const version = await getNextVersion(guild.id);
  const timestamp = Math.floor(Date.now() / 1000);
  const container = buildChangelogContainer({
    version,
    authorIds,
    timestamp,
    notes,
    title: `${CHANGELOG.panel.publicTitle} v${version}`,
  });

  await channel.send({
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });

  return version;
}

async function executeChangelog(interaction) {
  const ids = getIds();
  if (!ids.changelogChannelId) {
    return interaction.reply(
      ephemeralPayload({ content: CHANGELOG.messages.channelMissing })
    );
  }

  return interaction.reply(buildEphemeralPanelPayload());
}

async function handleChangelogAuthorsSelect(interaction) {
  const authorIds = interaction.values;
  setDraftAuthorIds(interaction.guild.id, interaction.user.id, authorIds);
  return interaction.update(buildEphemeralPanelPayload(authorIds));
}

async function handleChangelogOpen(interaction) {
  const authorIds = getDraftAuthorIds(interaction.guild.id, interaction.user.id);
  if (!authorIds.length) {
    return interaction.reply(
      ephemeralPayload({ content: CHANGELOG.messages.noAuthorsSelected })
    );
  }

  return interaction.showModal(buildChangelogModal());
}

async function handleChangelogModal(interaction) {
  const authorIds = getDraftAuthorIds(interaction.guild.id, interaction.user.id);
  if (!authorIds.length) {
    return interaction.reply(
      ephemeralPayload({ content: CHANGELOG.messages.noAuthorsSelected })
    );
  }

  const notes = interaction.fields.getTextInputValue(CHANGELOG.modal.notesId)?.trim();
  if (!notes || notes.length < 10) {
    return interaction.reply(
      ephemeralPayload({ content: CHANGELOG.messages.notesTooShort })
    );
  }

  await interaction.deferReply(ephemeralPayload());

  try {
    const version = await publishChangelog(interaction.guild, authorIds, notes);
    clearDraft(interaction.guild.id, interaction.user.id);
    return interaction.editReply(
      ephemeralPayload({
        content: formatTemplate(CHANGELOG.messages.published, { version }),
      })
    );
  } catch (err) {
    console.error('[Changelog]', err?.message || err);
    const content =
      err.message === 'CHANNEL_MISSING' || err.message === 'CHANNEL_INVALID'
        ? CHANGELOG.messages.channelMissing
        : CHANGELOG.messages.publishFailed;
    return interaction.editReply(ephemeralPayload({ content }));
  }
}

module.exports = {
  executeChangelog,
  handleChangelogAuthorsSelect,
  handleChangelogOpen,
  handleChangelogModal,
};
