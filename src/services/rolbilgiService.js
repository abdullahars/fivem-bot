const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  MessageFlags,
} = require('discord.js');
const RB = require('../constants/rolbilgi');
const MESSAGES = require('../constants/messages');
const { parseEmbedColor } = require('../utils/colors');
const { getConfig } = require('../config/loadConfig');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');
const { isBotCommand, isBanhammer } = require('../utils/permissions');
const { getRoleBlockedMessage } = require('./blRolService');
const { applyButtonEmoji } = require('../utils/buttonEmoji');

const PREFIX = 'rolbilgi';
/** V2 — tüm TextDisplay bileşenlerinin toplam metin limiti */
const V2_TOTAL_TEXT_LIMIT = 3800;

function buildCustomId(action, roleId, page) {
  if (action === 'page') return `${PREFIX}:page:${page}:${roleId}`;
  return `${PREFIX}:${action}:${roleId}`;
}

function parseCustomId(customId) {
  const parts = customId.split(':');
  if (parts[0] !== PREFIX || parts.length < 3) return null;
  if (parts[1] === 'page' && parts.length >= 4) {
    return { action: 'page', page: Number(parts[2]) || 0, roleId: parts[3] };
  }
  return { action: parts[1], roleId: parts[2] };
}

function getRoleColorHex(role) {
  if (!role.color) return '#000000';
  return `#${role.color.toString(16).padStart(6, '0')}`;
}

function formatMemberLines(members) {
  return members.map((m) =>
    formatTemplate(RB.memberLine, {
      mention: m.toString(),
      id: m.id,
    })
  );
}

function fitLinesToBudget(lines, budget) {
  const result = [];
  let used = 0;

  for (const line of lines) {
    const extra = result.length ? line.length + 1 : line.length;
    if (used + extra > budget) break;
    result.push(line);
    used += extra;
  }

  return result;
}

function addButtonSection(container, roleId, buttonDef, style) {
  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((td) => td.setContent(`**${buttonDef.label}**`))
      .setButtonAccessory((button) => {
        const btn = button
          .setCustomId(buildCustomId(buttonDef.id, roleId))
          .setLabel(buttonDef.label)
          .setStyle(style);
        applyButtonEmoji(btn, buttonDef.emoji);
        return btn;
      })
  );
}

function buildPageNavRow(roleId, page, totalPages) {
  const row = new ActionRowBuilder();
  if (page > 0) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId('page', roleId, page - 1))
        .setLabel(RB.prevPage)
        .setStyle(ButtonStyle.Secondary)
    );
  }
  if (page < totalPages - 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId('page', roleId, page + 1))
        .setLabel(RB.nextPage)
        .setStyle(ButtonStyle.Secondary)
    );
  }
  return row.components.length ? row : null;
}

function buildRolbilgiMessage(role, members, page = 0) {
  const config = getConfig();
  const accentColor = parseEmbedColor(config.bot.embedColor);
  const perPage = RB.membersPerPage > 0 ? RB.membersPerPage : 20;

  const header = formatTemplate(RB.embedHeader, {
    role: role.toString(),
    color: getRoleColorHex(role),
    roleId: role.id,
    count: String(members.length),
  });

  const totalPages = Math.max(1, Math.ceil(members.length / perPage));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * perPage;
  const slice = members.slice(start, start + perPage);

  const pageNote =
    totalPages > 1
      ? `${formatTemplate(RB.pageNote, { page: safePage + 1, total: totalPages })}\n\n`
      : '';

  const headerBudget = header.length + pageNote.length + 80;
  const buttonBudget = 200;
  const listBudget = V2_TOTAL_TEXT_LIMIT - headerBudget - buttonBudget;

  const lines = fitLinesToBudget(formatMemberLines(slice), listBudget);
  let memberText = lines.length ? lines.join('\n') : RB.noMembersInList;

  const hiddenOnPage = slice.length - lines.length;
  if (hiddenOnPage > 0) {
    memberText += formatTemplate(RB.listTruncated, { remaining: String(hiddenOnPage) });
  }

  const container = new ContainerBuilder().setAccentColor(accentColor);

  container.addTextDisplayComponents((td) => td.setContent(header));
  container.addSeparatorComponents((sep) => sep);
  container.addTextDisplayComponents((td) => td.setContent(`${pageNote}${memberText}`));

  const navRow = buildPageNavRow(role.id, safePage, totalPages);
  if (navRow) {
    container.addSeparatorComponents((sep) => sep);
    container.addActionRowComponents(navRow);
  }

  container.addSeparatorComponents((sep) => sep);

  addButtonSection(container, role.id, RB.buttons.ids, ButtonStyle.Secondary);
  addButtonSection(container, role.id, RB.buttons.strip, ButtonStyle.Danger);
  if (members.length <= RB.banMaxMembers) {
    addButtonSection(container, role.id, RB.buttons.ban, ButtonStyle.Danger);
  }

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: ['users'] },
  };
}

