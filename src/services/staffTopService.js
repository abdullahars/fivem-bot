const { ContainerBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, MessageFlags } = require('discord.js');
const { StaffStats } = require('../database/models/StaffStats');
const { getStaffTopSettings } = require('../config/loadConfig');
const ST = require('../constants/staffTop');
const { formatTemplate } = require('../utils/format');
const { getConfig } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { applyButtonEmoji } = require('../utils/buttonEmoji');
const { getOrCreateStats } = require('./statsService');
const { ephemeralPayload } = require('../utils/interaction');

const REFRESH_ID = 'stafftop:refresh';
const MY_STATS_ID = 'stafftop:mystats';
const GAP_ID = 'stafftop:gap';

const STAT_CATEGORIES = [
  {
    key: 'kayit',
    label: 'Kayıt (WL)',
    score: (e) => e.totalWhitelistVer || 0,
    today: (e) => e.todayWhitelistVer || 0,
  },
  {
    key: 'ticket',
    label: 'Ticket',
    score: (e) => e.totalClaimed || 0,
    today: (e) => e.todayClaimed || 0,
  },
  {
    key: 'ic',
    label: 'IC Onay',
    score: (e) => e.totalIcOnay || 0,
    today: (e) => e.todayIcOnay || 0,
  },
  {
    key: 'destek',
    label: 'Destek',
    score: (e) => e.totalSupportReceived || 0,
    today: (e) => e.todaySupportReceived || 0,
  },
  {
    key: 'ekip',
    label: 'Ekip Açma',
    score: (e) => e.totalEkipAc || 0,
    today: (e) => e.todayEkipAc || 0,
  },
];

function kayitScore(entry) {
  return entry.totalWhitelistVer || 0;
}

function buildStaffTopButtonRow() {
  const refreshBtn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId(REFRESH_ID)
      .setLabel(ST.button.label)
      .setStyle(ButtonStyle.Primary),
    ST.button.emoji
  );
  const myStatsBtn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId(MY_STATS_ID)
      .setLabel(ST.myStats.label)
      .setStyle(ButtonStyle.Secondary),
    ST.myStats.emoji
  );
  const gapBtn = applyButtonEmoji(
    new ButtonBuilder()
      .setCustomId(GAP_ID)
      .setLabel(ST.gap.label)
      .setStyle(ButtonStyle.Secondary),
    ST.gap.emoji
  );

  return new ActionRowBuilder().addComponents(myStatsBtn, gapBtn, refreshBtn);
}

function calcGap(userId, userScore, board, limit) {
  const rank = board.findIndex((e) => e.userId === userId);
  if (rank >= 0) {
    return { onList: true, rank: rank + 1, score: userScore, needed: 0, cutoff: board[rank].score };
  }

  if (!board.length) {
    return { onList: false, score: userScore, needed: Math.max(1, 1 - userScore), cutoff: 0 };
  }

  const cutoff = board[Math.min(board.length, limit) - 1]?.score ?? 0;
  if (board.length < limit) {
    const needed = Math.max(1, cutoff + 1) - userScore;
    return { onList: false, score: userScore, needed: Math.max(0, needed), cutoff };
  }

  const needed = cutoff + 1 - userScore;
  return { onList: false, score: userScore, needed: Math.max(1, needed), cutoff };
}

async function buildMyStatsMessage(guild, userId) {
  const stats = await getOrCreateStats(guild.id, userId);
  const user = await guild.client.users.fetch(userId).catch(() => null);
  const userLabel = user ? user.toString() : `<@${userId}>`;

  const hasAny = STAT_CATEGORIES.some((cat) => cat.score(stats) > 0);
  if (!hasAny) {
    return formatTemplate(`${ST.myStatsTitle}\n\n${ST.myStatsEmpty}`, { user: userLabel });
  }

  const lines = STAT_CATEGORIES.map((cat) =>
    formatTemplate(ST.myStatsLine, {
      label: cat.label,
      total: String(cat.score(stats)),
      today: String(cat.today(stats)),
    })
  );

  return `${formatTemplate(ST.myStatsTitle, { user: userLabel })}\n\n${lines.join('\n')}`;
}

