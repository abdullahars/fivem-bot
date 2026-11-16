const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { getConfig } = require('../config/loadConfig');
const { baseEmbed } = require('../utils/embedBuilder');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');
const {
  canManageEkip,
  canManageEkipAllowedRoles,
  isStaff,
} = require('../utils/permissions');
const EKIP = require('../constants/ekip');
const {
  createEkip,
  findOpenEkipByName,
  listOpenEkips,
  getEkipById,
  getRoleMemberCount,
  applyBossRole,
  removeBossRole,
  formatYardimLabel,
  formatSinirsizChannel,
  getSinirsizChannelLabel,
  sendEkipLog,
  finalizeEkipClose,
  buildEkipPanel,
} = require('./ekipService');
const { buildMeslekMapByEkipId } = require('./meslekService');
const {
  appendEkipAction,
  formatActionLogsText,
  getActionLogs,
} = require('./ekipActionLogService');

const UI = EKIP.bilgiUi;
const MAX_PERM_DISPLAY = 40;

async function refreshChannelEkipPanel(guild, ekip) {
  if (!ekip.panelMessageId || !ekip.textChannelId) return;
  const channel = await guild.channels.fetch(ekip.textChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  const msg = await channel.messages.fetch(ekip.panelMessageId).catch(() => null);
  if (!msg) return;
  await msg.edit(buildEkipPanel(ekip)).catch(() => {});
}

function formatDateTR(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
}

function countRoleMembersCached(guild, roleId) {
  const role = guild.roles.cache.get(roleId);
  if (!role) return 0;
  return role.members?.size ?? 0;
}

async function getPermMembers(guild, roleId) {
  const role =
    guild.roles.cache.get(roleId) ||
    (await guild.roles.fetch(roleId).catch(() => null));
  if (!role) return [];

  return [...role.members.values()]
    .filter((m) => !m.user.bot)
    .sort((a, b) =>
      (a.displayName || a.user.username).localeCompare(
        b.displayName || b.user.username,
        'tr'
      )
    );
}

function formatPermMemberList(members) {
  if (!members.length) return UI.permEmpty;

  const shown = members.slice(0, MAX_PERM_DISPLAY);
  let text = shown.map((m) => `• ${m}`).join('\n');

  if (members.length > MAX_PERM_DISPLAY) {
    text += `\n${formatTemplate(UI.permMore, {
      count: members.length - MAX_PERM_DISPLAY,
    })}`;
  }

  return text;
}

function getWarnings(ekip) {
  return Array.isArray(ekip.warnings) ? ekip.warnings : [];
}

function nextWarnNo(warnings) {
  return warnings.reduce((max, w) => Math.max(max, w.no || 0), 0) + 1;
}

function buildWarningsSection(ekip) {
  const warnings = getWarnings(ekip);
  if (!warnings.length) {
    return `${UI.warnSectionTitle}\n${UI.warnEmpty}`;
  }

  const active = warnings.filter((w) => w.active !== false);
  const removed = warnings.filter((w) => w.active === false);

  let text = `${UI.warnSectionTitle}\n${UI.warnActiveTitle}\n`;
  text += active.length
    ? active
        .map((w) =>
          formatTemplate(UI.warnLine, {
            no: w.no,
            by: `<@${w.byId}>`,
            date: formatDateTR(w.at),
            desc: w.desc,
          })
        )
        .join('\n')
    : UI.warnEmpty;

  if (removed.length) {
    text += `\n\n${UI.warnHistoryTitle}\n`;
    text += removed
      .map((w) =>
        formatTemplate(UI.warnRemovedLine, {
          no: w.no,
          by: `<@${w.byId}>`,
          date: formatDateTR(w.at),
          desc: w.desc,
          removedBy: w.removedById ? `<@${w.removedById}>` : '—',
          removedDate: w.removedAt ? formatDateTR(w.removedAt) : '—',
        })
      )
      .join('\n');
  }

  return text;
}

async function logEkipWarn(guild, ekip, mode, data) {
  const isAdd = mode === 'add';
  const logEmbed = baseEmbed()
    .setTitle(isAdd ? EKIP.log.warnAddTitle : EKIP.log.warnRemoveTitle)
    .addFields(
      { name: 'Ekip', value: ekip.name, inline: true },
      { name: 'Uyarı No', value: `#${data.no}`, inline: true },
      {
        name: isAdd ? 'Uyarı Veren' : 'Kaldıran',
        value: `<@${data.byId}>`,
        inline: true,
      },
      { name: 'Uyarı Açıklaması', value: data.desc || '—', inline: false }
    );
  await sendEkipLog(guild, logEmbed);
}

function buildEkipBilgiBlock(ekip, { meslekMap, guild }) {
  const P = EKIP.messages;
  const permCount = countRoleMembersCached(guild, ekip.roleId);
  const bossId = ekip.bossId || ekip.ownerId;
  const acan = ekip.createdById ? `<@${ekip.createdById}>` : '—';
  const channel = formatSinirsizChannel(guild, ekip);
  const meslekler = meslekMap.get(String(ekip._id))?.join(', ') || '—';
  const referans = ekip.referansId ? `<@${ekip.referansId}>` : '—';
  const aktifUyari = getWarnings(ekip).filter((w) => w.active !== false).length;

  let block =
    `### ${ekip.name}\n\n` +
    `**${P.bilgiSinirsizField}:** ${channel}\n` +
    `**${P.bilgiMeslekField}:** ${meslekler}\n\n` +
    `**Boss:** <@${bossId}> · **Yardım:** ${formatYardimLabel(ekip.yardimYapildi)} · **Perm:** ${permCount} kişi\n` +
    `**Açan:** ${acan} · **Rol:** <@&${ekip.roleId}>\n` +
    `**Referans:** ${referans} · **Aktif Uyarı:** ${aktifUyari}\n` +
    `-# ${formatDateTR(ekip.createdAt)}`;

  if (getWarnings(ekip).length) {
    block += `\n\n${buildWarningsSection(ekip)}`;
  }

  return block;
}

function chunkEkips(ekips, size) {
  const chunks = [];
  for (let i = 0; i < ekips.length; i += size) {
    chunks.push(ekips.slice(i, i + size));
  }
  return chunks;
}

function bilgiPanelFlags() {
  return MessageFlags.IsComponentsV2;
}

/** deferUpdate sonrası editReply; aksi halde update */
function patchBilgiInteraction(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.update(payload);
}

async function buildEkipBilgiPanelPayload(ekip, { notice, guild } = {}) {
  const config = getConfig();
  const P = EKIP.messages;
  const meslekMap = await buildMeslekMapByEkipId(guild.id);
  const permMembers = await getPermMembers(guild, ekip.roleId);

  let header = `## ${P.bilgiTitle}`;
  if (notice) {
    header += `\n\n${notice}`;
  }

  const infoBlock = buildEkipBilgiBlock(ekip, { meslekMap, guild });
  const permList = formatPermMemberList(permMembers);

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) => td.setContent(header));

  container.addSeparatorComponents((sep) => sep);
  container.addTextDisplayComponents((td) => td.setContent(infoBlock));

  container.addSeparatorComponents((sep) => sep);
  container.addTextDisplayComponents((td) =>
    td.setContent(`**${UI.permField}:**\n${permList}`)
  );

  container.addSeparatorComponents((sep) => sep);
  container.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${UI.warnAddBtnPrefix}${ekip._id}`)
        .setLabel(UI.warnAddBtn)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${UI.warnRemoveBtnPrefix}${ekip._id}`)
        .setLabel(UI.warnRemoveBtn)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  container.addSeparatorComponents((sep) => sep);

  container.addTextDisplayComponents((td) => td.setContent(UI.panelSectionYardim));
  container.addActionRowComponents((row) =>
    row.setComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${UI.yardimSelectPrefix}${ekip._id}`)
        .setPlaceholder(UI.yardimSelectPlaceholder)
        .addOptions(
          {
            label: UI.yardimDoneBtn,
            description: UI.yardimDoneOptionDesc,
            value: '1',
            default: ekip.yardimYapildi === true,
          },
          {
            label: UI.yardimPendingBtn,
            description: UI.yardimPendingOptionDesc,
            value: '0',
            default: ekip.yardimYapildi !== true,
          }
        )
    )
  );

  container.addActionRowComponents((row) =>
    row.setComponents(
      new ButtonBuilder()
        .setCustomId(`${EKIP.buttons.closePrefix}${ekip._id}`)
        .setLabel(UI.closeBtn)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`${EKIP.buttons.addMemberPrefix}${ekip._id}`)
        .setLabel(UI.addMemberBtn)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${UI.idToplaBtnPrefix}${ekip._id}`)
        .setLabel(UI.idToplaBtn)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${UI.bossBtnPrefix}${ekip._id}`)
        .setLabel(UI.bossBtn)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${UI.islemBtnPrefix}${ekip._id}`)
        .setLabel(UI.islemBtn)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  const imageUrl = config.panel?.imageUrl?.trim();
  if (imageUrl) {
    container.addSeparatorComponents((sep) => sep);
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) => item.setURL(imageUrl).setDescription(P.bilgiTitle))
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
    flags: bilgiPanelFlags(),
  };
}

