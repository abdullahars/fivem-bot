/**
 * /config paneli için kategori + alan tanımları.
 * Her alan bir config yoluna (path) bağlıdır ve tipine göre düzenlenir.
 *
 * Tipler:
 *  - role        : tek rol ID (string)
 *  - roleList    : rol ID listesi (array)
 *  - channelText : metin kanalı ID
 *  - channelVoice: ses kanalı ID
 *  - category    : kategori kanalı ID
 *  - boolean     : true / false
 *  - number      : sayısal değer
 *  - text        : serbest metin
 */

const CATEGORIES = [
  {
    id: 'roles',
    label: 'Roller',
    emoji: '🛡️',
    description: 'Staff, üst yönetim ve sistem rolleri',
    fields: [
      { path: 'ids.staffRole', label: 'Staff Rolü', type: 'role' },
      { path: 'ids.botCommandRole', label: 'Bot Command Rolü', type: 'role' },
      { path: 'ids.roles.whitelist', label: 'Whitelist Rolü', type: 'role' },
      { path: 'ids.roles.kayitsiz', label: 'Kayıtsız Rolü', type: 'role' },
      { path: 'ids.roles.karakterOnay', label: 'Karakter Onay Rolü', type: 'role' },
      { path: 'ids.roles.banhammer', label: 'Banhammer Rolü', type: 'role' },
      { path: 'ids.roles.ustYonetim', label: 'Üst Yönetim Rolü', type: 'role' },
      { path: 'ids.roles.ekipSorumlusu', label: 'Ekip Sorumlusu Rolü', type: 'role' },
      { path: 'ids.roles.blacklist', label: 'Blacklist Rolü', type: 'role' },
      { path: 'ids.roles.yetkiliSorumlusu', label: 'Yetkili Sorumlusu Rolü', type: 'role' },
      { path: 'ekip.bossRoleId', label: 'Ekip Boss Rolü', type: 'role' },
      { path: 'streamer.roleId', label: 'Streamer Rolü', type: 'role' },
    ],
  },
  {
    id: 'roleLists',
    label: 'Rol Listeleri',
    emoji: '📋',
    description: 'Çoklu rol izin listeleri',
    fields: [
      { path: 'ids.ekipOlustur.allowedRoleIds', label: 'Ekip Oluştur İzinli Roller', type: 'roleList' },
      { path: 'yetkiBaslat.allowedRoleIds', label: 'Yetki Başlat İzinli Roller', type: 'roleList' },
      { path: 'meslek.allowedRoleIds', label: 'Meslek İzinli Roller', type: 'roleList' },
    ],
  },
  {
    id: 'levels',
    label: 'Yetki Seviyeleri',
    emoji: '⭐',
    description: 'L1 / L2 / L3 perm rolleri',
    fields: [
      { path: 'yetkiBaslat.levels.l1', label: 'L1 Rolü', type: 'role' },
      { path: 'yetkiBaslat.levels.l2', label: 'L2 Rolü', type: 'role' },
      { path: 'yetkiBaslat.levels.l3', label: 'L3 Rolü', type: 'role' },
    ],
  },
  {
    id: 'channels',
    label: 'Kanallar',
    emoji: '#️⃣',
    description: 'Panel ve duyuru kanalları',
    fields: [
      { path: 'ids.channels.ticketPanel', label: 'Ticket Panel Kanalı', type: 'channelText' },
      { path: 'ids.channels.whitelistOnayLog', label: 'WL Onay Log Kanalı', type: 'channelText' },
      { path: 'ids.channels.whitelistRedLog', label: 'WL Red Log Kanalı', type: 'channelText' },
      { path: 'ids.channels.icIsim', label: 'IC İsim Başvuru Kanalı', type: 'channelText' },
      { path: 'ids.channels.mulakatPanel', label: 'Mülakat Panel Kanalı', type: 'channelText' },
      { path: 'ids.channels.ekipTicketPanel', label: 'Ekip Ticket Panel Kanalı', type: 'channelText' },
      { path: 'ids.channels.cezalar', label: 'Cezalar Duyuru Kanalı', type: 'channelText' },
      { path: 'ids.channels.blacklistPublic', label: 'Blacklist Duyuru Kanalı', type: 'channelText' },
      { path: 'ids.channels.changelog', label: 'Changelog Kanalı', type: 'channelText' },
      { path: 'streamer.channelId', label: 'Streamer Duyuru Kanalı', type: 'channelText' },
      { path: 'mulakat.notifyChannelId', label: 'Mülakat Bildirim Kanalı', type: 'channelText' },
      { path: 'mulakat.waitingVoiceChannelId', label: 'Mülakat Bekleme Sesi', type: 'channelVoice' },
      { path: 'bot.voice.channelId', label: 'Bot AFK Ses Kanalı', type: 'channelVoice' },
    ],
  },
  {
    id: 'categories',
    label: 'Kategoriler',
    emoji: '🗂️',
    description: 'Ticket ve ekip kategori kanalları',
    fields: [
      { path: 'ids.categories.parent', label: 'Varsayılan Ticket Kategorisi', type: 'category' },
      { path: 'ids.categories.ekip', label: 'Ekip Kategorisi', type: 'category' },
      { path: 'ids.categories.ekipTicket', label: 'Ekip Ticket Kategorisi', type: 'category' },
      { path: 'ids.categories.ic', label: 'IC Ticket Kategorisi', type: 'category' },
      { path: 'ids.categories.ooc', label: 'OOC Ticket Kategorisi', type: 'category' },
      { path: 'ids.categories.ac', label: 'AC Ticket Kategorisi', type: 'category' },
      { path: 'mulakat.privateRoomCategoryId', label: 'Mülakat Özel Oda Kategorisi', type: 'category' },
      { path: 'staffBilgi.destekCategoryId', label: 'Destek Ses Kategorisi', type: 'category' },
    ],
  },
  {
    id: 'toggles',
    label: 'Aç / Kapat',
    emoji: '🔘',
    description: 'Açık / kapalı ayarlar',
    fields: [
      { path: 'bot.voice.enabled', label: 'Bot Sese Girsin', type: 'boolean' },
      { path: 'bot.voice.selfDeaf', label: 'Bot Kulaklık Kapalı', type: 'boolean' },
      { path: 'bot.voice.selfMute', label: 'Bot Mikrofon Kapalı', type: 'boolean' },
      { path: 'kayitsiz.autoOnJoin', label: 'Girişte Otomatik Kayıtsız', type: 'boolean' },
      { path: 'whitelist.requireSteam', label: 'WL Steam Zorunlu', type: 'boolean' },
      { path: 'whitelist.requireHex', label: 'WL Hex Zorunlu', type: 'boolean' },
      { path: 'whitelist.kayitPuan.enabled', label: 'Kayıt Puanlama (DM)', type: 'boolean' },
      { path: 'icIsim.enabled', label: 'IC İsim Sistemi', type: 'boolean' },
      { path: 'moderation.enabled', label: 'Mesaj Moderasyonu', type: 'boolean' },
      { path: 'logging.joinLeave', label: 'Giriş/Çıkış Logu', type: 'boolean' },
      { path: 'logging.messages', label: 'Mesaj Logu', type: 'boolean' },
      { path: 'logging.voice', label: 'Ses Logu', type: 'boolean' },
    ],
  },
  {
    id: 'numbers',
    label: 'Sayılar & Limitler',
    emoji: '🔢',
    description: 'Limit ve eşik değerleri',
    fields: [
      { path: 'whitelist.limits.verPerDay', label: 'Günlük WL Verme Limiti (0=sınırsız)', type: 'number' },
      { path: 'whitelist.limits.kayitsizPerDay', label: 'Günlük Kayıtsız Limiti (0=sınırsız)', type: 'number' },
      { path: 'topStat.limit', label: 'Top-Stat Liste Limiti', type: 'number' },
      { path: 'staffTop.limit', label: 'Staff-Top Liste Limiti', type: 'number' },
      { path: 'mulakat.callCooldownMinutes', label: 'Mülakat Çağrı Cooldown (dk)', type: 'number' },
    ],
  },
  {
    id: 'texts',
    label: 'Metinler',
    emoji: '📝',
    description: 'Renk, footer ve mesaj metinleri',
    fields: [
      { path: 'bot.embedColor', label: 'Embed Rengi (hex)', type: 'text' },
      { path: 'bot.footer', label: 'Panel Footer', type: 'text' },
      { path: 'panel.imageUrl', label: 'Panel Görsel URL', type: 'text' },
    ],
  },
];