async function buildGapMessage(guild, userId) {
  const boards = await fetchLeaderboards(guild.id);
  const stats = await getOrCreateStats(guild.id, userId);
  const user = await guild.client.users.fetch(userId).catch(() => null);
  const userLabel = user ? user.toString() : `<@${userId}>`;

  const boardMap = {
    kayit: boards.kayit,
    ticket: boards.ticket,
    ic: boards.ic,
    destek: boards.destek,
    ekip: boards.ekip,
  };

  const lines = STAT_CATEGORIES.map((cat) => {
    const userScore = cat.score(stats);
    const board = boardMap[cat.key];
    const gap = calcGap(userId, userScore, board, boards.limit);

    if (gap.onList) {
      return formatTemplate(ST.gapOnList, {
        label: cat.label,
        rank: String(gap.rank),
        score: String(gap.score),
      });
    }

    if (!board.length) {
      return formatTemplate(ST.gapNeedEmpty, {
        label: cat.label,
        needed: String(gap.needed),
      });
    }

    return formatTemplate(ST.gapNeed, {
      label: cat.label,
      needed: String(gap.needed),
      score: String(gap.score),
      cutoff: String(gap.cutoff),
    });
  });

  return `${formatTemplate(ST.gapTitle, { user: userLabel })}\n\n${lines.join('\n')}`;
}

async function handleStaffTopMyStats(interaction) {
  const content = await buildMyStatsMessage(interaction.guild, interaction.user.id);
  await interaction.reply(ephemeralPayload({ content }));
}

async function handleStaffTopGap(interaction) {
  const content = await buildGapMessage(interaction.guild, interaction.user.id);
  await interaction.reply(ephemeralPayload({ content }));
}