async function buildIslemlerPanelPayload(ekip, guild, { limit, notice } = {}) {
  const showLimit = limit || UI.islemInitialLimit;
  const total = getActionLogs(ekip).length;
  const shown = Math.min(showLimit, total);
  const config = getConfig();

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  let header = `## ${UI.islemTitle}\n\n${formatTemplate(UI.islemSummary, {
    name: ekip.name,
    shown: String(shown),
    total: String(total),
  })}`;
  if (notice) header += `\n\n${notice}`;

  container.addTextDisplayComponents((td) => td.setContent(header));
  container.addSeparatorComponents((sep) => sep);
  container.addTextDisplayComponents((td) =>
    td.setContent(formatActionLogsText(ekip, showLimit))
  );
  container.addSeparatorComponents((sep) => sep);

  const buttons = [
    new ButtonBuilder()
      .setCustomId(`${UI.islemBackBtnPrefix}${ekip._id}`)
      .setLabel(UI.islemBackBtn)
      .setStyle(ButtonStyle.Primary),
  ];

  if (total > showLimit && showLimit < UI.islemExpandedLimit) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`${UI.islemMoreBtnPrefix}${ekip._id}`)
        .setLabel(UI.islemMoreBtn)
        .setStyle(ButtonStyle.Secondary)
    );
  }

  container.addActionRowComponents((row) => row.setComponents(...buttons));

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  return {
    embeds: [],
    components: [container],
    flags: bilgiPanelFlags(),
  };
}