async function fetchRoleMembers(guild, roleId) {
  const role = await guild.roles.fetch(roleId).catch(() => null);
  if (!role) return { role: null, members: [] };

  const members = [...role.members.values()]
    .filter((m) => !m.user.bot)
    .sort((a, b) => a.user.username.localeCompare(b.user.username, 'tr'));
  return { role, members };
}

async function buildRolbilgiPayload(guild, roleId, page = 0) {
  const { role, members } = await fetchRoleMembers(guild, roleId);
  if (!role) return null;

  const message = buildRolbilgiMessage(role, members, page);
  return { message, role, members };
}

async function sendRolbilgiPanel(interaction, role) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }

  const payload = await buildRolbilgiPayload(interaction.guild, role.id, 0);
  if (!payload) {
    return interaction.editReply({ content: RB.roleNotFound, embeds: [], components: [] });
  }

  return interaction.editReply(payload.message);
}

async function handlePageButton(interaction, roleId, page) {
  await interaction.deferUpdate();
  const payload = await buildRolbilgiPayload(interaction.guild, roleId, page);
  if (!payload) {
    return interaction.editReply({ content: RB.roleNotFound, embeds: [], components: [] });
  }
  return interaction.editReply(payload.message);
}

async function handleIdsButton(interaction, roleId) {
  if (!isBotCommand(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
  }

  const { role, members } = await fetchRoleMembers(interaction.guild, roleId);
  if (!role) {
    return interaction.reply(ephemeralPayload({ content: RB.roleNotFound }));
  }
  if (members.length === 0) {
    return interaction.reply(ephemeralPayload({ content: RB.noMembers }));
  }

  const ids = members.map((m) => m.id).join('\n');
  const text = formatTemplate(RB.idsResult, {
    role: role.name,
    count: String(members.length),
    ids,
  });

  if (text.length <= 2000) {
    return interaction.reply(ephemeralPayload({ content: text }));
  }

  const buffer = Buffer.from(ids, 'utf-8');
  const file = new AttachmentBuilder(buffer, { name: `${role.id}-uyeler.txt` });
  return interaction.reply(
    ephemeralPayload({
      content: formatTemplate(RB.idsFile, { role: role.name, count: String(members.length) }),
      files: [file],
    })
  );
}

function buildConfirmRow(action, roleId) {
  return new ActionRowBuilder().addComponents(
    applyButtonEmoji(
      new ButtonBuilder()
        .setCustomId(buildCustomId(`${action}_ok`, roleId))
        .setLabel(RB.buttons.confirm.label)
        .setStyle(ButtonStyle.Success),
      RB.buttons.confirm.emoji
    ),
    applyButtonEmoji(
      new ButtonBuilder()
        .setCustomId(buildCustomId(`${action}_no`, roleId))
        .setLabel(RB.buttons.cancel.label)
        .setStyle(ButtonStyle.Secondary),
      RB.buttons.cancel.emoji
    )
  );
}

async function showConfirm(interaction, action, roleId) {
  if (action === RB.buttons.ban.id) {
    if (!isBanhammer(interaction.member)) {
      return interaction.reply(ephemeralPayload({ content: RB.noBanhammer }));
    }
  } else if (!isBotCommand(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
  }

  const { role, members } = await fetchRoleMembers(interaction.guild, roleId);
  if (!role) {
    return interaction.reply(ephemeralPayload({ content: RB.roleNotFound }));
  }
  if (members.length === 0) {
    return interaction.reply(ephemeralPayload({ content: RB.noMembers }));
  }

  if (action === RB.buttons.strip.id) {
    const blockedMsg = await getRoleBlockedMessage(
      interaction.guild.id,
      role,
      interaction.member,
      { exemptUstYonetim: false }
    );
    if (blockedMsg) {
      return interaction.reply(ephemeralPayload({ content: blockedMsg }));
    }
  }

  if (action === RB.buttons.ban.id && members.length > RB.banMaxMembers) {
    return interaction.reply(
      ephemeralPayload({
        content: formatTemplate(RB.banTooMany, {
          max: String(RB.banMaxMembers),
          count: String(members.length),
        }),
      })
    );
  }

  const template = action === RB.buttons.ban.id ? RB.banConfirm : RB.stripConfirm;
  const content = formatTemplate(template, {
    role: role.toString(),
    count: String(members.length),
  });

  return interaction.reply({
    content,
    components: [buildConfirmRow(action, roleId)],
    ephemeral: true,
  });
}

async function executeStrip(interaction, roleId) {
  await interaction.update({ content: RB.processing, components: [] });

  const { role, members } = await fetchRoleMembers(interaction.guild, roleId);
  if (!role) {
    return interaction.editReply({ content: RB.roleNotFound });
  }

  const blockedMsg = await getRoleBlockedMessage(
    interaction.guild.id,
    role,
    interaction.member,
    { exemptUstYonetim: false }
  );
  if (blockedMsg) {
    return interaction.editReply({ content: blockedMsg });
  }

  let success = 0;
  let fail = 0;

  for (const member of members) {
    try {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId, `Toplu rol al — ${interaction.user.tag}`);
        success += 1;
      }
    } catch {
      fail += 1;
    }
  }

  return interaction.editReply({
    content: formatTemplate(RB.stripDone, {
      role: role.name,
      success: String(success),
      fail: String(fail),
    }),
  });
}

