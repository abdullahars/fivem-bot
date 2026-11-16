const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const {
  getConfig,
  getConfigValue,
  setConfigValue,
  getOwnerIds,
} = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { ephemeralPayload } = require('../utils/interaction');
const {
  formatRoleMention,
  formatRoleList,
  formatChannelMention,
  collectRoleIds,
} = require('../utils/roleDisplay');
const CFG = require('../constants/configSchema');

function isOwner(interaction) {
  const owners = getOwnerIds();
  if (owners.length > 0) return owners.includes(interaction.user.id);
  return interaction.guild?.ownerId === interaction.user.id;
}

function flags() {
  return MessageFlags.IsComponentsV2;
}

function container() {
  return new ContainerBuilder().setAccentColor(
    parseEmbedColor(getConfig().bot.embedColor)
  );
}

function addFooter(c) {
  const footer = getConfig().bot.footer;
  if (footer?.trim()) {
    c.addSeparatorComponents((sep) => sep.setDivider(false));
    c.addTextDisplayComponents((td) => td.setContent(`-# ${footer}`));
  }
  return c;
}

function displayValue(field, value, guild) {
  switch (field.type) {
    case 'role':
      return formatRoleMention(guild, value);
    case 'roleList':
      return formatRoleList(guild, value);
    case 'channelText':
    case 'channelVoice':
    case 'category':
      return formatChannelMention(guild, value);
    case 'boolean':
      return value ? '✅ Açık' : '❌ Kapalı';
    default:
      return value != null && value !== '' ? `\`${value}\`` : '—';
  }
}

function collectCategoryRoleIds(category) {
  const ids = [];
  for (const field of category.fields) {
    const value = getConfigValue(field.path);
    if (field.type === 'role' && value) ids.push(value);
    if (field.type === 'roleList' && Array.isArray(value)) ids.push(...value);
  }
  return collectRoleIds(ids);
}

function wrapPayload(c, guild, category) {
  const roleIds = category ? collectCategoryRoleIds(category) : [];
  return ephemeralPayload({
    embeds: [],
    components: [c],
    flags: flags(),
    allowedMentions: roleIds.length ? { roles: roleIds, users: [] } : { parse: [] },
  });
}

function shortValue(field, value) {
  if (field.type === 'boolean') return value ? 'Açık' : 'Kapalı';
  if (field.type === 'roleList') {
    return Array.isArray(value) && value.length ? `${value.length} rol` : 'Boş';
  }
  if (value == null || value === '') return 'Boş';
  if (field.type === 'number' || field.type === 'text') return String(value).slice(0, 50);
  return 'Ayarlı';
}

// ---- Ana menü (kategori seçimi) ----

function buildHomePayload() {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(`## ${CFG.messages.panelTitle}\n\n${CFG.messages.panelDesc}`)
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(CFG.customId.categorySelect)
        .setPlaceholder(CFG.messages.categoryPlaceholder)
        .addOptions(
          CFG.CATEGORIES.map((cat) => ({
            label: cat.label,
            value: cat.id,
            description: cat.description,
            emoji: cat.emoji,
          }))
        )
    )
  );
  addFooter(c);
  return ephemeralPayload({ embeds: [], components: [c], flags: flags() });
}

// ---- Kategori görünümü (alan listesi + alan seçimi) ----

