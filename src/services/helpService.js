const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
} = require('discord.js');
const { getConfig } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { canViewHelp } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');
const { formatRoleList, collectRoleIds } = require('../utils/roleDisplay');
const HELP = require('../constants/help');

function buildCategoryButtonId(categoryId) {
  return `${HELP.buttonPrefix}${categoryId}`;
}

function parseCategoryButtonId(customId) {
  if (!customId.startsWith(HELP.buttonPrefix)) return null;
  return customId.slice(HELP.buttonPrefix.length);
}

/**
 * Yetki etiketi → config rol ID'leri eşlemesi (canlı config'den okunur).
 * Bilinmeyen etiketler (Herkes, Yönetici vb.) düz metin olarak kalır.
 */
function buildPermRoleMap() {
  const cfg = getConfig();
  const ids = cfg.ids || {};
  const roles = ids.roles || {};
  return {
    'üst yönetim': [roles.ustYonetim],
    'bot command': [ids.botCommandRole],
    staff: [ids.staffRole],
    banhammer: [roles.banhammer],
    'yetkili sorumlusu': [roles.yetkiliSorumlusu],
    'ekip sorumlusu': cfg.ekipOlustur?.allowedRoleIds?.length
      ? cfg.ekipOlustur.allowedRoleIds
      : [roles.ekipSorumlusu],
    'streamer rolü': [cfg.streamer?.roleId],
    streamer: [cfg.streamer?.roleId],
    "config'de tanımlı roller": cfg.meslek?.allowedRoleIds || [],
  };
}

function getAllPermRoleIds() {
  const map = buildPermRoleMap();
  const ids = [];
  for (const roleIds of Object.values(map)) {
    ids.push(...collectRoleIds(roleIds));
  }
  return [...new Set(ids)];
}

/** "Bot Command / Üst Yönetim" → canlı rol etiketleri (guild cache'den). */
function resolvePermMentions(perm, guild) {
  if (!perm) return '';
  const map = buildPermRoleMap();
  const segments = perm
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  const resolved = segments.map((seg) => {
    const roleIds = map[seg.toLowerCase()];
    if (roleIds && roleIds.length) {
      const mentions = formatRoleList(guild, roleIds.filter(Boolean));
      if (mentions && mentions !== '—') return mentions;
    }
    return seg;
  });

  return resolved.join(' / ');
}

function formatCommandBlock(cmd, guild) {
  return (
    `**${cmd.name}** · ${resolvePermMentions(cmd.perm, guild)}\n` +
    `${cmd.desc}\n` +
    `└ \`${cmd.usage}\``
  );
}

function buildCategoryBody(categoryId, guild) {
  const category = HELP.categories[categoryId];
  if (!category) return HELP.overview;

  if (categoryId === 'genel') {
    return HELP.overview;
  }

  const blocks = category.commands.map((cmd) => formatCommandBlock(cmd, guild));
  return blocks.join('\n\n');
}

function buildHelpPayload(categoryId = 'genel', guild = null) {
  const safeId = HELP.categoryOrder.includes(categoryId) ? categoryId : 'genel';
  const category = HELP.categories[safeId];
  const config = getConfig();

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  const title = safeId === 'genel' ? HELP.title : category.title;

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${title}\n\n${buildCategoryBody(safeId, guild)}`)
  );

  container.addSeparatorComponents((sep) => sep);

  const buttons = HELP.categoryOrder.map((id) => {
    const cat = HELP.categories[id];
    return new ButtonBuilder()
      .setCustomId(buildCategoryButtonId(id))
      .setLabel(cat.label)
      .setStyle(id === safeId ? ButtonStyle.Primary : ButtonStyle.Secondary);
  });

  for (let i = 0; i < buttons.length; i += 5) {
    const rowButtons = buttons.slice(i, i + 5);
    container.addActionRowComponents((row) => row.addComponents(...rowButtons));
  }

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  const roleIds = getAllPermRoleIds();

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: roleIds.length ? { roles: roleIds, users: [] } : { parse: [] },
  };
}

async function handleHelpCategoryButton(interaction) {
  if (!canViewHelp(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: HELP.noPermission }));
  }

  const categoryId = parseCategoryButtonId(interaction.customId);
  if (!categoryId) return;

  const payload = buildHelpPayload(categoryId, interaction.guild);
  return interaction.update(payload);
}

module.exports = {
  buildHelpPayload,
  handleHelpCategoryButton,
  buildCategoryButtonId,
};
