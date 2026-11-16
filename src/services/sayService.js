const { ContainerBuilder, MessageFlags } = require('discord.js');
const { getIds, getConfig } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { buildMarkdownTable } = require('./userActivityService');
const SAY = require('../constants/say');
const { ephemeralPayload } = require('../utils/interaction');

function isPlaceholderRole(id) {
  return !id || String(id).includes('ROL_ID') || String(id).includes('_ID');
}

function countRoleMembers(guild, roleId) {
  if (isPlaceholderRole(roleId)) return 0;
  let count = 0;
  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;
    if (member.roles.cache.has(roleId)) count += 1;
  }
  return count;
}

async function getUrlUsage(guild) {
  let total = 0;

  try {
    const vanity = await guild.fetchVanityData();
    total += vanity?.uses ?? 0;
  } catch {
    /* vanity yok veya yetki yok */
  }

  try {
    const invites = await guild.invites.fetch();
    for (const invite of invites.values()) {
      total += invite.uses ?? 0;
    }
  } catch {
    /* davet listesi alınamadı */
  }

  return total;
}

async function collectServerStats(guild) {
  const ids = getIds();
  const urlUsage = await getUrlUsage(guild);

  return {
    totalMembers: guild.memberCount ?? guild.members.cache.size,
    whitelistCount: countRoleMembers(guild, ids.whitelistRoleId),
    kayitsizCount: countRoleMembers(guild, ids.kayitsizRoleId),
    urlUsage,
  };
}

function buildSayPayload(stats) {
  const config = getConfig();
  const P = SAY.panel;

  const table = buildMarkdownTable(
    [P.colMetric, P.colValue],
    [
      [P.rowMembers, String(stats.totalMembers)],
      [P.rowWhitelist, String(stats.whitelistCount)],
      [P.rowKayitsiz, String(stats.kayitsizCount)],
      [P.rowUrl, String(stats.urlUsage)],
    ]
  );

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${P.title}\n\n${P.tableTitle}\n${table}`)
  );

  const imageUrl = config.panel?.imageUrl?.trim();
  if (imageUrl) {
    container.addSeparatorComponents((sep) => sep);
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) => item.setURL(imageUrl).setDescription(P.title))
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

async function executeSay(interaction) {
  await interaction.deferReply();

  try {
    const stats = await collectServerStats(interaction.guild);
    return interaction.editReply(buildSayPayload(stats));
  } catch (err) {
    console.error('[Say]', err?.message || err);
    return interaction.editReply(
      ephemeralPayload({ content: SAY.messages.failed })
    );
  }
}

module.exports = { executeSay, collectServerStats, buildSayPayload };
