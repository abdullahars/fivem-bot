const fs = require('fs');
const { join } = require('path');
const { getChannelId } = require('./channelRegistry');
const { kurulumKeys } = require('../constants/logChannels');

const kurulumKeySet = new Set(kurulumKeys);
const OVERRIDES_PATH = join(process.cwd(), 'config', 'overrides.json');

let cachedConfig = null;

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function loadOverrides() {
  try {
    if (!fs.existsSync(OVERRIDES_PATH)) return {};
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8')) || {};
  } catch (err) {
    console.warn('[Config] overrides.json okunamadı:', err.message);
    return {};
  }
}

function loadConfig() {
  if (cachedConfig) return cachedConfig;
  const configPath = join(process.cwd(), 'config', 'config.js');
  cachedConfig = require(configPath);
  deepMerge(cachedConfig, loadOverrides());
  return cachedConfig;
}

function getConfig() {
  return loadConfig();
}

function setDeep(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cur[part] || typeof cur[part] !== 'object' || Array.isArray(cur[part])) {
      cur[part] = {};
    }
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}

function getConfigValue(path) {
  const parts = path.split('.');
  let cur = getConfig();
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Bir config değerini canlı uygular ve overrides.json'a kalıcı kaydeder. */
function setConfigValue(path, value) {
  const overrides = loadOverrides();
  setDeep(overrides, path, value);
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2), 'utf8');
  setDeep(getConfig(), path, value);
  return value;
}

/** /config komutunu kullanabilecek owner kullanıcı ID'leri. */
function getOwnerIds() {
  const ids = getConfig().owner?.ids;
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => String(id).trim()).filter((id) => id && !id.includes('KULLANICI'));
}

/**
 * Kurulum kanalları: isimle bulunan ID (registry).
 * Diğerleri: yalnızca config.js → ids.channels.
 */
function resolveChannelId(key) {
  if (kurulumKeySet.has(key)) {
    return getChannelId(key) || null;
  }
  return getConfig().ids?.channels?.[key] || null;
}

function getIds() {
  const { ids } = getConfig();
  return {
    staffRoleId: ids.staffRole,
    botCommandRoleId: ids.botCommandRole,
    whitelistRoleId: ids.roles?.whitelist,
    kayitsizRoleId: ids.roles?.kayitsiz,
    karakterOnayRoleId: ids.roles?.karakterOnay,
    banhammerRoleId: ids.roles?.banhammer,
    ustYonetimRoleId: ids.roles?.ustYonetim,
    ekipSorumlusuRoleId: ids.roles?.ekipSorumlusu,
    blacklistRoleId: ids.roles?.blacklist,
    ticketLogChannelId: resolveChannelId('ticketLog'),
    ticketPanelChannelId: resolveChannelId('ticketPanel'),
    whitelistOnayLogChannelId: resolveChannelId('whitelistOnayLog'),
    whitelistRedLogChannelId: resolveChannelId('whitelistRedLog'),
    whitelistLogChannelId: resolveChannelId('whitelistLog'),
    icIsimLogChannelId: resolveChannelId('icIsimLog'),
    roleLogChannelId: resolveChannelId('roleLog'),
    banLogChannelId: resolveChannelId('banLog'),
    joinLeaveLogChannelId: resolveChannelId('joinLeaveLog'),
    messageLogChannelId: resolveChannelId('messageLog'),
    voiceLogChannelId: resolveChannelId('voiceLog'),
    mulakatPanelChannelId: resolveChannelId('mulakatPanel'),
    ekipLogChannelId: resolveChannelId('ekipLog'),
    ekipTicketLogChannelId: resolveChannelId('ekipTicketLog'),
    ekipTicketPanelChannelId: resolveChannelId('ekipTicketPanel'),
    cezalarChannelId: resolveChannelId('cezalar'),
    cezaLogChannelId: resolveChannelId('cezaLog'),
    destekLogChannelId: resolveChannelId('destekLog'),
    blacklistPublicChannelId: resolveChannelId('blacklistPublic'),
    blacklistLogChannelId: resolveChannelId('blacklistLog'),
    gunlukLogChannelId: resolveChannelId('gunlukLog'),
    komutLogChannelId: resolveChannelId('komutLog'),
    streamerLogChannelId: resolveChannelId('streamerLog'),
    meslekLogChannelId: resolveChannelId('meslekLog'),
    mazaretLogChannelId: resolveChannelId('mazaretLog'),
    puanLogChannelId: resolveChannelId('puanLog'),
    changelogChannelId: getConfig().ids?.channels?.changelog || null,
    ekipCategoryId: ids.categories.ekip,
    ekipTicketCategoryId: ids.categories.ekipTicket,
    categoryParentId: ids.categories.parent,
    categoryId: (typeId) => ids.categories[typeId] || ids.categories.parent,
  };
}