function buildBilgiBossSelectPayload(ekip, guild) {
  const config = getConfig();
  const channel = formatSinirsizChannel(guild, ekip);

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${EKIP.messages.bilgiTitle}\n\n` +
        `**Ekip:** ${ekip.name}\n**Sınırsız kanal:** ${channel}\n\n${UI.bossSelectHint}`
    )
  );

  container.addSeparatorComponents((sep) => sep);

  container.addActionRowComponents((row) =>
    row.addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`${UI.bossSelectPrefix}${ekip._id}`)
        .setPlaceholder(UI.bossSelectPlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
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
    flags: bilgiPanelFlags(),
  };
}

function bilgiErrorPayload(content) {
  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );
  container.addTextDisplayComponents((td) => td.setContent(content));
  return {
    embeds: [],
    components: [container],
    flags: bilgiPanelFlags(),
  };
}

async function logEkipEdit(guild, ekip, editorId, changes) {
  const logEmbed = baseEmbed()
    .setTitle(EKIP.log.editTitle)
    .addFields(
      { name: 'Ekip', value: ekip.name, inline: true },
      { name: 'Düzenleyen', value: `<@${editorId}>`, inline: true },
      { name: 'Değişiklikler', value: changes.join('\n'), inline: false }
    );
  await sendEkipLog(guild, logEmbed);
}

async function applyYardimUpdate(interaction, ekipId, yapildi) {
  const ekip = await getEkipById(ekipId);
  if (!ekip || ekip.status !== 'open') {
    return patchBilgiInteraction(interaction, bilgiErrorPayload(EKIP.messages.notFound));
  }

  if (ekip.yardimYapildi === yapildi) {
    return patchBilgiInteraction(
      interaction,
      await buildEkipBilgiPanelPayload(ekip, {
        notice: 'ℹ️ Yardım durumu zaten bu şekilde.',
        guild: interaction.guild,
      })
    );
  }

  ekip.yardimYapildi = yapildi;
  await ekip.save();
  await appendEkipAction(ekip, {
    byId: interaction.user.id,
    byTag: interaction.user.tag,
    text: formatTemplate(EKIP.messages.islemYardim, {
      status: formatYardimLabel(yapildi),
    }),
  });
  await refreshChannelEkipPanel(interaction.guild, ekip);
  await logEkipEdit(interaction.guild, ekip, interaction.user.id, [
    `Yardım → ${formatYardimLabel(yapildi)}`,
  ]);

  return patchBilgiInteraction(
    interaction,
    await buildEkipBilgiPanelPayload(ekip, {
      notice: formatTemplate(EKIP.messages.updated, { name: ekip.name }),
      guild: interaction.guild,
    })
  );
}

async function applyBossUpdate(interaction, ekipId, newUserId) {
  const ekip = await getEkipById(ekipId);
  if (!ekip || ekip.status !== 'open') {
    return patchBilgiInteraction(interaction, bilgiErrorPayload(EKIP.messages.notFound));
  }

  const oldBossId = ekip.bossId || ekip.ownerId;
  if (newUserId === oldBossId) {
    return patchBilgiInteraction(
      interaction,
      await buildEkipBilgiPanelPayload(ekip, {
        notice: 'ℹ️ Seçilen kullanıcı zaten boss.',
        guild: interaction.guild,
      })
    );
  }

  const member = await interaction.guild.members.fetch(newUserId).catch(() => null);
  if (!member) {
    return patchBilgiInteraction(
      interaction,
      bilgiErrorPayload('❌ Kullanıcı sunucuda bulunamadı.')
    );
  }

  ekip.bossId = newUserId;
  await applyBossRole(interaction.guild, newUserId);
  if (oldBossId !== ekip.ownerId) {
    await removeBossRole(interaction.guild, oldBossId);
  }
  await ekip.save();
  await appendEkipAction(ekip, {
    byId: interaction.user.id,
    byTag: interaction.user.tag,
    text: formatTemplate(EKIP.messages.islemBoss, { user: `<@${newUserId}>` }),
  });
  await refreshChannelEkipPanel(interaction.guild, ekip);
  await logEkipEdit(interaction.guild, ekip, interaction.user.id, [`Boss → <@${newUserId}>`]);

  return patchBilgiInteraction(
    interaction,
    await buildEkipBilgiPanelPayload(ekip, {
      notice: formatTemplate(EKIP.messages.updated, { name: ekip.name }),
      guild: interaction.guild,
    })
  );
}

async function buildEkiplerListPayloads(guild, ekips) {
  const P = EKIP.messages;
  const meslekMap = await buildMeslekMapByEkipId(guild.id);
  const config = getConfig();
  const perPage = UI.ekiplerPerPage || 20;
  const ekipChunks = chunkEkips(ekips, perPage);
  const payloads = [];

  for (let page = 0; page < ekipChunks.length; page += 1) {
    const slice = ekipChunks[page];

    let header = `## ${UI.ekiplerListTitle}`;
    header += `\n${formatTemplate(P.ekiplerSummary, { count: ekips.length })}`;
    if (ekipChunks.length > 1) {
      header += `\n${formatTemplate(P.bilgiPageNote, {
        page: page + 1,
        total: ekipChunks.length,
      })}`;
    }

    const container = new ContainerBuilder().setAccentColor(
      parseEmbedColor(config.bot.embedColor)
    );

    container.addTextDisplayComponents((td) => td.setContent(header));
    container.addSeparatorComponents((sep) => sep.setDivider(true));

    slice.forEach((ekip, idx) => {
      if (idx > 0) {
        container.addSeparatorComponents((sep) => sep.setDivider(true));
      }
      const infoBlock = buildEkipBilgiBlock(ekip, { meslekMap, guild });
      container.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((td) => td.setContent(infoBlock))
          .setButtonAccessory((button) =>
            button
              .setCustomId(`${UI.ekiplerEditBtnPrefix}${ekip._id}`)
              .setLabel(UI.ekiplerEditBtn)
              .setStyle(ButtonStyle.Primary)
          )
      );
    });

    const imageUrl = config.panel?.imageUrl?.trim();
    if (imageUrl && page === ekipChunks.length - 1) {
      container.addSeparatorComponents((sep) => sep);
      container.addMediaGalleryComponents((gallery) =>
        gallery.addItems((item) => item.setURL(imageUrl).setDescription(P.bilgiTitle))
      );
    }

    if (config.bot.footer?.trim()) {
      container.addSeparatorComponents((sep) => sep.setDivider(false));
      container.addTextDisplayComponents((td) =>
        td.setContent(`-# ${config.bot.footer}`)
      );
    }

    payloads.push({
      embeds: [],
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  return payloads;
}

async function handleEkiplerEditButton(interaction) {
  if (!canManageEkip(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.noPermission }));
  }

  const ekipId = interaction.customId.slice(UI.ekiplerEditBtnPrefix.length);
  const ekip = await getEkipById(ekipId);
  if (!ekip || ekip.status !== 'open') {
    return interaction.update(bilgiErrorPayload(EKIP.messages.notFound));
  }

  const payload = await buildEkipBilgiPanelPayload(ekip, {
    guild: interaction.guild,
  });
  return interaction.update(payload);
}

