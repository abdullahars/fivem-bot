const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { getConfig, getOwnerIds } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { ephemeralPayload } = require('../utils/interaction');
const { getRoleMembers } = require('../utils/roleMembers');
const VER = require('../constants/veriler');
const {
  getGuildDataSummary,
  resetGuild,
  resetForUsers,
  resetForUser,
  sumCounts,
} = require('./dataResetService');

function isOwner(interaction) {
  const owners = getOwnerIds();
  if (owners.length > 0) return owners.includes(interaction.user.id);
  return interaction.guild?.ownerId === interaction.user.id;
}

function catLabel(catId) {
  return VER.CATEGORIES[catId]?.label || catId;
}

function fmt(str, vars) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
    str
  );
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

function payload(c) {
  return ephemeralPayload({
    embeds: [],
    components: [c],
    flags: MessageFlags.IsComponentsV2,
  });
}

// ---- Ana panel ----

function buildHomePayload(guildId) {
  const summary = getGuildDataSummary(guildId);
  const c = container();

  const summaryLines = [
    `${VER.CATEGORIES.stats.emoji} Statlar: **${summary.stats}** kayıt`,
    `${VER.CATEGORIES.puan.emoji} Puanlar: **${summary.puan}** kayıt`,
    `${VER.CATEGORIES.sicil.emoji} Sicil: **${summary.sicil}** kayıt`,
    `${VER.CATEGORIES.coin.emoji} Coinler: **${summary.coin}** kayıt`,
  ].join('\n');

  c.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${VER.messages.panelTitle}\n\n${VER.messages.panelDesc}\n\n` +
        `${VER.messages.summaryTitle}\n${summaryLines}`
    )
  );
  c.addSeparatorComponents((sep) => sep);

  c.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(VER.customId.categorySelect)
        .setPlaceholder(VER.messages.categoryPlaceholder)
        .addOptions(
          Object.values(VER.CATEGORIES).map((cat) => ({
            label: cat.label,
            value: cat.id,
            description: cat.description.slice(0, 100),
            emoji: cat.emoji,
          }))
        )
    )
  );

  addFooter(c);
  return payload(c);
}

// ---- Kapsam seçimi ----

function buildScopePayload(catId) {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(
      `## 🗑️ ${catLabel(catId)}\n\n${fmt(VER.messages.scopeTitle, { cat: catLabel(catId) })}`
    )
  );
  c.addSeparatorComponents((sep) => sep);

  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${VER.customId.scopeUser}${catId}`)
        .setLabel(VER.messages.scopeUserLabel)
        .setEmoji('👤')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${VER.customId.scopeRole}${catId}`)
        .setLabel(VER.messages.scopeRoleLabel)
        .setEmoji('🎭')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${VER.customId.scopeGuild}${catId}`)
        .setLabel(VER.messages.scopeGuildLabel)
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Danger)
    )
  );

  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(VER.customId.home)
        .setLabel(VER.messages.cancel)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  addFooter(c);
  return payload(c);
}

// ---- Kullanıcı / rol seçim ekranları ----

function buildUserSelectPayload(catId) {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(`## 👤 ${catLabel(catId)} — Kullanıcı Seç`)
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`${VER.customId.userSelect}${catId}`)
        .setPlaceholder(VER.messages.userSelectPlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
    )
  );
  c.addActionRowComponents((row) =>
    row.addComponents(backButton(catId))
  );
  addFooter(c);
  return payload(c);
}

function buildRoleSelectPayload(catId) {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(`## 🎭 ${catLabel(catId)} — Rol Seç`)
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(`${VER.customId.roleSelect}${catId}`)
        .setPlaceholder(VER.messages.roleSelectPlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
    )
  );
  c.addActionRowComponents((row) =>
    row.addComponents(backButton(catId))
  );
  addFooter(c);
  return payload(c);
}

function backButton(catId) {
  return new ButtonBuilder()
    .setCustomId(`${VER.customId.back}${catId}`)
    .setLabel(VER.messages.back)
    .setStyle(ButtonStyle.Secondary);
}

function homeButton() {
  return new ButtonBuilder()
    .setCustomId(VER.customId.home)
    .setLabel(VER.messages.cancel)
    .setStyle(ButtonStyle.Secondary);
}