function getWhitelistSettings() {
  const wl = getConfig().whitelist || {};
  return {
    requireSteam: wl.requireSteam === true,
    requireHex: wl.requireHex === true,
    verPerDay: wl.limits?.verPerDay ?? 0,
    kayitsizPerDay: wl.limits?.kayitsizPerDay ?? 0,
    kayitPuanEnabled: wl.kayitPuan?.enabled === true,
  };
}

function getIcIsimSettings() {
  const ic = getConfig().icIsim || {};
  return {
    enabled: ic.enabled !== false,
    channelId:
      getConfig().ids?.channels?.icIsim ||
      (ic.channelId && String(ic.channelId).trim()) ||
      null,
    approveEmoji: ic.approveEmoji || '✅',
    rejectEmoji: ic.rejectEmoji || '❌',
  };
}

function getTopStatSettings() {
  const ts = getConfig().topStat || {};
  return { limit: ts.limit > 0 ? ts.limit : 5 };
}

function getCoinSettings() {
  const c = getConfig().coin || {};
  const rates = c.rates || {};
  const num = (v, def) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : def;
  };
  return {
    enabled: c.enabled === true,
    rates: {
      ticket: num(rates.ticket, 0),
      kayit: num(rates.kayit, 0),
      icIsim: num(rates.icIsim, 0),
      voiceHour: num(rates.voiceHour, 0),
      destekAlinan: num(rates.destekAlinan, 0),
      destekYardim: num(rates.destekYardim, 0),
      ekipAc: num(rates.ekipAc, 0),
      ekipReferans: num(rates.ekipReferans, 0),
    },
  };
}

function getPerformanceSettings() {
  const p = getConfig().performance || {};
  const w = p.weights || {};
  const num = (v, def) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : def;
  };
  const cleanId = (v, envKey) => {
    const fromCfg = String(v || '').trim();
    if (fromCfg && !fromCfg.includes('KANAL')) return fromCfg;
    const fromEnv = String(process.env[envKey] || '').trim();
    return fromEnv || null;
  };
  return {
    enabled: p.enabled !== false,
    raporKanalId: cleanId(p.raporKanalId, 'RAPOR_KANAL_ID'),
    rankOneriKanalId:
      cleanId(p.rankOneriKanalId, 'RANK_ONERI_KANAL_ID') ||
      cleanId(p.raporKanalId, 'RAPOR_KANAL_ID'),
    ustEsik: num(p.ustEsik, 110),
    oneriHaftaSayisi: Math.max(1, Math.round(num(p.oneriHaftaSayisi, 3))),
    oneriMinAktifHafta: Math.max(1, Math.round(num(p.oneriMinAktifHafta, 2))),
    weights: {
      ticketKapatilan: num(w.ticketKapatilan, 30),
      kayitToplam: num(w.kayitToplam, 25),
      icToplam: num(w.icToplam, 15),
      destekToplam: num(w.destekToplam, 10),
      ekipToplam: num(w.ekipToplam, 10),
      mesaj: num(w.mesaj, 5),
      hiz: num(w.hiz, 5),
    },
  };
}

/** Yetkili Sorumlusu rol ID'leri (performans komutları için) */
function getYetkiliSorumlusuRoleIds() {
  return getYetkiBaslatAllowedRoleIds();
}

