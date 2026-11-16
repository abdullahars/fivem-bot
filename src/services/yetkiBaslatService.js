const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { getIds, getConfig, getYetkiBaslatSettings } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const { baseEmbed } = require('../utils/embedBuilder');
const { applyButtonEmoji } = require('../utils/buttonEmoji');
const { ephemeralPayload } = require('../utils/interaction');
const { canStartYetki } = require('../utils/permissions');
const { recordStaffStart } = require('./statsService');
const YB = require('../constants/yetkiBaslat');

const LEVELS = ['l1', 'l2', 'l3'];

function buildSelectId(level, targetId) {
  return `${YB.prefix}:select:${level}:${targetId}`;
}

function parseSelectId(customId) {
  const parts = customId.split(':');
  if (parts[0] !== YB.prefix || parts[1] !== 'select' || parts.length < 4) return null;
  const level = parts[2];
  if (!LEVELS.includes(level)) return null;
  return { level, targetId: parts[3] };
}

function getLevelRoleId(level) {
  const { levels } = getYetkiBaslatSettings();
  return levels[level] || null;
}

function getAllLevelRoleIds() {
  const { levels } = getYetkiBaslatSettings();
  return LEVELS.map((k) => levels[k]).filter(Boolean);
}

function buildYetkiBaslatEmbed(targetUser, startedBy) {
  const config = getConfig();
  const embed = baseEmbed()
    .setTitle(YB.title)
    .setDescription(
      formatTemplate(YB.description, {
        target: targetUser.toString(),
      })
    )
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
    .setFooter({
      text: `Başlatan: ${startedBy.tag}`,
    });

  const row = new ActionRowBuilder();
  for (const level of LEVELS) {
    const def = YB.buttons[level];
    const btn = applyButtonEmoji(
      new ButtonBuilder()
        .setCustomId(buildSelectId(level, targetUser.id))
        .setLabel(def.label)
        .setStyle(ButtonStyle.Primary),
      def.emoji
    );
    row.addComponents(btn);
  }

  return { embeds: [embed], components: [row] };
}

async function applyYetkiLevel(guild, member, level, startedById) {
  const ids = getIds();
  const staffRoleId = ids.staffRoleId;
  const levelRoleId = getLevelRoleId(level);

  if (!staffRoleId || staffRoleId.includes('ROL_ID')) {
    return { ok: false, reason: YB.staffRoleMissing };
  }
  if (!levelRoleId) {
    return {
      ok: false,
      reason: formatTemplate(YB.levelNotConfigured, {
        level: YB.levelLabels[level] || level.toUpperCase(),
      }),
    };
  }

  const me = guild.members.me;
  const staffRole = guild.roles.cache.get(staffRoleId);
  const levelRole = guild.roles.cache.get(levelRoleId);
  if (!staffRole || !levelRole) {
    return { ok: false, reason: YB.levelNotConfigured.replace('{level}', level.toUpperCase()) };
  }
  if (
    !me?.permissions.has('ManageRoles') ||
    staffRole.position >= me.roles.highest.position ||
    levelRole.position >= me.roles.highest.position
  ) {
    return { ok: false, reason: YB.botRoleTooLow };
  }

  const removeIds = getAllLevelRoleIds().filter(
    (id) => id !== levelRoleId && member.roles.cache.has(id)
  );
  if (removeIds.length) {
    await member.roles.remove(removeIds, 'Yetki başlat — seviye değişimi').catch(() => {});
  }

  const toAdd = [];
  if (!member.roles.cache.has(staffRoleId)) toAdd.push(staffRoleId);
  if (!member.roles.cache.has(levelRoleId)) toAdd.push(levelRoleId);
  if (toAdd.length) {
    try {
      await member.roles.add(toAdd, `Yetki başlat — ${YB.levelLabels[level]}`);
    } catch (err) {
      console.error('[YetkiBaslat] Rol verilemedi:', err?.message || err);
      return { ok: false, reason: YB.botRoleTooLow };
    }
  }

  await recordStaffStart(guild.id, member.id, level, startedById);

  const startedAt = Math.floor(Date.now() / 1000);
  return {
    ok: true,
    startedAt: `<t:${startedAt}:F>`,
    levelLabel: YB.levelLabels[level],
  };
}

async function handleYetkiBaslatCommand(interaction) {
  if (!canStartYetki(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: YB.noPermission }));
  }

  const targetUser = interaction.options.getUser('kullanici', true);
  if (targetUser.bot) {
    return interaction.reply(ephemeralPayload({ content: YB.targetIsBot }));
  }

  const payload = buildYetkiBaslatEmbed(targetUser, interaction.user);
  await interaction.reply(payload);
}

async function handleYetkiBaslatButton(interaction) {
  if (!canStartYetki(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: YB.noPermission }));
  }

  const parsed = parseSelectId(interaction.customId);
  if (!parsed) return;

  const member = await interaction.guild.members.fetch(parsed.targetId).catch(() => null);
  if (!member) {
    return interaction.reply(ephemeralPayload({ content: YB.noTarget }));
  }

  await interaction.deferUpdate();

  const result = await applyYetkiLevel(
    interaction.guild,
    member,
    parsed.level,
    interaction.user.id
  );

  if (!result.ok) {
    return interaction.editReply({ content: result.reason, embeds: [], components: [] });
  }

  const successText = formatTemplate(YB.success, {
    target: member.toString(),
    level: result.levelLabel,
    startedAt: result.startedAt,
  });

  const doneEmbed = EmbedBuilder.from(interaction.message.embeds[0] || new EmbedBuilder())
    .setColor(parseEmbedColor(getConfig().bot.embedColor))
    .setDescription(`${interaction.message.embeds[0]?.description || ''}\n\n${successText}`);

  const disabledRow = new ActionRowBuilder();
  for (const level of LEVELS) {
    const def = YB.buttons[level];
    const btn = applyButtonEmoji(
      new ButtonBuilder()
        .setCustomId(`${buildSelectId(level, parsed.targetId)}:done`)
        .setLabel(def.label)
        .setStyle(parsed.level === level ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(true),
      def.emoji
    );
    disabledRow.addComponents(btn);
  }

  await interaction.editReply({
    embeds: [doneEmbed],
    components: [disabledRow],
  });
}

module.exports = {
  buildYetkiBaslatEmbed,
  handleYetkiBaslatCommand,
  handleYetkiBaslatButton,
  parseSelectId,
};
