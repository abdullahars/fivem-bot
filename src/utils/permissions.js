const {
  getIds,
  getStreamerSettings,
  getEkipOlusturAllowedRoleIds,
  getMeslekAllowedRoleIds,
  getYetkiBaslatAllowedRoleIds,
  getYetkiBaslatSettings,
  getYetkiliSorumlusuRoleIds,
} = require('../config/loadConfig');

function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  return member.roles.cache.has(getIds().staffRoleId);
}

function isBotCommand(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  const roleId = getIds().botCommandRoleId;
  if (!roleId || roleId.includes('ROL_ID')) return false;
  return member.roles.cache.has(roleId);
}

function isBanhammer(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  const roleId = getIds().banhammerRoleId;
  if (!roleId || roleId.includes('ROL_ID')) return false;
  return member.roles.cache.has(roleId);
}

function isUstYonetim(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  const roleId = getIds().ustYonetimRoleId;
  if (!roleId || roleId.includes('ROL_ID')) return false;
  return member.roles.cache.has(roleId);
}

function isEkipSorumlusu(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  const roleId = getIds().ekipSorumlusuRoleId;
  if (!roleId || roleId.includes('ROL_ID')) return false;
  return member.roles.cache.has(roleId);
}

function canCreateEkip(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;

  const allowedRoleIds = getEkipOlusturAllowedRoleIds();
  if (allowedRoleIds.length === 0) {
    return isEkipSorumlusu(member) || isBotCommand(member);
  }

  return allowedRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

/** /ekipler — Bot Command veya Ekip Sorumlusu */
function canManageEkip(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  return isBotCommand(member) || isEkipSorumlusu(member);
}

/** Ekip kapat, yardım, boss — config ekipOlustur.allowedRoleIds */
function canManageEkipAllowedRoles(member) {
  return canCreateEkip(member);
}

function canManageRoles(member) {
  if (!member) return false;
  // Administrator veya ManageRoles yetkisi olanlar
  if (member.permissions.has('Administrator')) return true;
  if (member.permissions.has('ManageRoles')) return true;
  // BotCommand rolü olanlar
  return isBotCommand(member);
}

/** /help — Bot Command veya Üst Yönetim */
function canViewHelp(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  return isBotCommand(member) || isUstYonetim(member);
}

/** /sil — Bot Command veya Üst Yönetim */
function canSilMessages(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  return isBotCommand(member) || isUstYonetim(member);
}

/** /oylama — Bot Command veya Üst Yönetim */
function canCreateOylama(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  return isBotCommand(member) || isUstYonetim(member);
}

/** /yetki-baslat — config yetkiBaslat.allowedRoleIds */
function canStartYetki(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;

  const allowedRoleIds = getYetkiBaslatAllowedRoleIds();
  if (allowedRoleIds.length === 0) return false;
  return allowedRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

/** /meslek — config.js → meslek.allowedRoleIds */
function canManageMeslek(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;

  const allowedRoleIds = getMeslekAllowedRoleIds();
  if (allowedRoleIds.length === 0) return false;
  return allowedRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

/** /mazaret onay/red — Üst Yönetim veya Yetkili Sorumlusu */
function canReviewMazaret(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  if (isUstYonetim(member)) return true;

  const allowedRoleIds = getYetkiBaslatAllowedRoleIds();
  if (allowedRoleIds.length === 0) return false;
  return allowedRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

/** /lb, /profil, /hafta-raporu — Yetkili Sorumlusu veya Üst Yönetim */
function canUsePerformance(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  if (isUstYonetim(member)) return true;
  const allowedRoleIds = getYetkiliSorumlusuRoleIds();
  return allowedRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

/** Rank öneri onay/red — Baş Yetkili ve üzeri (Üst Yönetim) */
function canRankCheck(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  return isUstYonetim(member);
}

/** /streamer — Streamer rolü */
function isStreamer(member) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  const roleId = getStreamerSettings().roleId;
  if (!roleId || roleId.includes('ROL_ID')) return false;
  return member.roles.cache.has(roleId);
}

module.exports = {
  isStaff,
  isBotCommand,
  isBanhammer,
  isUstYonetim,
  isEkipSorumlusu,
  canCreateEkip,
  canManageEkip,
  canManageEkipAllowedRoles,
  canManageRoles,
  canSilMessages,
  canViewHelp,
  canReviewMazaret,
  canCreateOylama,
  canManageMeslek,
  canStartYetki,
  canUsePerformance,
  canRankCheck,
  isStreamer,
};
