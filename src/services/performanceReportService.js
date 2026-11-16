const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { getConfig, getPerformanceSettings } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { ephemeralPayload } = require('../utils/interaction');
const { canUsePerformance, canRankCheck } = require('../utils/permissions');
const {
  getIstanbulWeekKey,
  getPreviousWeekKey,
  formatWeekLabel,
  msUntilNextIstanbulWeeklyReport,
} = require('../utils/isoWeek');
const {
  computeAndPersistWeek,
  getStoredWeek,
  getUserHistory,
  getConsecutiveWeeksAbove,
  checkRankEligibility,
  evaluateRankSuggestions,
} = require('./performanceService');
const { RankSuggestionLog } = require('../database/models/RankSuggestionLog');
const PERF = require('../constants/performance');

function panelFlags() {
  return MessageFlags.IsComponentsV2;
}

function fmtPct(n) {
  return `%${Math.round(n || 0)}`;
}

function resolveName(guild, userId, fallbackTag) {
  const member = guild?.members?.cache?.get(userId);
  if (member) return member.displayName || member.user.username;
  if (fallbackTag) return fallbackTag;
  return null;
}

function nameOrMention(guild, userId, fallbackTag) {
  return resolveName(guild, userId, fallbackTag) || `<@${userId}>`;
}

function formatCloseMs(ms) {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}

function buildAveragesLine(averages) {
  if (!averages) return '';
  return (
    `**Sunucu Ortalamaları (bu hafta)**\n` +
    `• Ticket kapatma: ${(averages.ticketKapatilan || 0).toFixed(1)}\n` +
    `• Kayıt: ${(averages.kayitToplam || 0).toFixed(1)} · IC: ${(averages.icToplam || 0).toFixed(1)}\n` +
    `• Destek: ${(averages.destekToplam || 0).toFixed(1)} · Ekip: ${(averages.ekipToplam || 0).toFixed(1)}\n` +
    `• Mesaj: ${(averages.mesaj || 0).toFixed(0)} · Ort. kapatma: ${formatCloseMs(averages.avgCloseMs)}`
  );
}

function addLongText(container, lines) {
  let buffer = '';
  for (const line of lines) {
    if ((buffer + line + '\n').length > 3500) {
      const chunk = buffer;
      container.addTextDisplayComponents((td) => td.setContent(chunk));
      buffer = '';
    }
    buffer += `${line}\n`;
  }
  if (buffer.trim()) {
    const chunk = buffer;
    container.addTextDisplayComponents((td) => td.setContent(chunk));
  }
}

function statusSegment(row, streak, eligible, settings) {
  if (row.perfPct >= settings.ustEsik) {
    let seg = `${PERF.labels.above} ${streak}. haftadır üstte`;
    if (eligible) seg += ` ${PERF.labels.bell}`;
    return seg;
  }
  if (row.perfPct >= 100) return PERF.labels.around;
  return PERF.labels.belowAvg;
}

/** /lb — bu haftanın liderlik tablosu */
async function buildLeaderboardPayload(guild, weekKey, result) {
  const config = getConfig();
  const settings = getPerformanceSettings();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${PERF.labels.lbTitle}\n_${formatWeekLabel(weekKey)}_`)
  );
  container.addSeparatorComponents((sep) => sep);

  const rows = result.rows;
  if (!rows.length) {
    container.addTextDisplayComponents((td) => td.setContent(PERF.messages.noData));
    return { embeds: [], components: [container], flags: panelFlags() };
  }

  // Üstte olanlar için streak + uygunluk
  const meta = new Map();
  await Promise.all(
    rows.map(async (row) => {
      if (row.perfPct >= settings.ustEsik) {
        const [streak, elig] = await Promise.all([
          getConsecutiveWeeksAbove(guild.id, row.uid, weekKey),
          checkRankEligibility(guild.id, row.uid, weekKey),
        ]);
        meta.set(row.uid, { streak, eligible: elig.eligible });
      } else {
        meta.set(row.uid, { streak: 0, eligible: false });
      }
    })
  );

  const lines = rows.map((row, i) => {
    const rank = i < PERF.medals.length ? PERF.medals[i] : `**${i + 1}.**`;
    const name = nameOrMention(guild, row.uid, row.userTag);
    const m = meta.get(row.uid) || { streak: 0, eligible: false };
    return `${rank} ${name} · ${fmtPct(row.perfPct)} · ${statusSegment(row, m.streak, m.eligible, settings)}`;
  });

  addLongText(container, lines);
  container.addSeparatorComponents((sep) => sep);
  container.addTextDisplayComponents((td) => td.setContent(buildAveragesLine(result.averages)));

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) => td.setContent(`-# ${config.bot.footer}`));
  }

  return { embeds: [], components: [container], flags: panelFlags() };
}