async function executeEkipler(interaction) {
  if (!canManageEkip(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.noPermission }));
  }

  const filterName = interaction.options.getString(EKIP.ekipler.optionIsim.name);
  await interaction.deferReply(ephemeralPayload());

  let ekips;
  if (filterName?.trim()) {
    const one = await findOpenEkipByName(interaction.guild.id, filterName);
    ekips = one ? [one] : [];
  } else {
    ekips = await listOpenEkips(interaction.guild.id);
  }

  if (!ekips.length) {
    return interaction.editReply({
      content: filterName ? EKIP.messages.notFound : EKIP.messages.bilgiEmpty,
    });
  }

  const payloads = await buildEkiplerListPayloads(interaction.guild, ekips);
  await interaction.editReply(payloads[0]);

  for (let i = 1; i < payloads.length; i += 1) {
    await interaction.followUp(payloads[i]);
  }
}

async function handleBilgiYardimSelect(interaction) {
  if (!canManageEkipAllowedRoles(interaction.member)) {
    return interaction.reply(
      ephemeralPayload({ content: EKIP.messages.noPermissionAllowed })
    );
  }

  const ekipId = interaction.customId.slice(UI.yardimSelectPrefix.length);
  const yapildi = interaction.values[0] === '1';
  await interaction.deferUpdate();
  return applyYardimUpdate(interaction, ekipId, yapildi);
}

