const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { getConfig } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { ephemeralPayload } = require('../utils/interaction');
const { isUstYonetim } = require('../utils/permissions');
const { formatTemplate } = require('../utils/format');
const BL = require('../constants/blRol');
const {
  getPanelData,
  formatRoleList,
  formatExemptList,
  formatRoleMention,
  addBlockedRoles,
  removeBlockedRoles,
  upsertExemptRole,
  removeExemptRole,
  resolveValidRoleIds,
} = require('./blRolService');

const UI = BL.customId;
const P = BL.panel;

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

function payload(c, notice) {
  if (notice) {
    c.addSeparatorComponents((sep) => sep.setDivider(false));
    c.addTextDisplayComponents((td) => td.setContent(notice));
  }
  addFooter(c);
  return ephemeralPayload({
    embeds: [],
    components: [c],
    flags: flags(),
  });
}

async function buildHomePanel(guild, notice) {
  const data = await getPanelData(guild);
  const c = container();

  c.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${P.title}\n\n` +
        `${P.blSection} (${data.roleIds.length})\n` +
        `${formatRoleList(guild, data.roleIds)}\n\n` +
        `${P.exemptSection} (${data.exemptRoles.length})\n` +
        `${formatExemptList(guild, data.exemptRoles)}`
    )
  );

  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.setComponents(
      new ButtonBuilder()
        .setCustomId(UI.addBlBtn)
        .setLabel(P.addBlBtn)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(UI.remBlBtn)
        .setLabel(P.remBlBtn)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(UI.addExemptBtn)
        .setLabel(P.addExemptBtn)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(UI.editExemptBtn)
        .setLabel(P.editExemptBtn)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(UI.remExemptBtn)
        .setLabel(P.remExemptBtn)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  return payload(c, notice);
}

function buildAddBlSelectPanel(guild) {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(`## ${P.title}\n\nKara listeye eklenecek rolleri seçin (birden fazla seçilebilir).`)
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(UI.addBlSelect)
        .setPlaceholder(P.addBlSelectPlaceholder)
        .setMinValues(1)
        .setMaxValues(25)
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(UI.home)
        .setLabel(P.homeBtn)
        .setStyle(ButtonStyle.Secondary)
    )
  );
  return payload(c);
}

async function buildRemBlSelectPanel(guild) {
  const data = await getPanelData(guild);
  if (!data.roleIds.length) {
    return buildHomePanel(guild, BL.messages.noBlToRemove);
  }

  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(`## ${P.title}\n\nKara listeden kaldırılacak rolleri seçin.`)
  );
  c.addSeparatorComponents((sep) => sep);

  const options = data.roleIds.slice(0, 25).map((id) => {
    const role = guild.roles.cache.get(id);
    return {
      label: (role?.name || id).slice(0, 100),
      value: id,
      description: role ? 'BL rol' : 'Silinmiş rol',
    };
  });

  c.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(UI.remBlSelect)
        .setPlaceholder(P.remBlSelectPlaceholder)
        .setMinValues(1)
        .setMaxValues(Math.min(options.length, 25))
        .addOptions(options)
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(UI.home)
        .setLabel(P.homeBtn)
        .setStyle(ButtonStyle.Secondary)
    )
  );
  return payload(c);
}