function buildCategoryPayload(categoryId, guild) {
  const category = CFG.getCategory(categoryId);
  if (!category) return buildHomePayload();

  const c = container();

  const lines = category.fields.map((field) => {
    const value = getConfigValue(field.path);
    return `**${field.label}:** ${displayValue(field, value, guild)}`;
  });

  c.addTextDisplayComponents((td) =>
    td.setContent(`## ${category.emoji} ${category.label}\n\n${lines.join('\n')}`)
  );
  c.addSeparatorComponents((sep) => sep);

  c.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${CFG.customId.fieldSelect}:${categoryId}`)
        .setPlaceholder(CFG.messages.fieldPlaceholder)
        .addOptions(
          category.fields.map((field) => ({
            label: field.label.slice(0, 100),
            value: field.path,
            description: shortValue(field, getConfigValue(field.path)).slice(0, 100),
          }))
        )
    )
  );

  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(CFG.customId.home)
        .setLabel(CFG.messages.backToHome)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  addFooter(c);
  return wrapPayload(c, guild, category);
}

function navRow(field) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CFG.customId.back}${field.category}`)
      .setLabel(CFG.messages.backToCategory)
      .setStyle(ButtonStyle.Secondary)
  );

  const clearable = ['role', 'channelText', 'channelVoice', 'category', 'text'].includes(
    field.type
  );
  if (clearable) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${CFG.customId.clear}${field.path}`)
        .setLabel(CFG.messages.clearLabel)
        .setStyle(ButtonStyle.Danger)
    );
  }
  return row;
}

function buildFieldEditorPayload(path, guild) {
  const field = CFG.getField(path);
  if (!field) return buildHomePayload();

  const value = getConfigValue(path);
  const c = container();

  c.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${field.label}\n\n**Mevcut değer:** ${displayValue(field, value, guild)}`
    )
  );
  c.addSeparatorComponents((sep) => sep);

  if (field.type === 'boolean') {
    c.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${CFG.customId.boolSet}${path}:1`)
          .setLabel(CFG.messages.enableLabel)
          .setStyle(value ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`${CFG.customId.boolSet}${path}:0`)
          .setLabel(CFG.messages.disableLabel)
          .setStyle(!value ? ButtonStyle.Danger : ButtonStyle.Secondary)
      )
    );
  } else if (field.type === 'role') {
    c.addActionRowComponents((row) =>
      row.addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId(`${CFG.customId.roleSelect}${path}`)
          .setPlaceholder(CFG.messages.rolePlaceholder)
          .setMinValues(1)
          .setMaxValues(1)
      )
    );
  } else if (field.type === 'roleList') {
    c.addActionRowComponents((row) =>
      row.addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId(`${CFG.customId.roleListSelect}${path}`)
          .setPlaceholder(CFG.messages.roleListPlaceholder)
          .setMinValues(0)
          .setMaxValues(25)
      )
    );
  } else if (field.type === 'channelText' || field.type === 'channelVoice' || field.type === 'category') {
    const channelTypes =
      field.type === 'category'
        ? [ChannelType.GuildCategory]
        : field.type === 'channelVoice'
          ? [ChannelType.GuildVoice, ChannelType.GuildStageVoice]
          : [ChannelType.GuildText, ChannelType.GuildAnnouncement];

    c.addActionRowComponents((row) =>
      row.addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(`${CFG.customId.channelSelect}${path}`)
          .setPlaceholder(
            field.type === 'category'
              ? CFG.messages.categoryChannelPlaceholder
              : CFG.messages.channelPlaceholder
          )
          .addChannelTypes(...channelTypes)
          .setMinValues(1)
          .setMaxValues(1)
      )
    );
  } else {
    // number / text
    c.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${CFG.customId.modalOpen}${path}`)
          .setLabel(CFG.messages.editLabel)
          .setStyle(ButtonStyle.Primary)
      )
    );
  }

  c.addActionRowComponents((row) => row.addComponents(...navRow(field).components));

  addFooter(c);
  const roleIds =
    field.type === 'role' && value
      ? collectRoleIds([value])
      : field.type === 'roleList'
        ? collectRoleIds(value)
        : [];
  return ephemeralPayload({
    embeds: [],
    components: [c],
    flags: flags(),
    allowedMentions: roleIds.length ? { roles: roleIds, users: [] } : { parse: [] },
  });
}

function buildEditModal(field) {
  const current = getConfigValue(field.path);
  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(field.label.slice(0, 45))
    .setStyle(TextInputStyle.Short)
    .setRequired(field.type === 'number')
    .setMaxLength(200);

  if (current != null && current !== '') {
    input.setValue(String(current).slice(0, 200));
  }

  return new ModalBuilder()
    .setCustomId(`${CFG.customId.modalSubmit}${field.path}`)
    .setTitle('Değer Düzenle')
    .addComponents(new ActionRowBuilder().addComponents(input));
}

// ---- Interaction handler'ları ----

async function openConfigPanel(interaction) {
  if (!isOwner(interaction)) {
    return interaction.reply(ephemeralPayload({ content: CFG.messages.noPermission }));
  }
  return interaction.reply(buildHomePayload());
}