async function handleWarnAddButton(interaction) {
  if (!canManageEkipAllowedRoles(interaction.member)) {
    return interaction.reply(
      ephemeralPayload({ content: EKIP.messages.noPermissionAllowed })
    );
  }

  const ekipId = interaction.customId.slice(UI.warnAddBtnPrefix.length);
  const ekip = await getEkipById(ekipId);
  if (!ekip || ekip.status !== 'open') {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.notFound }));
  }

  const modal = new ModalBuilder()
    .setCustomId(`${UI.warnAddModalPrefix}${ekipId}`)
    .setTitle(UI.warnAddModalTitle)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(UI.warnDescInputId)
          .setLabel(UI.warnDescLabel)
          .setPlaceholder(UI.warnDescPlaceholder)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500)
      )
    );

  return interaction.showModal(modal);
}

async function handleWarnAddModal(interaction) {
  if (!canManageEkipAllowedRoles(interaction.member)) {
    return interaction.reply(
      ephemeralPayload({ content: EKIP.messages.noPermissionAllowed })
    );
  }

  const ekipId = interaction.customId.slice(UI.warnAddModalPrefix.length);
  const ekip = await getEkipById(ekipId);
  if (!ekip || ekip.status !== 'open') {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.notFound }));
  }

  const desc = (interaction.fields.getTextInputValue(UI.warnDescInputId) || '').trim();
  if (!desc) {
    return interaction.reply(ephemeralPayload({ content: '❌ Açıklama boş olamaz.' }));
  }

  const warnings = getWarnings(ekip);
  const no = nextWarnNo(warnings);
  warnings.push({
    no,
    byId: interaction.user.id,
    byTag: interaction.user.tag,
    desc,
    at: new Date().toISOString(),
    active: true,
  });
  ekip.warnings = warnings;
  await ekip.save();
  await appendEkipAction(ekip, {
    byId: interaction.user.id,
    byTag: interaction.user.tag,
    text: formatTemplate(EKIP.messages.islemWarnAdd, { no }),
  });

  await logEkipWarn(interaction.guild, ekip, 'add', {
    no,
    desc,
    byId: interaction.user.id,
  });

  await interaction.deferUpdate();
  return patchBilgiInteraction(
    interaction,
    await buildEkipBilgiPanelPayload(ekip, {
      notice: formatTemplate(UI.warnAddedNotice, { no }),
      guild: interaction.guild,
    })
  );
}