function getModerationSettings() {
  const mod = getConfig().moderation || {};
  return { enabled: mod.enabled !== false };
}

function getKayitsizSettings() {
  const k = getConfig().kayitsiz || {};
  return { autoOnJoin: k.autoOnJoin === true };
}

function getFivemSettings() {
  const fm = getConfig().fivem || {};
  const connectCommand = fm.connectCommand?.trim() || '';
  const configured =
    Boolean(fm.serverName?.trim()) &&
    Boolean(connectCommand) &&
    !connectCommand.includes('IP');

  return {
    configured,
    serverName: fm.serverName?.trim() || 'FiveM Sunucu',
    tagline: fm.tagline?.trim() || '',
    connectCommand,
    connectLink: fm.connectLink?.trim() || '',
    discordLink: fm.discordLink?.trim() || '',
    discordButtonLabel: fm.discordButtonLabel?.trim() || '',
    maxPlayers: fm.maxPlayers > 0 ? fm.maxPlayers : 128,
    statusEndpoint: fm.statusEndpoint?.trim() || '',
    logoUrl: fm.logoUrl?.trim() || '',
    images: {
      aktif: resolveFivemImage(fm, 'aktif'),
      bakim: resolveFivemImage(fm, 'bakim'),
      restart: resolveFivemImage(fm, 'restart'),
    },
  };
}

function resolveFivemImage(fm, key) {
  const fromKey = fm.images?.[key]?.trim();
  if (fromKey) return fromKey;
  const legacy = fm.bannerUrl?.trim();
  if (legacy) return legacy;
  return getConfig().panel?.imageUrl?.trim() || '';
}

function getYsaySettings() {
  const y = getConfig().ysay || {};
  return {
    message: y.message?.trim() || '',
    dmMessage: y.dmMessage?.trim() || '',
  };
}

/** Botun AFK ses kanalına bağlanması (config.js → bot.voice) */
function getEkipSettings() {
  const e = getConfig().ekip || {};
  const bossRoleId = String(e.bossRoleId || '').trim();
  return {
    bossRoleId: bossRoleId && !bossRoleId.includes('ROL_ID') ? bossRoleId : null,
  };
}

function getVoicePresenceSettings() {
  const v = getConfig().bot?.voice || {};
  const channelId = String(v.channelId || '').trim();
  const enabled = v.enabled !== false && channelId.length > 0;
  return {
    enabled,
    channelId,
    selfDeaf: v.selfDeaf !== false,
    selfMute: v.selfMute === true,
  };
}

function getConnectAddress() {
  const cmd = getFivemSettings().connectCommand;
  const match = cmd.match(/^connect\s+(.+)$/i);
  return match ? match[1].trim() : cmd;
}

function getLoggingSettings() {
  const log = getConfig().logging || {};
  return {
    joinLeave: log.joinLeave !== false,
    messages: log.messages !== false,
    voice: log.voice !== false,
  };
}

function getStaffTopSettings() {
  const st = getConfig().staffTop || {};
  const fromTop = getConfig().topStat?.limit;
  const limit = st.limit > 0 ? st.limit : fromTop > 0 ? fromTop : 5;
  return { limit };
}

/** Aktivite kategori eşlemesi — destek ses kategorisi */
function getStaffBilgiSettings() {
  const sb = getConfig().staffBilgi || {};
  const destekCategoryId = String(sb.destekCategoryId || '').trim();
  return {
    destekCategoryId:
      destekCategoryId.length > 0 && !destekCategoryId.includes('KATEGORI')
        ? destekCategoryId
        : null,
  };
}

function normalizeRoleIds(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((id) => String(id).trim())
    .filter((id) => id && !id.includes('ROL_ID'));
}