async function executeLeaderboard(interaction) {
  if (!getPerformanceSettings().enabled) {
    return interaction.reply(ephemeralPayload({ content: PERF.messages.disabled }));
  }
  if (!canUsePerformance(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: PERF.messages.noPermission }));
  }

  await interaction.deferReply();
  const weekKey = getIstanbulWeekKey();
  const result = await computeAndPersistWeek(interaction.guild, weekKey);
  const payload = await buildLeaderboardPayload(interaction.guild, weekKey, result);
  return interaction.editReply(payload);
}

function progressBar(pct) {
  const blocks = Math.max(0, Math.min(20, Math.round((pct || 0) / 10)));
  return '█'.repeat(blocks) + '░'.repeat(20 - blocks);
}

function computeTrend(pcts) {
  if (pcts.length < 2) return PERF.labels.trendStable;
  const first = pcts[0];
  const last = pcts[pcts.length - 1];
  if (last - first >= 8) return PERF.labels.trendUp;
  if (first - last >= 8) return PERF.labels.trendDown;
  return PERF.labels.trendStable;
}

/** /profil @kullanici — son 4 hafta grafiği */
async function executeProfil(interaction) {
  if (!getPerformanceSettings().enabled) {
    return interaction.reply(ephemeralPayload({ content: PERF.messages.disabled }));
  }
  if (!canUsePerformance(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: PERF.messages.noPermission }));
  }

  const target = interaction.options.getUser('kullanici', true);
  await interaction.deferReply();

  const settings = getPerformanceSettings();
  const history = await getUserHistory(interaction.guild.id, target.id, 4);
  const ordered = [...history].reverse(); // eski → yeni

  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  const name = nameOrMention(interaction.guild, target.id, target.tag);
  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${PERF.labels.profilTitle}\n${name}`)
  );
  container.addSeparatorComponents((sep) => sep);

  const hasAny = ordered.some((h) => h.record);
  if (!hasAny) {
    container.addTextDisplayComponents((td) => td.setContent(PERF.messages.userNoData));
    return interaction.editReply({ embeds: [], components: [container], flags: panelFlags() });
  }

  const pctsForTrend = [];
  const lines = [];
  for (const h of ordered) {
    if (!h.record) {
      lines.push(`\`${h.weekKey}\` · veri yok`);
      continue;
    }
    const pct = h.record.perfPct || 0;
    pctsForTrend.push(pct);
    const icon = h.record.aboveAvg
      ? PERF.labels.above
      : pct >= 100
      ? PERF.labels.around.split(' ')[0]
      : PERF.labels.belowAvg.split(' ')[0];
    lines.push(`\`${h.weekKey}\` ${progressBar(pct)} ${fmtPct(pct)} ${icon}`);
  }

  container.addTextDisplayComponents((td) => td.setContent(lines.join('\n')));
  container.addSeparatorComponents((sep) => sep);

  const trend = computeTrend(pctsForTrend);
  const streak = await getConsecutiveWeeksAbove(
    interaction.guild.id,
    target.id,
    getIstanbulWeekKey()
  );
  container.addTextDisplayComponents((td) =>
    td.setContent(
      `**Genel Trend:** ${trend}\n` +
        `**Üst üste üstte:** ${streak} hafta` +
        (streak >= settings.oneriHaftaSayisi ? ` ${PERF.labels.bell}` : '')
    )
  );

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) => td.setContent(`-# ${config.bot.footer}`));
  }

  return interaction.editReply({ embeds: [], components: [container], flags: panelFlags() });
}

// ---- Rank önerisi (embed + butonlar) ----

function buildSuggestionEmbed(guild, doc) {
  const name = nameOrMention(guild, doc.userId, doc.userTag);
  return new EmbedBuilder()
    .setColor(parseEmbedColor(getConfig().bot.embedColor))
    .setTitle(PERF.labels.suggestionTitle)
    .setDescription(
      `${name} için otomatik rank yükseltme önerisi oluşturuldu.\n\n` +
        `**Performans:** ${fmtPct(doc.perfPct)}\n` +
        `**Üst üste üstte:** ${doc.weeksAbove} hafta\n` +
        `**Hafta:** ${doc.weekKey}`
    )
    .setTimestamp();
}