async function executeBan(interaction, roleId) {
  await interaction.update({ content: RB.processing, components: [] });

  const { role, members } = await fetchRoleMembers(interaction.guild, roleId);
  if (!role) {
    return interaction.editReply({ content: RB.roleNotFound });
  }
  if (members.length > RB.banMaxMembers) {
    return interaction.editReply({
      content: formatTemplate(RB.banTooMany, {
        max: String(RB.banMaxMembers),
        count: String(members.length),
      }),
    });
  }

  const me = interaction.guild.members.me;
  if (!me?.permissions.has('BanMembers')) {
    return interaction.editReply({ content: '❌ Botun ban yetkisi yok.' });
  }

  let success = 0;
  let fail = 0;
  const reason = `Toplu ban (rol: ${role.name}) — ${interaction.user.tag}`;

  for (const member of members) {
    if (member.id === interaction.user.id || member.id === me.id) {
      fail += 1;
      continue;
    }
    if (!member.bannable) {
      fail += 1;
      continue;
    }
    try {
      await member.ban({ reason, deleteMessageSeconds: 0 });
      success += 1;
    } catch {
      fail += 1;
    }
  }

  return interaction.editReply({
    content: formatTemplate(RB.banDone, {
      role: role.name,
      success: String(success),
      fail: String(fail),
    }),
  });
}

async function handleRolbilgiButton(interaction) {
  const parsed = parseCustomId(interaction.customId);
  if (!parsed) return;

  const { action, roleId } = parsed;

  if (action === 'page') {
    return handlePageButton(interaction, roleId, parsed.page);
  }

  if (action === RB.buttons.ids.id) {
    return handleIdsButton(interaction, roleId);
  }

  if (action === `${RB.buttons.strip.id}_no` || action === `${RB.buttons.ban.id}_no`) {
    return interaction.update({ content: '❌ İşlem iptal edildi.', components: [] });
  }

  if (action === `${RB.buttons.strip.id}_ok`) {
    if (!isBotCommand(interaction.member)) {
      return interaction.update({ content: MESSAGES.noBotCommand, components: [] });
    }
    return executeStrip(interaction, roleId);
  }

  if (action === `${RB.buttons.ban.id}_ok`) {
    if (!isBanhammer(interaction.member)) {
      return interaction.update({ content: RB.noBanhammer, components: [] });
    }
    return executeBan(interaction, roleId);
  }

  if (action === RB.buttons.strip.id || action === RB.buttons.ban.id) {
    return showConfirm(interaction, action, roleId);
  }
}

module.exports = {
  sendRolbilgiPanel,
  handleRolbilgiButton,
};