/** /mulakat — bekleme sesi, bildirim kanalı, özel oda */
function getMulakatSettings() {
  const m = getConfig().mulakat || {};
  const waitingVoiceChannelId = String(m.waitingVoiceChannelId || '').trim();
  const notifyChannelId = String(m.notifyChannelId || '').trim();
  const privateRoomCategoryId = String(m.privateRoomCategoryId || '').trim();
  const imageUrl = String(m.imageUrl || '').trim();

  const notifyChannelValid =
    notifyChannelId.length > 0 && !notifyChannelId.includes('KANAL');
  const waitingVoiceValid =
    waitingVoiceChannelId.length > 0 &&
    !waitingVoiceChannelId.includes('KANAL');
  const configured = waitingVoiceValid && notifyChannelValid;

  return {
    configured,
    waitingVoiceChannelId: waitingVoiceValid ? waitingVoiceChannelId : null,
    notifyChannelId: notifyChannelValid ? notifyChannelId : null,
    privateRoomCategoryId:
      privateRoomCategoryId.length > 0 && !privateRoomCategoryId.includes('KATEGORI')
        ? privateRoomCategoryId
        : null,
    callCooldownMinutes: m.callCooldownMinutes > 0 ? m.callCooldownMinutes : 5,
    imageUrl,
  };
}

/** /ekip olustur komutunu kullanabilecek rol ID listesi */
function getStreamerSettings() {
  const s = getConfig().streamer || {};
  const roleId = String(s.roleId || '').trim();
  const channelId = String(s.channelId || '').trim();
  const imageUrl = String(s.imageUrl || '').trim();

  const configured =
    roleId.length > 0 &&
    !roleId.includes('ROL_ID') &&
    channelId.length > 0 &&
    !channelId.includes('KANAL');

  return {
    roleId: configured ? roleId : null,
    channelId: configured ? channelId : null,
    imageUrl,
    configured,
  };
}

function getEkipOlusturAllowedRoleIds() {
  const cfg = getConfig();
  const configured = normalizeRoleIds(
    cfg.ekipOlustur?.allowedRoleIds || cfg.ids?.ekipOlustur?.allowedRoleIds
  );
  if (configured.length > 0) return configured;

  const { ids } = getConfig();
  return normalizeRoleIds([ids.roles?.ekipSorumlusu, ids.botCommandRole]);
}

/** /meslek komutunu kullanabilecek rol ID listesi */
function getMeslekAllowedRoleIds() {
  const cfg = getConfig();
  const configured = normalizeRoleIds(cfg.meslek?.allowedRoleIds);
  if (configured.length > 0) return configured;

  const { ids } = getConfig();
  return normalizeRoleIds([ids.roles?.ekipSorumlusu, ids.botCommandRole]);
}

/** /yetki-baslat — yetkili sorumlusu rol listesi */
function getYetkiBaslatAllowedRoleIds() {
  const cfg = getConfig();
  const configured = normalizeRoleIds(cfg.yetkiBaslat?.allowedRoleIds);
  if (configured.length > 0) return configured;

  const { ids } = getConfig();
  return normalizeRoleIds([ids.roles?.yetkiliSorumlusu]);
}

function getYetkiBaslatSettings() {
  const yb = getConfig().yetkiBaslat || {};
  const levels = {};
  for (const key of ['l1', 'l2', 'l3']) {
    const id = String(yb.levels?.[key] || '').trim();
    if (id && !id.includes('ROL_ID')) levels[key] = id;
  }
  return {
    allowedRoleIds: getYetkiBaslatAllowedRoleIds(),
    levels,
  };
}

module.exports = {
  loadConfig,
  getConfig,
  getConfigValue,
  setConfigValue,
  getOwnerIds,
  getIds,
  resolveChannelId,
  getWhitelistSettings,
  getCoinSettings,
  getPerformanceSettings,
  getYetkiliSorumlusuRoleIds,
  getIcIsimSettings,
  getTopStatSettings,
  getModerationSettings,
  getKayitsizSettings,
  getStaffTopSettings,
  getStaffBilgiSettings,
  getLoggingSettings,
  getFivemSettings,
  getConnectAddress,
  getYsaySettings,
  getVoicePresenceSettings,
  getEkipSettings,
  getEkipOlusturAllowedRoleIds,
  getMeslekAllowedRoleIds,
  getYetkiBaslatAllowedRoleIds,
  getYetkiBaslatSettings,
  getMulakatSettings,
  getStreamerSettings,
};