function buildExemptRolePickPanel(mode = 'add') {
  const c = container();
  const title = mode === 'edit' ? 'Muaf Rol Düzenle' : 'Muaf Rol Ekle';
  c.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${P.title}\n\n**${title}**\nMuaf tutulacak rolü seçin. Bu role sahip üyeler, sonraki adımda seçeceğiniz BL rolleri verebilir.`
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(`${UI.exemptRoleSelect}:${mode}`)
        .setPlaceholder(P.exemptRolePlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(UI.home)
        .setLabel(P.homeBtn)
        .setStyle(ButtonStyle.Secondary)
    )
  );
  return payload(c);
}

async function buildExemptBlPickPanel(guild, exemptRoleId, mode = 'add') {
  const data = await getPanelData(guild);
  if (!data.roleIds.length) {
    return buildHomePanel(guild, BL.messages.noBlForExempt);
  }

  const prefix =
    mode === 'edit' ? UI.editExemptBlSelectPrefix : UI.exemptBlSelectPrefix;
  const existing = data.exemptRoles.find((e) => e.exemptRoleId === exemptRoleId);
  const defaultIds = existing?.allowedBlRoleIds || [];

  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${P.title}\n\n` +
        formatTemplate(P.pickExemptText, {
          role: formatRoleMention(guild, exemptRoleId),
        })
    )
  );
  c.addSeparatorComponents((sep) => sep);

  const options = data.roleIds.slice(0, 25).map((id) => {
    const role = guild.roles.cache.get(id);
    return {
      label: (role?.name || id).slice(0, 100),
      value: id,
      default: defaultIds.includes(id),
    };
  });

  c.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${prefix}${exemptRoleId}`)
        .setPlaceholder(P.exemptBlPlaceholder)
        .setMinValues(0)
        .setMaxValues(Math.min(options.length, 25))
        .addOptions(options)
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(UI.home)
        .setLabel(P.homeBtn)
        .setStyle(ButtonStyle.Secondary)
    )
  );
  return payload(c);
}

async function buildRemExemptSelectPanel(guild) {
  const data = await getPanelData(guild);
  if (!data.exemptRoles.length) {
    return buildHomePanel(guild, BL.messages.noExemptToRemove);
  }

  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(`## ${P.title}\n\nKaldırılacak muaf rolü seçin.`)
  );
  c.addSeparatorComponents((sep) => sep);

  const options = data.exemptRoles.slice(0, 25).map((entry) => {
    const role = guild.roles.cache.get(entry.exemptRoleId);
    return {
      label: (role?.name || entry.exemptRoleId).slice(0, 100),
      value: entry.exemptRoleId,
      description: `${(entry.allowedBlRoleIds || []).length} BL rol yetkisi`,
    };
  });

  c.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(UI.remExemptSelect)
        .setPlaceholder(P.remExemptPlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options)
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(UI.home)
        .setLabel(P.homeBtn)
        .setStyle(ButtonStyle.Secondary)
    )
  );
  return payload(c);
}

async function buildEditExemptSelectPanel(guild) {
  const data = await getPanelData(guild);
  if (!data.exemptRoles.length) {
    return buildHomePanel(guild, BL.messages.noExemptToEdit);
  }

  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(`## ${P.title}\n\nDüzenlenecek muaf rolü seçin.`)
  );
  c.addSeparatorComponents((sep) => sep);

  const options = data.exemptRoles.slice(0, 25).map((entry) => {
    const role = guild.roles.cache.get(entry.exemptRoleId);
    return {
      label: (role?.name || entry.exemptRoleId).slice(0, 100),
      value: entry.exemptRoleId,
      description: `${(entry.allowedBlRoleIds || []).length} BL rol yetkisi`,
    };
  });

  c.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(UI.editExemptSelect)
        .setPlaceholder(P.editExemptPlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options)
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(UI.home)
        .setLabel(P.homeBtn)
        .setStyle(ButtonStyle.Secondary)
    )
  );
  return payload(c);
}

function isBlRolInteraction(customId) {
  return customId.startsWith('blrol:');
}

function ensurePermission(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: BL.messages.noPermission }));
  }
  return null;
}

async function openBlRolPanel(interaction) {
  const denied = ensurePermission(interaction);
  if (denied) return denied;
  const p = await buildHomePanel(interaction.guild);
  return interaction.reply(p);
}

