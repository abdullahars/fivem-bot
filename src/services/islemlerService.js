const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { IcIsimLog } = require('../database/models/IcIsimLog');
const { WhitelistLog } = require('../database/models/WhitelistLog');
const { Penalty } = require('../database/models/Penalty');
const { RoleManageLog } = require('../database/models/RoleManageLog');
const { BanLog } = require('../database/models/BanLog');
const { BlacklistLog } = require('../database/models/BlacklistLog');
const { Support } = require('../database/models/Support');
const { Ticket } = require('../database/models/Ticket');
const { EkipTicket } = require('../database/models/EkipTicket');
const { Ekip } = require('../database/models/Ekip');
const { baseEmbed } = require('../utils/embedBuilder');
const { getConfig } = require('../config/loadConfig');

const PREFIX = 'islemler';
const PAGE_SIZE = 8;

function buildNavId(userId, page) {
  return `${PREFIX}:nav:${userId}:${page}`;
}

function parseNavId(customId) {
  const parts = customId.split(':');
  if (parts[0] !== PREFIX || parts[1] !== 'nav' || parts.length < 4) return null;
  const page = parseInt(parts[3], 10);
  return { userId: parts[2], page: Number.isNaN(page) ? 0 : page };
}

function ts(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

function fmtDate(date) {
  const sec = ts(date);
  return sec ? `<t:${sec}:f>` : '—';
}

function actor(id, tag) {
  if (id) return `<@${id}>`;
  return tag || 'Sistem';
}

function truncate(str, max = 300) {
  const s = String(str || '').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function pushEvent(list, date, icon, title, lines) {
  const at = new Date(date).getTime();
  if (Number.isNaN(at)) return;
  const body = (Array.isArray(lines) ? lines : [lines])
    .filter((l) => l && String(l).trim())
    .map((l) => `> ${l}`)
    .join('\n');
  list.push({ at, icon, title, date, body });
}

async function collectIcIsim(events, guildId, userId) {
  const rows = await IcIsimLog.find({ guildId, targetId: userId })
    .sort({ createdAt: -1 })
    .lean();
  for (const r of rows) {
    if (r.action === 'onay') {
      pushEvent(events, r.createdAt, '📝', 'IC İsim Onaylandı', [
        `Onaylanan isim: **${r.finalName || r.requestedName || '—'}**`,
        r.requestedName && r.requestedName !== r.finalName
          ? `İstenen: ${r.requestedName}`
          : null,
        `Onaylayan: ${actor(r.staffId, r.staffTag)}`,
      ]);
    } else {
      pushEvent(events, r.createdAt, '📝', 'IC İsim Reddedildi', [
        `İstenen isim: **${r.requestedName || '—'}**`,
        r.rejectReason ? `Sebep: ${truncate(r.rejectReason)}` : null,
        `Reddeden: ${actor(r.staffId, r.staffTag)}`,
      ]);
    }
  }
}

async function collectWhitelist(events, guildId, userId) {
  const rows = await WhitelistLog.find({ guildId, targetId: userId })
    .sort({ createdAt: -1 })
    .lean();
  for (const r of rows) {
    const ids = [];
    if (r.steamId) ids.push(`Steam: \`${r.steamId}\``);
    if (r.hexId) ids.push(`Hex: \`${r.hexId}\``);

    if (r.action === 'ver') {
      pushEvent(events, r.createdAt, '✅', 'Whitelist Onaylandı', [
        `Onaylayan: ${actor(r.staffId, r.staffTag)}`,
        ids.length ? ids.join(' · ') : null,
      ]);
    } else if (r.action === 'red') {
      pushEvent(events, r.createdAt, '⛔', 'Whitelist Reddedildi', [
        r.rejectReason ? `Sebep: ${truncate(r.rejectReason)}` : null,
        `Reddeden: ${actor(r.staffId, r.staffTag)}`,
      ]);
    } else {
      pushEvent(events, r.createdAt, '🚫', 'Kayıtsıza Alındı', [
        `Yetkili: ${actor(r.staffId, r.staffTag)}`,
      ]);
    }
  }
}

async function collectPenalty(events, guildId, userId) {
  const rows = await Penalty.find({ guildId, targetId: userId })
    .sort({ createdAt: -1 })
    .lean();
  for (const r of rows) {
    const sure = r.days && r.days > 0 ? `${r.days} gün` : 'Süresiz';
    pushEvent(events, r.createdAt, '📛', `Ceza #${r.penaltyNumber ?? '—'}`, [
      r.reason ? `Sebep: ${truncate(r.reason)}` : null,
      `Çarpan: x${r.multiplier ?? 1} · Süre: ${sure}`,
      `Yetkili: ${actor(r.staffId, r.staffTag)}`,
    ]);
  }
}

async function collectRoles(events, guildId, userId) {
  const rows = await RoleManageLog.find({ guildId, targetId: userId })
    .sort({ createdAt: -1 })
    .lean();
  for (const r of rows) {
    const verildi = r.action === 'ver';
    pushEvent(
      events,
      r.createdAt,
      verildi ? '➕' : '➖',
      verildi ? 'Rol Verildi' : 'Rol Alındı',
      [
        `Rol: ${r.roleId ? `<@&${r.roleId}>` : r.roleName || '—'}`,
        `Yetkili: ${actor(r.staffId, r.staffTag)}`,
      ]
    );
  }
}

async function collectBans(events, guildId, userId) {
  const rows = await BanLog.find({ guildId, targetId: userId })
    .sort({ createdAt: -1 })
    .lean();
  for (const r of rows) {
    pushEvent(events, r.createdAt, '🔨', 'Ban', [
      r.reason ? `Sebep: ${truncate(r.reason)}` : null,
      `Yetkili: ${actor(r.staffId, r.staffTag)}`,
    ]);
    if (r.active === false && r.unbannedAt) {
      pushEvent(events, r.unbannedAt, '🔓', 'Ban Kaldırıldı', [
        `Yetkili: ${actor(r.unbannedById, r.unbannedByTag)}`,
      ]);
    }
  }
}

async function collectBlacklist(events, guildId, userId) {
  const rows = await BlacklistLog.find({ guildId, userId })
    .sort({ createdAt: -1 })
    .lean();
  for (const r of rows) {
    pushEvent(events, r.createdAt, '🖤', `Blacklist #${r.blacklistNumber ?? '—'}`, [
      r.reason ? `Sebep: ${truncate(r.reason)}` : null,
      `Yetkili: ${actor(r.staffId, r.staffTag)}`,
    ]);
    if (r.active === false && r.removedAt) {
      pushEvent(events, r.removedAt, '🤍', 'Blacklist Kaldırıldı', [
        `Yetkili: ${actor(r.removedById, r.removedByTag)}`,
      ]);
    }
  }
}

async function collectSupport(events, guildId, userId) {
  const rows = await Support.find({ guildId }).sort({ createdAt: -1 }).lean();
  for (const r of rows) {
    const inList = (arr) =>
      Array.isArray(arr) && arr.some((x) => x?.userId === userId);
    const isReceiver = inList(r.receivers);
    const isPenalized = inList(r.penalized);
    if (!isReceiver && !isPenalized) continue;

    const roller = [];
    if (isReceiver) roller.push('Destek alan');
    if (isPenalized) roller.push('Cezalandırılan');

    pushEvent(events, r.createdAt, '🎗️', `Destek Kaydı #${r.supportNumber ?? '—'}`, [
      `Rol: ${roller.join(', ')}`,
      r.description ? `Açıklama: ${truncate(r.description)}` : null,
      `Ekleyen: ${actor(r.createdBy?.userId, r.createdBy?.userTag)}`,
    ]);
  }
}

function describeTicketStatus(r) {
  const parts = [];
  if (r.claimedById) parts.push(`Sahiplenen: ${actor(r.claimedById, r.claimedByTag)}`);
  if (r.closedById) parts.push(`Kapatan: ${actor(r.closedById, r.closedByTag)}`);
  return parts;
}

async function collectTickets(events, guildId, userId) {
  const rows = await Ticket.find({ guildId, openerId: userId })
    .sort({ createdAt: -1 })
    .lean();
  for (const r of rows) {
    pushEvent(events, r.createdAt, '🎫', `Ticket #${r.ticketNumber ?? '—'}`, [
      `Tür: ${r.typeLabel || '—'}`,
      ...describeTicketStatus(r),
    ]);
  }
}

async function collectEkipTickets(events, guildId, userId) {
  const rows = await EkipTicket.find({ guildId, openerId: userId })
    .sort({ createdAt: -1 })
    .lean();
  for (const r of rows) {
    pushEvent(events, r.createdAt, '🎟️', `Ekip Ticket #${r.ticketNumber ?? '—'}`, [
      `Tür: ${r.typeLabel || '—'}`,
      ...describeTicketStatus(r),
    ]);
  }
}

async function collectEkips(events, guildId, userId) {
  const rows = await Ekip.find({ guildId, ownerId: userId }).lean();
  for (const r of rows) {
    pushEvent(events, r.createdAt, '👥', 'Adına Ekip Açıldı', [
      `Ekip: **${r.name || '—'}**`,
      `Açan: ${actor(r.createdById)}`,
      r.status === 'open' ? 'Durum: Açık' : null,
    ]);
  }
}

async function gatherUserEvents(guildId, userId) {
  const events = [];
  await Promise.all([
    collectIcIsim(events, guildId, userId),
    collectWhitelist(events, guildId, userId),
    collectPenalty(events, guildId, userId),
    collectRoles(events, guildId, userId),
    collectBans(events, guildId, userId),
    collectBlacklist(events, guildId, userId),
    collectSupport(events, guildId, userId),
    collectTickets(events, guildId, userId),
    collectEkipTickets(events, guildId, userId),
    collectEkips(events, guildId, userId),
  ]);

  events.sort((a, b) => b.at - a.at);
  return events;
}

function buildSummaryLine(events) {
  const counts = {};
  for (const e of events) {
    counts[e.icon] = (counts[e.icon] || 0) + 1;
  }
  const labelByIcon = {
    '📝': 'IC İsim',
    '✅': 'WL Onay',
    '⛔': 'WL Red',
    '🚫': 'Kayıtsız',
    '📛': 'Ceza',
    '➕': 'Rol +',
    '➖': 'Rol -',
    '🔨': 'Ban',
    '🔓': 'Unban',
    '🖤': 'Blacklist',
    '🤍': 'BL Kaldır',
    '🎗️': 'Destek',
    '🎫': 'Ticket',
    '🎟️': 'Ekip Ticket',
    '👥': 'Ekip',
  };
  return Object.entries(counts)
    .map(([icon, n]) => `${icon} ${labelByIcon[icon] || ''} **${n}**`)
    .join(' · ');
}

function buildPagePayload(targetUser, events, page) {
  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const config = getConfig();

  const embed = baseEmbed()
    .setTitle('📋 Kullanıcı İşlem Geçmişi')
    .setAuthor({
      name: targetUser.tag,
      iconURL: targetUser.displayAvatarURL({ size: 64 }),
    })
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }));

  if (!events.length) {
    embed.setDescription('ℹ️ Bu kullanıcı için kayıtlı bir işlem bulunamadı.');
    return { embeds: [embed], components: [] };
  }

  const slice = events.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const blocks = slice.map(
    (e) => `**${e.icon} ${e.title}** · ${fmtDate(e.date)}${e.body ? `\n${e.body}` : ''}`
  );

  embed.setDescription(
    `${buildSummaryLine(events)}\n\n${blocks.join('\n\n')}`.slice(0, 4096)
  );
  embed.setFooter({
    text: `Sayfa ${safePage + 1}/${totalPages} · Toplam ${events.length} işlem${
      config.bot.footer ? ` · ${config.bot.footer}` : ''
    }`,
  });

  const components = [];
  if (totalPages > 1) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(buildNavId(targetUser.id, safePage - 1))
          .setLabel('◀ Önceki')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage <= 0),
        new ButtonBuilder()
          .setCustomId(buildNavId(targetUser.id, safePage + 1))
          .setLabel('Sonraki ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage >= totalPages - 1)
      )
    );
  }

  return { embeds: [embed], components };
}

async function buildIslemlerPayload(guild, targetUser, page = 0) {
  const events = await gatherUserEvents(guild.id, targetUser.id);
  return buildPagePayload(targetUser, events, page);
}

async function handleIslemlerNav(interaction) {
  const parsed = parseNavId(interaction.customId);
  if (!parsed) return;

  const targetUser = await interaction.client.users
    .fetch(parsed.userId)
    .catch(() => null);
  if (!targetUser) {
    return interaction.reply({
      content: '❌ Kullanıcı bulunamadı.',
      ephemeral: true,
    });
  }

  const payload = await buildIslemlerPayload(interaction.guild, targetUser, parsed.page);
  return interaction.update({ ...payload, content: null });
}

module.exports = {
  buildIslemlerPayload,
  handleIslemlerNav,
  PREFIX,
};