// ---- Onay ekranları ----

function buildUserConfirmPayload(catId, userId) {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(
      fmt(VER.messages.userConfirmTitle, { user: `<@${userId}>`, cat: catLabel(catId) })
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${VER.customId.userExec}${catId}:${userId}`)
        .setLabel(VER.messages.confirmUser)
        .setEmoji('✅')
        .setStyle(ButtonStyle.Danger),
      homeButton()
    )
  );
  addFooter(c);
  return payload(c);
}

function buildRoleConfirm1Payload(catId, roleId, count) {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(
      fmt(VER.messages.roleConfirm1Title, {
        role: `<@&${roleId}>`,
        count,
        cat: catLabel(catId),
      })
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${VER.customId.roleConfirm2}${catId}:${roleId}`)
        .setLabel(`${VER.messages.confirmContinue} (1/2)`)
        .setStyle(ButtonStyle.Danger),
      homeButton()
    )
  );
  addFooter(c);
  return payload(c);
}

function buildRoleConfirm2Payload(catId, roleId, count) {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(
      fmt(VER.messages.roleConfirm2Title, {
        role: `<@&${roleId}>`,
        count,
        cat: catLabel(catId),
      })
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${VER.customId.roleExec}${catId}:${roleId}`)
        .setLabel(`${VER.messages.confirmFinal} (2/2)`)
        .setEmoji('🚨')
        .setStyle(ButtonStyle.Danger),
      homeButton()
    )
  );
  addFooter(c);
  return payload(c);
}

function buildGuildConfirm1Payload(catId) {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(fmt(VER.messages.guildConfirm1Title, { cat: catLabel(catId) }))
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${VER.customId.guildConfirm2}${catId}`)
        .setLabel(`${VER.messages.confirmContinue} (1/2)`)
        .setStyle(ButtonStyle.Danger),
      homeButton()
    )
  );
  addFooter(c);
  return payload(c);
}

function buildGuildConfirm2Payload(catId) {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(fmt(VER.messages.guildConfirm2Title, { cat: catLabel(catId) }))
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${VER.customId.guildExec}${catId}`)
        .setLabel(`${VER.messages.confirmFinal} (2/2)`)
        .setEmoji('🚨')
        .setStyle(ButtonStyle.Danger),
      homeButton()
    )
  );
  addFooter(c);
  return payload(c);
}

// ---- Sonuç ----

function buildResultPayload(catId, scopeLabel, counts) {
  const c = container();
  const total = sumCounts(counts);
  const detail = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([table, n]) => `\`${table}\`: ${n}`)
    .join('\n');

  c.addTextDisplayComponents((td) =>
    td.setContent(
      fmt(VER.messages.done, { scope: scopeLabel, cat: catLabel(catId), total }) +
        (detail ? `\n\n${detail}` : '')
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) => row.addComponents(homeButton()));
  addFooter(c);
  return payload(c);
}

function buildErrorPayload(error) {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(fmt(VER.messages.failed, { error }))
  );
  c.addActionRowComponents((row) => row.addComponents(homeButton()));
  addFooter(c);
  return payload(c);
}

// ---- Komut girişi ----

async function openVerilerPanel(interaction) {
  if (!isOwner(interaction)) {
    return interaction.reply(ephemeralPayload({ content: VER.messages.noPermission }));
  }
  return interaction.reply(buildHomePayload(interaction.guild.id));
}

// ---- Etkileşim yönlendirme ----

function isVerilerInteraction(customId) {
  return typeof customId === 'string' && customId.startsWith('veriler:');
}