const FIELDS = {};
for (const category of CATEGORIES) {
  for (const field of category.fields) {
    FIELDS[field.path] = { ...field, category: category.id };
  }
}

function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

function getField(path) {
  return FIELDS[path] || null;
}

module.exports = {
  CATEGORIES,
  FIELDS,
  getCategory,
  getField,
  customId: {
    categorySelect: 'config:cat',
    fieldSelect: 'config:fld',
    roleSelect: 'config:rs:',
    roleListSelect: 'config:rls:',
    channelSelect: 'config:cs:',
    boolSet: 'config:bool:',
    modalOpen: 'config:mod:',
    modalSubmit: 'config:modsub:',
    clear: 'config:clear:',
    back: 'config:back:',
    home: 'config:home',
  },
  messages: {
    noPermission: '❌ Bu komutu yalnızca config\'de tanımlı **Owner** kullanabilir.',
    panelTitle: '⚙️ Config Paneli',
    panelDesc:
      'Aşağıdan düzenlemek istediğiniz kategoriyi seçin.\n' +
      'Değişiklikler anında uygulanır ve `config/overrides.json` dosyasına kaydedilir.',
    categoryPlaceholder: 'Kategori seçin…',
    fieldPlaceholder: 'Düzenlenecek ayarı seçin…',
    rolePlaceholder: 'Rol seçin…',
    roleListPlaceholder: 'Rolleri seçin (çoklu)…',
    channelPlaceholder: 'Kanal seçin…',
    categoryChannelPlaceholder: 'Kategori seçin…',
    updated: '✅ **{label}** güncellendi.',
    cleared: '🧹 **{label}** temizlendi.',
    invalidNumber: '❌ Geçerli bir sayı girin.',
    backToCategory: 'Geri',
    backToHome: 'Ana Menü',
    clearLabel: 'Temizle',
    editLabel: 'Değeri Düzenle',
    enableLabel: 'Aç',
    disableLabel: 'Kapat',
  },
};
