const { ContainerBuilder, MessageFlags } = require('discord.js');
const { getTopStatSettings, getConfig } = require('../config/loadConfig');
const { getTopLeaderboard } = require('./statsService');
const TOP = require('../constants/topStat');
const { formatTemplate } = require('../utils/format');
const { parseEmbedColor } = require('../utils/colors');

async function formatBoard(entries, fieldKey) {
  if (!entries.length) return TOP.empty;

  const lines = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    lines.push(
      formatTemplate(TOP.row, {
        rank: i + 1,
        user: `<@${e.userId}>`,
        count: e[fieldKey] || 0,
      })
    );
  }
  return lines.join('\n');
}

async function buildTopStatEmbed(guild) {
  const { limit } = getTopStatSettings();
  const config = getConfig();
  const b = TOP.boards;

  const [closed, claimed, wlVer, icOnay] = await Promise.all([
    getTopLeaderboard(guild.id, b.ticketClosed.field, limit),
    getTopLeaderboard(guild.id, b.ticketClaimed.field, limit),
    getTopLeaderboard(guild.id, b.whitelistVer.field, limit),
    getTopLeaderboard(guild.id, b.icOnay.field, limit),
  ]);

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  // Başlık
  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${TOP.title}\n${formatTemplate(TOP.description, { limit })}`)
  );

  container.addSeparatorComponents((sep) => sep);

  // Liderlik tabloları - text display olarak ekle (section değil)
  const boards = [
    { title: b.ticketClosed.title, content: await formatBoard(closed, b.ticketClosed.field) },
    { title: b.ticketClaimed.title, content: await formatBoard(claimed, b.ticketClaimed.field) },
    { title: b.whitelistVer.title, content: await formatBoard(wlVer, b.whitelistVer.field) },
    { title: b.icOnay.title, content: await formatBoard(icOnay, b.icOnay.field) },
  ];

  boards.forEach(board => {
    container.addTextDisplayComponents((td) =>
      td.setContent(`**${board.title}**\n${board.content}`)
    );
  });

  // Footer
  if (config.bot?.footer?.trim()) {
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

module.exports = { buildTopStatEmbed };