async function handleConfigInteraction(interaction) {
  if (!isOwner(interaction)) {
    if (interaction.isModalSubmit()) {
      return interaction.reply(ephemeralPayload({ content: CFG.messages.noPermission }));
    }
    return interaction.reply(ephemeralPayload({ content: CFG.messages.noPermission }));
  }

  const id = interaction.customId;

  // Modal submit (number / text)
  if (interaction.isModalSubmit() && id.startsWith(CFG.customId.modalSubmit)) {
    const path = id.slice(CFG.customId.modalSubmit.length);
    const field = CFG.getField(path);
    if (!field) return;

    const raw = interaction.fields.getTextInputValue('value').trim();

    if (field.type === 'number') {
      const num = Number(raw);
      if (Number.isNaN(num)) {
        return interaction.reply(ephemeralPayload({ content: CFG.messages.invalidNumber }));
      }
      setConfigValue(path, num);
    } else {
      setConfigValue(path, raw);
    }

    return interaction.update(buildFieldEditorPayload(path, interaction.guild));
  }

  // Kategori seçimi
  if (interaction.isStringSelectMenu() && id === CFG.customId.categorySelect) {
    await interaction.deferUpdate();
    return interaction.editReply(buildCategoryPayload(interaction.values[0], interaction.guild));
  }

  // Alan seçimi
  if (interaction.isStringSelectMenu() && id.startsWith(`${CFG.customId.fieldSelect}:`)) {
    await interaction.deferUpdate();
    return interaction.editReply(buildFieldEditorPayload(interaction.values[0], interaction.guild));
  }

  // Rol (tek) seçimi
  if (interaction.isRoleSelectMenu() && id.startsWith(CFG.customId.roleSelect)) {
    const path = id.slice(CFG.customId.roleSelect.length);
    setConfigValue(path, interaction.values[0]);
    await interaction.deferUpdate();
    return interaction.editReply(buildFieldEditorPayload(path, interaction.guild));
  }

  // Rol listesi seçimi
  if (interaction.isRoleSelectMenu() && id.startsWith(CFG.customId.roleListSelect)) {
    const path = id.slice(CFG.customId.roleListSelect.length);
    setConfigValue(path, [...interaction.values]);
    await interaction.deferUpdate();
    return interaction.editReply(buildFieldEditorPayload(path, interaction.guild));
  }

  // Kanal / kategori seçimi
  if (interaction.isChannelSelectMenu() && id.startsWith(CFG.customId.channelSelect)) {
    const path = id.slice(CFG.customId.channelSelect.length);
    setConfigValue(path, interaction.values[0]);
    await interaction.deferUpdate();
    return interaction.editReply(buildFieldEditorPayload(path, interaction.guild));
  }

  if (interaction.isButton()) {
    // Boolean set
    if (id.startsWith(CFG.customId.boolSet)) {
      const rest = id.slice(CFG.customId.boolSet.length);
      const sep = rest.lastIndexOf(':');
      const path = rest.slice(0, sep);
      const val = rest.slice(sep + 1) === '1';
      setConfigValue(path, val);
      await interaction.deferUpdate();
      return interaction.editReply(buildFieldEditorPayload(path, interaction.guild));
    }

    // Modal aç (number/text)
    if (id.startsWith(CFG.customId.modalOpen)) {
      const path = id.slice(CFG.customId.modalOpen.length);
      const field = CFG.getField(path);
      if (!field) return;
      return interaction.showModal(buildEditModal(field));
    }

    // Temizle
    if (id.startsWith(CFG.customId.clear)) {
      const path = id.slice(CFG.customId.clear.length);
      const field = CFG.getField(path);
      if (!field) return;
      setConfigValue(path, field.type === 'roleList' ? [] : '');
      await interaction.deferUpdate();
      return interaction.editReply(buildFieldEditorPayload(path, interaction.guild));
    }

    // Kategoriye geri
    if (id.startsWith(CFG.customId.back)) {
      const categoryId = id.slice(CFG.customId.back.length);
      await interaction.deferUpdate();
      return interaction.editReply(buildCategoryPayload(categoryId, interaction.guild));
    }

    // Ana menü
    if (id === CFG.customId.home) {
      await interaction.deferUpdate();
      return interaction.editReply(buildHomePayload());
    }
  }
}

function isConfigInteraction(customId) {
  return typeof customId === 'string' && customId.startsWith('config:');
}

module.exports = {
  openConfigPanel,
  handleConfigInteraction,
  isConfigInteraction,
};