function sortAndSlice(entries, scoreFn, limit) {
  return entries
    .map((e) => ({ ...e, score: scoreFn(e) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function formatBoard(entries, emptyText) {
  if (!entries.length) return emptyText;

  return entries
    .map((e, i) =>
      formatTemplate(ST.row, {
        rank: i + 1,
        user: `<@${e.userId}>`,
        count: e.score,
      })
    )
    .join('\n');
}

async function fetchLeaderboards(guildId) {
  const { limit } = getStaffTopSettings();
  const all = await StaffStats.find({ guildId }).lean();

  return {
    limit,
    kayit: sortAndSlice(all, kayitScore, limit),
    ticket: sortAndSlice(all, (e) => e.totalClaimed || 0, limit),
    ic: sortAndSlice(all, (e) => e.totalIcOnay || 0, limit),
    destek: sortAndSlice(all, (e) => e.totalSupportReceived || 0, limit),
    ekip: sortAndSlice(all, (e) => e.totalEkipAc || 0, limit),
  };
}

function buildChartUrl(boards, guild) {
  // Top kullanıcıların gerçek isimlerini al
  const allUsers = new Map();
  
  // Tüm boardlardan kullanıcıları topla
  [...boards.kayit, ...boards.ticket, ...boards.ic, ...boards.destek, ...boards.ekip].forEach(entry => {
    if (entry && entry.userId && !allUsers.has(entry.userId)) {
      const member = guild.members.cache.get(entry.userId);
      const username = member?.user?.username || member?.displayName || `User ${entry.userId.slice(0, 4)}`;
      allUsers.set(entry.userId, {
        username: username.slice(0, 15), // Limit username length
        kayit: 0,
        ticket: 0,
        ic: 0,
        destek: 0,
        ekip: 0,
      });
    }
  });

  // Her kullanıcının skorlarını topla
  boards.kayit.forEach(entry => {
    if (allUsers.has(entry.userId)) {
      allUsers.get(entry.userId).kayit = entry.score;
    }
  });
  boards.ticket.forEach(entry => {
    if (allUsers.has(entry.userId)) {
      allUsers.get(entry.userId).ticket = entry.score;
    }
  });
  boards.ic.forEach(entry => {
    if (allUsers.has(entry.userId)) {
      allUsers.get(entry.userId).ic = entry.score;
    }
  });
  boards.destek.forEach(entry => {
    if (allUsers.has(entry.userId)) {
      allUsers.get(entry.userId).destek = entry.score;
    }
  });
  boards.ekip.forEach(entry => {
    if (allUsers.has(entry.userId)) {
      allUsers.get(entry.userId).ekip = entry.score;
    }
  });

  // Toplam skora göre sırala ve top 5'i al
  const sortedUsers = Array.from(allUsers.entries())
    .map(([userId, data]) => ({
      userId,
      ...data,
      total: data.kayit + data.ticket + data.ic + data.destek + data.ekip,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const labels = sortedUsers.map(u => u.username);
  const whitelistData = sortedUsers.map(u => u.kayit);
  const ticketData = sortedUsers.map(u => u.ticket);
  const icData = sortedUsers.map(u => u.ic);
  const destekData = sortedUsers.map(u => u.destek);
  const ekipData = sortedUsers.map(u => u.ekip);

  // Compact chart config
  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'WL',
          data: whitelistData,
          backgroundColor: '#36A2EB',
        },
        {
          label: 'Ticket',
          data: ticketData,
          backgroundColor: '#FF9F40',
        },
        {
          label: 'IC',
          data: icData,
          backgroundColor: '#4BC0C0',
        },
        {
          label: 'Destek',
          data: destekData,
          backgroundColor: '#9966FF',
        },
        {
          label: 'Ekip',
          data: ekipData,
          backgroundColor: '#E74C3C',
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: 'Yetkili İstatistik',
        fontColor: '#fff',
        fontSize: 16
      },
      legend: {
        display: true,
        position: 'top',
        labels: { fontColor: '#fff' }
      },
      scales: {
        yAxes: [{
          ticks: { beginAtZero: true, fontColor: '#fff' },
          gridLines: { color: 'rgba(255,255,255,0.1)' }
        }],
        xAxes: [{
          ticks: { fontColor: '#fff' },
          gridLines: { color: 'rgba(255,255,255,0.1)' }
        }]
      }
    }
  };

  const encodedChart = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encodedChart}&bkg=rgb(44,47,51)&w=800&h=400`;
}

async function buildStaffTopPayload(guild) {
  const boards = await fetchLeaderboards(guild.id);
  const config = getConfig();
  const now = new Date();

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  // Başlık
  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${ST.title}\n${ST.description}`)
  );

  container.addSeparatorComponents((sep) => sep);

  // Tüm liderlik tablolarını tek text display'de göster
  const allBoards = [
    `**${formatTemplate(ST.boards.kayit.title, { limit: boards.limit })}**\n${formatBoard(boards.kayit, ST.boards.kayit.empty)}`,
    `**${formatTemplate(ST.boards.ticket.title, { limit: boards.limit })}**\n${formatBoard(boards.ticket, ST.boards.ticket.empty)}`,
    `**${formatTemplate(ST.boards.ic.title, { limit: boards.limit })}**\n${formatBoard(boards.ic, ST.boards.ic.empty)}`,
    `**${formatTemplate(ST.boards.destek.title, { limit: boards.limit })}**\n${formatBoard(boards.destek, ST.boards.destek.empty)}`,
    `**${formatTemplate(ST.boards.ekip.title, { limit: boards.limit })}**\n${formatBoard(boards.ekip, ST.boards.ekip.empty)}`,
  ].join('\n\n');

  container.addTextDisplayComponents((td) =>
    td.setContent(allBoards)
  );

  container.addSeparatorComponents((sep) => sep);

  // Grafik ekle
  const chartUrl = buildChartUrl(boards, guild);
  container.addMediaGalleryComponents((gallery) =>
    gallery.addItems((item) =>
      item.setURL(chartUrl).setDescription('Yetkili İstatistik')
    )
  );

  container.addSeparatorComponents((sep) => sep);

  container.addTextDisplayComponents((td) => td.setContent(ST.buttonsHint));
  container.addActionRowComponents(buildStaffTopButtonRow());

  // Footer
  const time = now.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const footerText = formatTemplate(ST.footer, { time });
  const fullFooter = config.bot.footer?.trim() 
    ? `${footerText} • ${config.bot.footer}` 
    : footerText;

  container.addSeparatorComponents((sep) => sep.setDivider(false));
  container.addTextDisplayComponents((td) =>
    td.setContent(`-# ${fullFooter}`)
  );

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

async function handleStaffTopRefresh(interaction) {
  const payload = await buildStaffTopPayload(interaction.guild);
  await interaction.editReply({ ...payload, content: null });
}

module.exports = {
  buildStaffTopPayload,
  handleStaffTopRefresh,
  handleStaffTopMyStats,
  handleStaffTopGap,
  REFRESH_ID,
  MY_STATS_ID,
  GAP_ID,
};