function buildSuggestionButtons(logId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PERF.customIds.suggestionApprovePrefix}${logId}`)
      .setLabel(PERF.labels.approve)
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${PERF.customIds.suggestionRejectPrefix}${logId}`)
      .setLabel(PERF.labels.reject)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

async function fetchChannel(guild, channelId) {
  if (!channelId) return null;
  const cached = guild.channels.cache.get(channelId);
  if (cached?.isTextBased()) return cached;
  try {
    const fetched = await guild.channels.fetch(channelId);
    return fetched?.isTextBased() ? fetched : null;
  } catch {
    return null;
  }
}

async function sendRankSuggestion(guild, doc) {
  const settings = getPerformanceSettings();
  const channel = await fetchChannel(guild, settings.rankOneriKanalId);
  if (!channel) {
    console.warn('[Performans] Rank öneri kanalı bulunamadı (RANK_ONERI_KANAL_ID).');
    return null;
  }

  const message = await channel.send({
    embeds: [buildSuggestionEmbed(guild, doc)],
    components: [buildSuggestionButtons(doc._id)],
  });

  const reload = await RankSuggestionLog.findById(doc._id);
  if (reload) {
    reload.messageId = message.id;
    await reload.save();
  }
  return message;
}

function isRankSuggestionButton(customId) {
  return (
    customId.startsWith(PERF.customIds.suggestionApprovePrefix) ||
    customId.startsWith(PERF.customIds.suggestionRejectPrefix)
  );
}

async function handleRankSuggestionButton(interaction) {
  if (!canRankCheck(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: PERF.messages.noRankPermission }));
  }

  const { customId } = interaction;
  const isApprove = customId.startsWith(PERF.customIds.suggestionApprovePrefix);
  const logId = customId.slice(
    (isApprove
      ? PERF.customIds.suggestionApprovePrefix
      : PERF.customIds.suggestionRejectPrefix
    ).length
  );

  const doc = await RankSuggestionLog.findById(logId);
  if (!doc) {
    return interaction.reply(ephemeralPayload({ content: PERF.messages.suggestionNotFound }));
  }
  if (doc.status !== 'pending') {
    return interaction.reply(ephemeralPayload({ content: PERF.messages.suggestionHandled }));
  }

  await interaction.deferUpdate();

  doc.status = isApprove ? 'approved' : 'rejected';
  doc.approved = isApprove;
  doc.reviewedById = interaction.user.id;
  doc.reviewedByTag = interaction.user.tag;
  doc.reviewedAt = new Date();
  await doc.save();

  const reviewer = nameOrMention(interaction.guild, interaction.user.id, interaction.user.tag);
  const target = nameOrMention(interaction.guild, doc.userId, doc.userTag);
  const resultText = isApprove
    ? `✅ ${target} için rank önerisi **onaylandı** (${reviewer}).`
    : `❌ ${target} için rank önerisi **reddedildi** (${reviewer}).`;

  const embed = buildSuggestionEmbed(interaction.guild, doc).addFields({
    name: 'Sonuç',
    value: resultText,
  });

  await interaction.editReply({
    embeds: [embed],
    components: [buildSuggestionButtons(doc._id, true)],
  });

  if (isApprove) {
    try {
      const user = await interaction.client.users.fetch(doc.userId);
      await user.send(PERF.messages.dmApproved);
    } catch {
      /* DM kapalı olabilir */
    }
  }

  return interaction.followUp(
    ephemeralPayload({
      content: isApprove ? PERF.messages.suggestionApproved : PERF.messages.suggestionRejected,
    })
  );
}

// ---- Haftalık rapor ----