async function handleVerilerInteraction(interaction) {
  if (!isOwner(interaction)) {
    return interaction.reply(ephemeralPayload({ content: VER.messages.noPermission }));
  }

  const id = interaction.customId;
  const guildId = interaction.guild.id;

  // Kategori seçimi
  if (interaction.isStringSelectMenu() && id === VER.customId.categorySelect) {
    await interaction.deferUpdate();
    return interaction.editReply(buildScopePayload(interaction.values[0]));
  }

  // Kullanıcı seçimi → onay
  if (interaction.isUserSelectMenu() && id.startsWith(VER.customId.userSelect)) {
    const catId = id.slice(VER.customId.userSelect.length);
    await interaction.deferUpdate();
    return interaction.editReply(buildUserConfirmPayload(catId, interaction.values[0]));
  }

  // Rol seçimi → 1. onay
  if (interaction.isRoleSelectMenu() && id.startsWith(VER.customId.roleSelect)) {
    const catId = id.slice(VER.customId.roleSelect.length);
    const roleId = interaction.values[0];
    const count = getRoleMembers(interaction.guild, roleId).length;
    await interaction.deferUpdate();
    return interaction.editReply(buildRoleConfirm1Payload(catId, roleId, count));
  }

  if (!interaction.isButton()) return;

  // Ana menü
  if (id === VER.customId.home) {
    await interaction.deferUpdate();
    return interaction.editReply(buildHomePayload(guildId));
  }

  // Kapsam ekranına geri
  if (id.startsWith(VER.customId.back)) {
    const catId = id.slice(VER.customId.back.length);
    await interaction.deferUpdate();
    return interaction.editReply(buildScopePayload(catId));
  }

  // Kapsam: kullanıcı
  if (id.startsWith(VER.customId.scopeUser)) {
    const catId = id.slice(VER.customId.scopeUser.length);
    await interaction.deferUpdate();
    return interaction.editReply(buildUserSelectPayload(catId));
  }

  // Kapsam: rol
  if (id.startsWith(VER.customId.scopeRole)) {
    const catId = id.slice(VER.customId.scopeRole.length);
    await interaction.deferUpdate();
    return interaction.editReply(buildRoleSelectPayload(catId));
  }

  // Kapsam: tüm sunucu → 1. onay
  if (id.startsWith(VER.customId.scopeGuild)) {
    const catId = id.slice(VER.customId.scopeGuild.length);
    await interaction.deferUpdate();
    return interaction.editReply(buildGuildConfirm1Payload(catId));
  }

  // Rol 2. onay ekranı
  if (id.startsWith(VER.customId.roleConfirm2)) {
    const [catId, roleId] = id.slice(VER.customId.roleConfirm2.length).split(':');
    const count = getRoleMembers(interaction.guild, roleId).length;
    await interaction.deferUpdate();
    return interaction.editReply(buildRoleConfirm2Payload(catId, roleId, count));
  }

  // Tüm sunucu 2. onay ekranı
  if (id.startsWith(VER.customId.guildConfirm2)) {
    const catId = id.slice(VER.customId.guildConfirm2.length);
    await interaction.deferUpdate();
    return interaction.editReply(buildGuildConfirm2Payload(catId));
  }

  // ---- Çalıştırma ----

  if (id.startsWith(VER.customId.userExec)) {
    const [catId, userId] = id.slice(VER.customId.userExec.length).split(':');
    await interaction.deferUpdate();
    try {
      const counts = resetForUser(guildId, userId, catId);
      return interaction.editReply(buildResultPayload(catId, `<@${userId}>`, counts));
    } catch (err) {
      console.error('[Veriler] kullanıcı sıfırlama:', err);
      return interaction.editReply(buildErrorPayload(err.message || err));
    }
  }

  if (id.startsWith(VER.customId.roleExec)) {
    const [catId, roleId] = id.slice(VER.customId.roleExec.length).split(':');
    await interaction.deferUpdate();
    try {
      const memberIds = getRoleMembers(interaction.guild, roleId).map((m) => m.id);
      const counts = resetForUsers(guildId, memberIds, catId);
      return interaction.editReply(buildResultPayload(catId, `<@&${roleId}>`, counts));
    } catch (err) {
      console.error('[Veriler] rol sıfırlama:', err);
      return interaction.editReply(buildErrorPayload(err.message || err));
    }
  }

  if (id.startsWith(VER.customId.guildExec)) {
    const catId = id.slice(VER.customId.guildExec.length);
    await interaction.deferUpdate();
    try {
      const counts = resetGuild(guildId, catId);
      return interaction.editReply(buildResultPayload(catId, 'Tüm Sunucu', counts));
    } catch (err) {
      console.error('[Veriler] sunucu sıfırlama:', err);
      return interaction.editReply(buildErrorPayload(err.message || err));
    }
  }
}

module.exports = {
  openVerilerPanel,
  handleVerilerInteraction,
  isVerilerInteraction,
};