async function handleBlRolInteraction(interaction) {
  const denied = ensurePermission(interaction);
  if (denied) return denied;

  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id === UI.home) {
      const p = await buildHomePanel(interaction.guild);
      return interaction.update(p);
    }
    if (id === UI.addBlBtn) {
      return interaction.update(buildAddBlSelectPanel(interaction.guild));
    }
    if (id === UI.remBlBtn) {
      const p = await buildRemBlSelectPanel(interaction.guild);
      return interaction.update(p);
    }
    if (id === UI.addExemptBtn) {
      return interaction.update(buildExemptRolePickPanel('add'));
    }
    if (id === UI.remExemptBtn) {
      const p = await buildRemExemptSelectPanel(interaction.guild);
      return interaction.update(p);
    }
    if (id === UI.editExemptBtn) {
      const p = await buildEditExemptSelectPanel(interaction.guild);
      return interaction.update(p);
    }
  }

  if (interaction.isRoleSelectMenu()) {
    if (id === UI.addBlSelect) {
      const roleIds = resolveValidRoleIds(interaction.guild, interaction.values);
      if (!roleIds.length) {
        const p = await buildHomePanel(interaction.guild, BL.messages.everyoneBlocked);
        return interaction.update(p);
      }
      const { added } = await addBlockedRoles(interaction.guild, roleIds);
      const notice = added.length
        ? formatTemplate(BL.messages.blAdded, {
            roles: added.map((rid) => formatRoleMention(interaction.guild, rid)).join(', '),
          })
        : BL.messages.blAlready;
      const p = await buildHomePanel(interaction.guild, notice);
      return interaction.update(p);
    }

    if (id.startsWith(`${UI.exemptRoleSelect}:`)) {
      const mode = id.split(':').pop();
      const exemptRoleId = interaction.values[0];
      const p = await buildExemptBlPickPanel(interaction.guild, exemptRoleId, mode);
      return interaction.update(p);
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (id === UI.remBlSelect) {
      const { removed } = await removeBlockedRoles(interaction.guild, interaction.values);
      const notice = removed.length
        ? formatTemplate(BL.messages.blRemoved, {
            roles: removed.map((rid) => formatRoleMention(interaction.guild, rid)).join(', '),
          })
        : BL.messages.blNotInList;
      const p = await buildHomePanel(interaction.guild, notice);
      return interaction.update(p);
    }

    if (id === UI.remExemptSelect) {
      const exemptRoleId = interaction.values[0];
      await removeExemptRole(interaction.guild, exemptRoleId);
      const p = await buildHomePanel(
        interaction.guild,
        formatTemplate(BL.messages.exemptRemoved, {
          role: formatRoleMention(interaction.guild, exemptRoleId),
        })
      );
      return interaction.update(p);
    }

    if (id === UI.editExemptSelect) {
      const exemptRoleId = interaction.values[0];
      const p = await buildExemptBlPickPanel(interaction.guild, exemptRoleId, 'edit');
      return interaction.update(p);
    }

    if (id.startsWith(UI.exemptBlSelectPrefix)) {
      const exemptRoleId = id.slice(UI.exemptBlSelectPrefix.length);
      const { created } = await upsertExemptRole(
        interaction.guild,
        exemptRoleId,
        interaction.values
      );
      const tpl = created ? BL.messages.exemptAdded : BL.messages.exemptUpdated;
      const p = await buildHomePanel(
        interaction.guild,
        formatTemplate(tpl, {
          role: formatRoleMention(interaction.guild, exemptRoleId),
        })
      );
      return interaction.update(p);
    }

    if (id.startsWith(UI.editExemptBlSelectPrefix)) {
      const exemptRoleId = id.slice(UI.editExemptBlSelectPrefix.length);
      await upsertExemptRole(interaction.guild, exemptRoleId, interaction.values);
      const p = await buildHomePanel(
        interaction.guild,
        formatTemplate(BL.messages.exemptUpdated, {
          role: formatRoleMention(interaction.guild, exemptRoleId),
        })
      );
      return interaction.update(p);
    }
  }
}

module.exports = {
  openBlRolPanel,
  handleBlRolInteraction,
  isBlRolInteraction,
};