async function handleWarnRemoveButton(interaction) {
  if (!canManageEkipAllowedRoles(interaction.member)) {
    return interaction.reply(
      ephemeralPayload({ content: EKIP.messages.noPermissionAllowed })
    );
  }

  const ekipId = interaction.customId.slice(UI.warnRemoveBtnPrefix.length);
  const ekip = await getEkipById(ekipId);
  if (!ekip || ekip.status !== 'open') {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.notFound }));
  }

  const modal = new ModalBuilder()
    .setCustomId(`${UI.warnRemoveModalPrefix}${ekipId}`)
    .setTitle(UI.warnRemoveModalTitle)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(UI.warnNoInputId)
          .setLabel(UI.warnNoLabel)
          .setPlaceholder(UI.warnNoPlaceholder)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(6)
      )
    );

  return interaction.showModal(modal);
}

async function handleWarnRemoveModal(interaction) {
  if (!canManageEkipAllowedRoles(interaction.member)) {
    return interaction.reply(
      ephemeralPayload({ content: EKIP.messages.noPermissionAllowed })
    );
  }

  const ekipId = interaction.customId.slice(UI.warnRemoveModalPrefix.length);
  const ekip = await getEkipById(ekipId);
  if (!ekip || ekip.status !== 'open') {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.notFound }));
  }

  const raw = interaction.fields.getTextInputValue(UI.warnNoInputId) || '';
  const no = parseInt(String(raw).replace(/\D/g, ''), 10);
  if (!no) {
    return interaction.reply(ephemeralPayload({ content: UI.warnInvalidNo }));
  }

  const warnings = getWarnings(ekip);
  const warn = warnings.find((w) => w.no === no && w.active !== false);
  if (!warn) {
    return interaction.reply(ephemeralPayload({ content: UI.warnNotFound }));
  }

  warn.active = false;
  warn.removedById = interaction.user.id;
  warn.removedByTag = interaction.user.tag;
  warn.removedAt = new Date().toISOString();
  ekip.warnings = warnings;
  await ekip.save();
  await appendEkipAction(ekip, {
    byId: interaction.user.id,
    byTag: interaction.user.tag,
    text: formatTemplate(EKIP.messages.islemWarnRemove, { no }),
  });

  await logEkipWarn(interaction.guild, ekip, 'remove', {
    no,
    desc: warn.desc,
    byId: interaction.user.id,
  });

  await interaction.deferUpdate();
  return patchBilgiInteraction(
    interaction,
    await buildEkipBilgiPanelPayload(ekip, {
      notice: formatTemplate(UI.warnRemovedNotice, { no }),
      guild: interaction.guild,
    })
  );
}

