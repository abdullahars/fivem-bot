/**
 * /veriler — sunucu verilerini sıfırlama paneli sabitleri.
 *
 * Sıfırlanabilir kategoriler:
 *  - stats : ses/mesaj aktivitesi + yetkili statları + toplantı katılımı
 *  - puan  : kayıt puanları
 *  - sicil : ceza/wl/ban/blacklist/ic-isim/rol/mazaret/destek kayıtları
 *
 * ASLA sıfırlanmaz: sunucu giriş/çıkış (member_flow_logs),
 * davet kayıtları (member_invite_records) ve ticket/ekip/çekiliş gibi
 * operasyonel/yapısal tablolar.
 */

const CATEGORIES = {
  all: {
    id: 'all',
    label: 'Tüm Veriler',
    emoji: '🗃️',
    description: 'Stat + Puan + Sicil + Coin kayıtlarının tümü',
  },
  stats: {
    id: 'stats',
    label: 'Statlar',
    emoji: '📊',
    description: 'Ses/mesaj aktivitesi, yetkili statları, toplantı katılımı',
  },
  puan: {
    id: 'puan',
    label: 'Puanlar',
    emoji: '⭐',
    description: 'Kayıt puanlama verileri',
  },
  sicil: {
    id: 'sicil',
    label: 'Sicil Kayıtları',
    emoji: '📁',
    description: 'Ceza, WL, ban, blacklist, IC isim, rol, mazaret, destek',
  },
  coin: {
    id: 'coin',
    label: 'Coinler',
    emoji: '🪙',
    description: 'Coin bakiyeleri ve satın alma kayıtları',
  },
};

const customId = {
  categorySelect: 'veriler:cat',
  scopeUser: 'veriler:scope:user:',
  scopeRole: 'veriler:scope:role:',
  scopeGuild: 'veriler:scope:guild:',
  userSelect: 'veriler:usel:',
  roleSelect: 'veriler:rsel:',
  userExec: 'veriler:uexec:',
  roleConfirm2: 'veriler:rconf2:',
  roleExec: 'veriler:rexec:',
  guildConfirm2: 'veriler:gconf2:',
  guildExec: 'veriler:gexec:',
  back: 'veriler:back:',
  home: 'veriler:home',
};

const messages = {
  noPermission: '❌ Bu komutu yalnızca config\'de tanımlı **Owner** kullanabilir.',
  panelTitle: '🗑️ Veri Yönetimi & Sıfırlama',
  panelDesc:
    'Sunucudaki istatistik, puan ve sicil verilerini sıfırlayabilirsiniz.\n' +
    '⚠️ **Giriş/çıkış ve davet kayıtları gibi temel veriler korunur**, silinmez.',
  summaryTitle: '**📦 Mevcut Veri Özeti**',
  categoryPlaceholder: 'Hangi verileri sıfırlamak istiyorsunuz?',
  scopeTitle: '**{cat}** seçildi. Sıfırlama kapsamını seçin:',
  scopeUserLabel: 'Kullanıcı Sıfırla',
  scopeRoleLabel: 'Roldeki Herkesi Sıfırla',
  scopeGuildLabel: 'Tüm Sunucuyu Sıfırla',
  userSelectPlaceholder: 'Sıfırlanacak kullanıcıyı seçin…',
  roleSelectPlaceholder: 'Sıfırlanacak rolü seçin…',
  userConfirmTitle:
    '⚠️ **{user}** kullanıcısının **{cat}** verileri sıfırlanacak.\n\nOnaylıyor musunuz?',
  roleConfirm1Title:
    '⚠️ **{role}** rolündeki **{count} kişinin** **{cat}** verileri sıfırlanacak.\n\nBu işlem geri alınamaz. Devam etmek için onaylayın. **(1/2)**',
  roleConfirm2Title:
    '🚨 **SON ONAY** — **{role}** ({count} kişi) için **{cat}** verileri **kalıcı olarak** silinecek. **(2/2)**',
  guildConfirm1Title:
    '⚠️ **TÜM SUNUCUNUN** **{cat}** verileri sıfırlanacak. Bu işlem geri alınamaz.\n\nDevam etmek için onaylayın. **(1/2)**',
  guildConfirm2Title:
    '🚨 **SON ONAY** — Tüm sunucunun **{cat}** verileri **kalıcı olarak** silinecek. Bu işlem GERİ ALINAMAZ. **(2/2)**',
  confirmContinue: 'Devam Et',
  confirmFinal: 'SIFIRLA',
  confirmUser: 'Onayla ve Sıfırla',
  cancel: 'İptal / Ana Menü',
  back: 'Geri',
  emptyRole: '⚠️ Bu rolde (önbellekte) hiç üye bulunamadı.',
  done: '✅ **{scope}** için **{cat}** verileri sıfırlandı.\n\n**Silinen kayıt:** {total}',
  doneDetail: '{table}: {count}',
  failed: '❌ Sıfırlama başarısız: {error}',
};

module.exports = { CATEGORIES, customId, messages };