async function buildWeeklyReportPayload(guild, weekKey) {
  const config = getConfig();
  const rows = await getStoredWeek(guild.id, weekKey);
  const averages = rows[0]?.averages || null;
  const settings = getPerformanceSettings();

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${PERF.labels.weekReportTitle}\n_${formatWeekLabel(weekKey)}_`)
  );
  container.addSeparatorComponents((sep) => sep);

  if (!rows.length) {
    container.addTextDisplayComponents((td) => td.setContent(PERF.messages.noData));
    return { embeds: [], components: [container], flags: panelFlags() };
  }

  const lines = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rank = i < PERF.medals.length ? PERF.medals[i] : `**${i + 1}.**`;
    const name = nameOrMention(guild, row.userId, row.userTag);
    let status;
    if (row.perfPct >= settings.ustEsik) {
      const streak = await getConsecutiveWeeksAbove(guild.id, row.userId, weekKey);
      status = `${PERF.labels.above} ${streak}. haftadır üstte`;
    } else if (row.perfPct >= 100) {
      status = PERF.labels.around;
    } else {
      status = PERF.labels.belowAvg;
    }
    lines.push(`${rank} ${name} · ${fmtPct(row.perfPct)} · ${status}`);
  }
  addLongText(container, lines);

  // Rank önerisi olan yetkililer
  const suggestions = await RankSuggestionLog.find({ guildId: guild.id, weekKey }).lean();
  container.addSeparatorComponents((sep) => sep);
  if (suggestions.length) {
    const sugLines = suggestions.map(
      (s) => `• ${nameOrMention(guild, s.userId, s.userTag)} — ${fmtPct(s.perfPct)} (${s.weeksAbove} hafta)`
    );
    container.addTextDisplayComponents((td) =>
      td.setContent(`**${PERF.labels.suggestionTitle} (bu hafta)**\n${sugLines.join('\n')}`)
    );
  } else {
    container.addTextDisplayComponents((td) =>
      td.setContent(`**${PERF.labels.suggestionTitle} (bu hafta)**\n_Yok_`)
    );
  }

  container.addSeparatorComponents((sep) => sep);
  container.addTextDisplayComponents((td) => td.setContent(buildAveragesLine(averages)));

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) => td.setContent(`-# ${config.bot.footer}`));
  }

  return { embeds: [], components: [container], flags: panelFlags() };
}

/** Bir hafta için tüm akışı çalıştırır: hesapla + öneri üret + rapor gönder. */
async function runWeeklyReportForGuild(guild, weekKey, { sendReport = true } = {}) {
  await computeAndPersistWeek(guild, weekKey);
  const suggestions = await evaluateRankSuggestions(guild, weekKey);

  if (sendReport) {
    const channel = await fetchChannel(guild, getPerformanceSettings().raporKanalId);
    if (channel) {
      const payload = await buildWeeklyReportPayload(guild, weekKey);
      await channel.send(payload);
    } else {
      console.warn('[Performans] Haftalık rapor kanalı bulunamadı (RAPOR_KANAL_ID).');
    }
  }

  for (const doc of suggestions) {
    await sendRankSuggestion(guild, doc).catch((err) =>
      console.warn('[Performans] Öneri gönderilemedi:', err.message || err)
    );
  }

  return { suggestions };
}

/** /hafta-raporu — manuel tetikleme (geçen hafta) */
async function executeWeekReport(interaction) {
  if (!getPerformanceSettings().enabled) {
    return interaction.reply(ephemeralPayload({ content: PERF.messages.disabled }));
  }
  if (!canUsePerformance(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: PERF.messages.noPermission }));
  }

  await interaction.deferReply(ephemeralPayload());
  const weekKey = getPreviousWeekKey(getIstanbulWeekKey());
  const { suggestions } = await runWeeklyReportForGuild(interaction.guild, weekKey, {
    sendReport: true,
  });

  return interaction.editReply(
    ephemeralPayload({
      content: `✅ Haftalık rapor gönderildi (${weekKey}). Rank önerisi: ${suggestions.length}`,
    })
  );
}

async function runScheduledWeeklyReports(client) {
  const targetGuildId = process.env.DISCORD_GUILD_ID;
  const guilds = targetGuildId
    ? [client.guilds.cache.get(targetGuildId)].filter(Boolean)
    : [...client.guilds.cache.values()];

  const weekKey = getPreviousWeekKey(getIstanbulWeekKey());
  for (const guild of guilds) {
    try {
      await runWeeklyReportForGuild(guild, weekKey, { sendReport: true });
    } catch (err) {
      console.error(`[Performans] Haftalık rapor ${guild.id}:`, err.message || err);
    }
  }
}

function registerWeeklyReportScheduler(client) {
  if (!getPerformanceSettings().enabled) {
    console.log('[Performans] Sistem devre dışı, haftalık zamanlayıcı kurulmadı.');
    return;
  }
  const schedule = () => {
    const delay = msUntilNextIstanbulWeeklyReport();
    setTimeout(async () => {
      await runScheduledWeeklyReports(client).catch((err) => {
        console.error('[Performans] Haftalık zamanlayıcı:', err.message || err);
      });
      schedule();
    }, delay);
  };
  schedule();
  console.log('[Performans] Pazartesi 09:00 (Europe/Istanbul) haftalık rapor zamanlayıcısı aktif.');
}

module.exports = {
  executeLeaderboard,
  executeProfil,
  executeWeekReport,
  isRankSuggestionButton,
  handleRankSuggestionButton,
  sendRankSuggestion,
  registerWeeklyReportScheduler,
  runWeeklyReportForGuild,
};