async function handleBilgiButton(interaction) {
  const id = interaction.customId;

  if (id.startsWith(UI.bossBtnPrefix)) {
    if (!canManageEkipAllowedRoles(interaction.member)) {
      return interaction.reply(
        ephemeralPayload({ content: EKIP.messages.noPermissionAllowed })
      );
    }
    const ekipId = id.slice(UI.bossBtnPrefix.length);
    const ekip = await getEkipById(ekipId);
    if (!ekip || ekip.status !== 'open') {
      return interaction.update(bilgiErrorPayload(EKIP.messages.notFound));
    }

    return interaction.update(buildBilgiBossSelectPayload(ekip, interaction.guild));
  }

  if (id.startsWith(UI.idToplaBtnPrefix)) {
    if (!isStaff(interaction.member)) {
      return interaction.reply(
        ephemeralPayload({ content: EKIP.messages.noPermissionStaff })
      );
    }
    const ekipId = id.slice(UI.idToplaBtnPrefix.length);
    const ekip = await getEkipById(ekipId);
    if (!ekip || ekip.status !== 'open') {
      return interaction.reply(ephemeralPayload({ content: EKIP.messages.notFound }));
    }

    const members = await getPermMembers(interaction.guild, ekip.roleId);
    if (!members.length) {
      return interaction.reply(ephemeralPayload({ content: UI.idToplaEmpty }));
    }

    const ids = members.map((m) => m.id).join('\n');
    return interaction.reply(
      ephemeralPayload({
        content: `${formatTemplate(UI.idToplaTitle, {
          name: ekip.name,
          count: members.length,
        })}\n\`\`\`\n${ids}\n\`\`\``,
      })
    );
  }

  if (id.startsWith(UI.islemBtnPrefix)) {
    if (!canManageEkip(interaction.member)) {
      return interaction.reply(
        ephemeralPayload({ content: EKIP.messages.noPermission })
      );
    }
    const ekipId = id.slice(UI.islemBtnPrefix.length);
    const ekip = await getEkipById(ekipId);
    if (!ekip || ekip.status !== 'open') {
      return interaction.update(bilgiErrorPayload(EKIP.messages.notFound));
    }

    return interaction.update(
      await buildIslemlerPanelPayload(ekip, interaction.guild, {
        limit: UI.islemInitialLimit,
      })
    );
  }

  if (id.startsWith(UI.islemMoreBtnPrefix)) {
    if (!canManageEkip(interaction.member)) {
      return interaction.reply(
        ephemeralPayload({ content: EKIP.messages.noPermission })
      );
    }
    const ekipId = id.slice(UI.islemMoreBtnPrefix.length);
    const ekip = await getEkipById(ekipId);
    if (!ekip || ekip.status !== 'open') {
      return interaction.update(bilgiErrorPayload(EKIP.messages.notFound));
    }

    return interaction.update(
      await buildIslemlerPanelPayload(ekip, interaction.guild, {
        limit: UI.islemExpandedLimit,
      })
    );
  }

  if (id.startsWith(UI.islemBackBtnPrefix)) {
    if (!canManageEkip(interaction.member)) {
      return interaction.reply(
        ephemeralPayload({ content: EKIP.messages.noPermission })
      );
    }
    const ekipId = id.slice(UI.islemBackBtnPrefix.length);
    const ekip = await getEkipById(ekipId);
    if (!ekip || ekip.status !== 'open') {
      return interaction.update(bilgiErrorPayload(EKIP.messages.notFound));
    }

    return interaction.update(
      await buildEkipBilgiPanelPayload(ekip, { guild: interaction.guild })
    );
  }
}

async function handleBilgiBossSelect(interaction) {
  if (!canManageEkipAllowedRoles(interaction.member)) {
    return interaction.reply(
      ephemeralPayload({ content: EKIP.messages.noPermissionAllowed })
    );
  }

  const ekipId = interaction.customId.slice(UI.bossSelectPrefix.length);
  const newUserId = interaction.values[0];
  await interaction.deferUpdate();
  return applyBossUpdate(interaction, ekipId, newUserId);
}

async function executeOlustur(interaction) {
  if (!canManageEkipAllowedRoles(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.noPermissionAllowed }));
  }

  const name = interaction.options.getString(EKIP.command.optionName, true);
  const owner = interaction.options.getUser(EKIP.command.optionOwner, true);

  return createEkip(interaction, name, owner);
}

async function executeKapat(interaction) {
  if (!canManageEkipAllowedRoles(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.noPermissionAllowed }));
  }

  const ekipName = interaction.options.getString(EKIP.slash.options.ekip.name, true);
  const ekip = await findOpenEkipByName(interaction.guild.id, ekipName);

  if (!ekip) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.notFound }));
  }

  await interaction.reply(ephemeralPayload({ content: '⏳ Ekip kapatılıyor...' }));
  await finalizeEkipClose(interaction.guild, ekip, interaction.user.id);

  return interaction.editReply({ content: EKIP.messages.closed });
}

module.exports = {
  executeEkipler,
  executeOlustur,
  executeKapat,
  handleBilgiButton,
  handleBilgiBossSelect,
  handleBilgiYardimSelect,
  handleEkiplerEditButton,
  handleWarnAddButton,
  handleWarnAddModal,
  handleWarnRemoveButton,
  handleWarnRemoveModal,
};
