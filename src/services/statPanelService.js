const {
  ActionRowBuilder,
  ButtonBuilder,
  ContainerBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { buildStatData } = require('./statsService');
const {
  buildActivityStatData,
  buildMarkdownTable,
  formatVoiceDuration,
} = require('./userActivityService');
const { getConfig, getWhitelistSettings, getCoinSettings } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const STAT = require('../constants/stat');
const { getStaffKayitRatingSummary } = require('./kayitPuanService');
const COIN = require('../constants/coin');
const { getBalance, formatCoin } = require('./coinService');

const PAGES = ['ozet', 'ticket', 'ic', 'register', 'ekip', 'destek', 'mesaj', 'ses'];

function buildTabId(page, userId) {
  return `stat:tab:${page}:${userId}`;
}

function parseTabId(customId) {
  const parts = customId.split(':');
  if (parts[0] !== 'stat' || parts[1] !== 'tab' || parts.length < 4) return null;
  return { page: parts[2], userId: parts[3] };
}

function addOzetButtonRow(container, userId, buttons) {
  container.addActionRowComponents((row) =>
    row.addComponents(
      ...buttons.map(({ page, label }) =>
        new ButtonBuilder()
          .setCustomId(buildTabId(page, userId))
          .setLabel(label)
          .setStyle(ButtonStyle.Secondary)
      )
    )
  );
}

async function buildStatPanel(guild, user, page = 'ozet') {
  const safePage = PAGES.includes(page) ? page : 'ozet';
  const [data, activity] = await Promise.all([
    buildStatData(guild.id, user.id),
    buildActivityStatData(guild, user.id),
  ]);
  const merged = { ...data, ...activity };
  const config = getConfig();

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  const pageDef = STAT.panel.pages[safePage];
  container.addTextDisplayComponents((td) =>
    td.setContent(`## Personel İstatistikleri\n### ${user.username} — ${pageDef.label}`)
  );

  container.addSeparatorComponents((sep) => sep);

  switch (safePage) {
    case 'ticket':
      buildTicketPage(container, merged);
      break;
    case 'ic':
      buildIcPage(container, merged);
      break;
    case 'register':
      buildRegisterPage(container, merged);
      break;
    case 'ekip':
      buildEkipPage(container, merged);
      break;
    case 'destek':
      buildDestekPage(container, merged);
      break;
    case 'mesaj':
      buildMesajPage(container, merged);
      break;
    case 'ses':
      buildSesPage(container, merged);
      break;
    default:
      buildOzetPage(container, merged, user.id);
  }

  container.addSeparatorComponents((sep) => sep);

  if (safePage !== 'ozet') {
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((td) => td.setContent('**Ana Sayfaya Dön**'))
        .setButtonAccessory((button) =>
          button
            .setCustomId(buildTabId('ozet', user.id))
            .setLabel('Genel Özet')
            .setStyle(ButtonStyle.Primary)
        )
    );
  }

  if (getWhitelistSettings().kayitPuanEnabled) {
    const rating = await getStaffKayitRatingSummary(guild.id, user.id);
    const kayitPuanLine = rating
      ? STAT.labels.kayitPuanAvg
          .replace('{avg}', rating.averageText)
          .replace('{stars}', rating.stars)
          .replace('{count}', String(rating.count))
      : STAT.labels.kayitPuanEmpty;

    container.addSeparatorComponents((sep) => sep);
    container.addTextDisplayComponents((td) => td.setContent(kayitPuanLine));
  }

  if (getCoinSettings().enabled) {
    const coin = await getBalance(guild.id, user.id);
    container.addSeparatorComponents((sep) => sep);
    container.addTextDisplayComponents((td) =>
      td.setContent(`${COIN.emoji} **Coin:** ${formatCoin(coin.balance)}`)
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

function buildOzetPage(container, data, userId) {
  const A = STAT.panel.activity;

  const statusTable = buildMarkdownTable(
    [A.colMetric, A.colValue],
    [
      ['Durum', data.statusLine],
      ['Sıra', String(data.rank)],
      ['Yetki Seviyesi', data.staffLevel || '—'],
      ['Yetki Başlangıcı', data.staffStartedAt || '—'],
    ]
  );

  const gorevTable = buildMarkdownTable(
    [A.colGroup, A.colMetric, A.colValue],
    [
      ['Ticket', 'Kapatılan', String(data.totalClosed)],
      ['Ticket', 'İlgilenilen', String(data.totalClaimed)],
      ['Kayıt', 'WL Verilen', String(data.totalWlVer)],
      ['Kayıt', 'Kayıtsız', String(data.totalKayitsiz)],
      ['IC', 'Onay / Red', `${data.totalIcOnay} / ${data.totalIcRed}`],
      ['Destek', 'Alınan', String(data.totalSupportReceived)],
      ['Destek', 'Yardım', String(data.totalSupportProvided)],
      ['Ekip', 'Açma', String(data.totalEkipAc)],
      ['Ekip', 'Kapatma', String(data.totalEkipKapat)],
      ['Ekip', 'Referans', String(data.totalEkipReferans || 0)],
    ]
  );

  const performansTable = buildMarkdownTable(
    [A.colMetric, A.colValue],
    [
      ['Ort. İlgilenme', data.avgClaim],
      ['Ort. Kapatma', data.avgClose],
    ]
  );

  const aktiviteBlock =
    `**Mesaj** · Toplam **${data.totalMessages}**\n${data.top3MessagesList}\n\n` +
    `**Ses** · Toplam **${data.totalVoiceText}** · Mik **${data.totalMicText || '—'}** · Kulaklık **${data.totalDeafText || '—'}**\n` +
    `${data.top3VoiceList}`;

  container.addTextDisplayComponents((td) =>
    td.setContent(`${statusTable}\n\n${A.tableGorev}\n${gorevTable}`)
  );

  addOzetButtonRow(container, userId, [
    { page: 'ticket', label: 'Ticket' },
    { page: 'register', label: 'Kayıt' },
    { page: 'ic', label: 'IC' },
    { page: 'destek', label: 'Destek' },
    { page: 'ekip', label: 'Ekip' },
  ]);

  container.addSeparatorComponents((sep) => sep);

  container.addTextDisplayComponents((td) =>
    td.setContent(`${A.tableAktivite}\n${aktiviteBlock}`)
  );

  addOzetButtonRow(container, userId, [
    { page: 'mesaj', label: 'Mesaj Detay' },
    { page: 'ses', label: 'Ses Detay' },
  ]);

  container.addSeparatorComponents((sep) => sep);

  container.addTextDisplayComponents((td) =>
    td.setContent(`${A.tablePerformans}\n${performansTable}`)
  );
}

function buildSummaryTable(rows) {
  const A = STAT.panel.activity;
  return buildMarkdownTable([A.colMetric, A.colValue], rows);
}

function buildPeriodTable(rows) {
  const A = STAT.panel.activity;
  return buildMarkdownTable(
    [A.colMetric, A.colToday, A.colWeek, A.colMonth],
    rows
  );
}

function addDetailContent(container, sections) {
  container.addTextDisplayComponents((td) =>
    td.setContent(sections.filter(Boolean).join('\n\n'))
  );
}

function buildMesajPage(container, data) {
  const A = STAT.panel.activity;
  const ozet = buildSummaryTable([['Toplam Mesaj', String(data.totalMessages)]]);
  addDetailContent(container, [
    `${A.tableOzet}\n${ozet}`,
    `${A.tableChannels}\n${A.detailIntro}\n${data.top10MessagesList}`,
  ]);
}

function buildSesPage(container, data) {
  const A = STAT.panel.activity;
  const ozet = buildSummaryTable([['Toplam Ses', data.totalVoiceText]]);
  addDetailContent(container, [
    `${A.tableOzet}\n${ozet}`,
    `${A.tableChannels}\n${A.detailIntro}\n${data.top10VoiceList}`,
  ]);
}

function buildTicketPage(container, data) {
  const A = STAT.panel.activity;
  addDetailContent(container, [
    `${A.tableOzet}\n${buildSummaryTable([
      ['Kapatılan', String(data.totalClosed)],
      ['İlgilenilen', String(data.totalClaimed)],
      ['Sıra', String(data.rank)],
    ])}`,
    `${A.tablePeriod}\n${buildPeriodTable([
      ['Kapatılan', data.todayClosed, data.weekClosed, data.monthClosed],
    ])}`,
    `${A.tableCategory}\n${buildMarkdownTable(
      [A.colCategory, A.colValue],
      [
        ['IC', String(data.cat.ic)],
        ['OOC', String(data.cat.ooc)],
        ['AC', String(data.cat.ac)],
      ]
    )}`,
    `${A.tableTicketMessages}\n${data.ticketChannelMessagesTable || A.noChannelData}`,
  ]);
}

function buildIcPage(container, data) {
  const A = STAT.panel.activity;
  addDetailContent(container, [
    `${A.tableOzet}\n${buildSummaryTable([
      ['Onay', String(data.totalIcOnay)],
      ['Red', String(data.totalIcRed)],
      ['Sıra', String(data.rank)],
    ])}`,
    `${A.tablePeriod}\n${buildPeriodTable([
      ['Onay', data.todayIcOnay, data.weekIcOnay, data.monthIcOnay],
      ['Red', data.todayIcRed, data.weekIcRed, data.monthIcRed],
    ])}`,
  ]);
}

function buildRegisterPage(container, data) {
  const A = STAT.panel.activity;
  addDetailContent(container, [
    `${A.tableOzet}\n${buildSummaryTable([
      ['WL Verilen', String(data.totalWlVer)],
      ['Kayıtsız', String(data.totalKayitsiz)],
      ['Sıra', String(data.rank)],
    ])}`,
    `${A.tablePeriod}\n${buildPeriodTable([
      ['WL Verilen', data.todayWlVer, data.weekWlVer, data.monthWlVer],
      ['Kayıtsız', data.todayKayitsiz, data.weekKayitsiz, data.monthKayitsiz],
    ])}`,
  ]);
}

function buildEkipPage(container, data) {
  const A = STAT.panel.activity;
  addDetailContent(container, [
    `${A.tableOzet}\n${buildSummaryTable([
      ['Ekip Açma', String(data.totalEkipAc)],
      ['Ekip Kapatma', String(data.totalEkipKapat)],
      ['Ekip Referans', String(data.totalEkipReferans || 0)],
      ['Sıra', String(data.rank)],
    ])}`,
    `${A.tablePeriod}\n${buildPeriodTable([
      ['Ekip Açma', data.todayEkipAc, data.weekEkipAc, data.monthEkipAc],
      [
        'Ekip Kapatma',
        data.todayEkipKapat,
        data.weekEkipKapat,
        data.monthEkipKapat,
      ],
    ])}`,
  ]);
}

function buildDestekPage(container, data) {
  const A = STAT.panel.activity;
  const d = data.destekStats || {};
  addDetailContent(container, [
    `${A.tableOzet}\n${buildSummaryTable([
      ['Destek Alınan', String(data.totalSupportReceived)],
      ['Destek Yardım', String(data.totalSupportProvided)],
      ['Sıra', String(data.rank)],
    ])}`,
    `${A.tablePeriod}\n${buildPeriodTable([
      [
        'Destek Alınan',
        data.todaySupportReceived,
        data.weekSupportReceived,
        data.monthSupportReceived,
      ],
      [
        'Destek Yardım',
        data.todaySupportProvided,
        data.weekSupportProvided,
        data.monthSupportProvided,
      ],
    ])}`,
    `${A.tableDestekActivity}\n${buildSummaryTable([
      ['Mesaj', String(d.messages || 0)],
      ['Ses', formatVoiceDuration(d.voiceMs || 0)],
      ['Mikrofon Açık', formatVoiceDuration(d.micMs || 0)],
      ['Kulaklık Açık', formatVoiceDuration(d.deafMs || 0)],
    ])}`,
    `${A.tableDestekVoice}\n${data.destekVoiceChannelsTable || A.noChannelData}`,
  ]);
}

async function handleStatTab(interaction) {
  const parsed = parseTabId(interaction.customId);
  if (!parsed) return;

  const targetUser = await interaction.client.users.fetch(parsed.userId).catch(() => null);
  if (!targetUser) {
    return interaction.reply({
      content: '❌ Kullanıcı bulunamadı.',
      ephemeral: true,
    });
  }

  await interaction.deferUpdate();

  const payload = await buildStatPanel(interaction.guild, targetUser, parsed.page);
  return interaction.editReply(payload);
}

module.exports = {
  buildStatPanel,
  handleStatTab,
  PAGES,
};
