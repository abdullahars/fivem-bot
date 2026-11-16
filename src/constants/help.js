module.exports = {
  noPermission: '❌ Bu komutu kullanmak için Bot Command veya Üst Yönetim yetkisi gerekli.',

  title: '📖 Bot Komut Rehberi',
  overview:
    'Aşağıdaki kategori butonlarından birini seçerek komutların **kullanımını** ve **yetki gereksinimlerini** görüntüleyebilirsiniz.\n\n' +
    '**Kategoriler**\n' +
    '• **Sunucu** — Duyuru, istatistik, çekiliş, oylama\n' +
    '• **Moderasyon** — Ban, blacklist, sicil, ceza\n' +
    '• **Roller** — Rol ver/al, rol bilgi, kayıtsız\n' +
    '• **Staff** — İstatistik, toplantı, yetki, destek\n' +
    '• **Ticket** — Ticket yönetimi, mülakat, kurulum\n' +
    '• **Ekip** — Ekip oluşturma, meslek, ekip ticket\n' +
    '• **Ses** — Yayın duyurusu, toplu susturma, whitelist',

  buttonPrefix: 'help:cat:',

  categoryOrder: ['genel', 'sunucu', 'moderasyon', 'rol', 'staff', 'ticket', 'ekip', 'ses'],

  categories: {
    genel: {
      label: 'Genel',
      title: '📖 Genel Bakış',
      body: null,
    },
    sunucu: {
      label: 'Sunucu',
      title: '📢 Sunucu & Duyuru',
      commands: [
        {
          name: '/aktif',
          perm: 'Üst Yönetim',
          desc: 'Sunucu aktif duyurusu gönderir.',
          usage: '/aktif',
        },
        {
          name: '/bakim',
          perm: 'Üst Yönetim',
          desc: 'Sunucu bakım duyurusu gönderir.',
          usage: '/bakim',
        },
        {
          name: '/restart',
          perm: 'Üst Yönetim',
          desc: 'Sunucu restart duyurusu gönderir.',
          usage: '/restart',
        },
        {
          name: '/ip',
          perm: 'Herkes',
          desc: 'FiveM bağlantı IP ve connect komutunu gösterir.',
          usage: '/ip',
        },
        {
          name: '/changelog',
          perm: 'Üst Yönetim',
          desc: 'Sunucu güncelleme notu yayınlar.',
          usage: '/changelog',
        },
        {
          name: '/say',
          perm: 'Bot Command',
          desc: 'Sunucu üye, ses ve boost istatistiklerini gösterir.',
          usage: '/say',
        },
        {
          name: '/top-stat',
          perm: 'Bot Command',
          desc: 'Mesaj ve ses liderlik tablosunu gösterir.',
          usage: '/top-stat',
        },
        {
          name: '/cekilis',
          perm: 'Üst Yönetim',
          desc: 'Süreli çekiliş başlatır; katılım butonu ile çalışır.',
          usage: '/cekilis aciklama:... kazanan:1 sure:60',
        },
        {
          name: '/oylama',
          perm: 'Bot Command / Üst Yönetim',
          desc: 'İki seçenekli süreli oylama oluşturur.',
          usage: '/oylama aciklama:... sure:30 buton1:Evet buton2:Hayır',
        },
        {
          name: '/kilit',
          perm: 'Üst Yönetim',
          desc: 'Bulunulan kanalı kilitle veya kilidi açar.',
          usage: '/kilit',
        },
        {
          name: '/sil',
          perm: 'Bot Command / Üst Yönetim',
          desc: 'Kanaldaki son mesajları toplu siler (1–500).',
          usage: '/sil sayi:50',
        },
      ],
    },
    moderasyon: {
      label: 'Moderasyon',
      title: '🛡️ Moderasyon & Ceza',
      commands: [
        {
          name: '/ban',
          perm: 'Banhammer',
          desc: 'Kullanıcıyı sunucudan banlar.',
          usage: '/ban',
        },
        {
          name: '/unban',
          perm: 'Banhammer',
          desc: 'Kullanıcının banını kaldırır.',
          usage: '/unban',
        },
        {
          name: '/ban-bilgi',
          perm: 'Staff',
          desc: 'Kullanıcının ban geçmişini gösterir.',
          usage: '/ban-bilgi',
        },
        {
          name: '/blacklist',
          perm: 'Banhammer',
          desc: 'Kullanıcıyı blacklist\'e ekler.',
          usage: '/blacklist kullanici:@user aciklama:...',
        },
        {
          name: '/unblacklist',
          perm: 'Staff',
          desc: 'Kullanıcıyı blacklist\'ten kaldırır.',
          usage: '/unblacklist kullanici:@user',
        },
        {
          name: '/blacklist-bilgi',
          perm: 'Staff',
          desc: 'Kullanıcının blacklist kaydını gösterir.',
          usage: '/blacklist-bilgi kullanici:@user',
        },
        {
          name: '/sicil',
          perm: 'Staff',
          desc: 'Kullanıcının sicil kaydını görüntüler.',
          usage: '/sicil kullanici:@user',
        },
        {
          name: '/ceza-ekle',
          perm: 'Staff',
          desc: 'Kullanıcıya ceza kaydı ekler.',
          usage: '/ceza-ekle kullanici:@user aciklama:...',
        },
      ],
    },
    rol: {
      label: 'Roller',
      title: '👤 Roller & Üyeler',
      commands: [
        {
          name: '/rol ver',
          perm: 'Bot Command',
          desc: 'Kullanıcıya rol verir.',
          usage: '/rol ver kullanici:@user rol:@rol',
        },
        {
          name: '/rol al',
          perm: 'Bot Command',
          desc: 'Kullanıcıdan rol alır.',
          usage: '/rol al kullanici:@user rol:@rol',
        },
        {
          name: '/rolbilgi',
          perm: 'Bot Command',
          desc: 'Rol üye listesi ve toplu işlem paneli.',
          usage: '/rolbilgi rol:@rol',
        },
        {
          name: '/rollog',
          perm: 'Bot Command',
          desc: 'Kullanıcının rol ekleme/çıkarma geçmişini gösterir.',
          usage: '/rollog kullanici:@user',
        },
        {
          name: '/toplu-rol ver',
          perm: 'Bot Command',
          desc: 'Sunucudaki tüm üyelere rol verir.',
          usage: '/toplu-rol ver rol:@rol',
        },
        {
          name: '/toplu-rol al',
          perm: 'Bot Command',
          desc: 'Sunucudaki tüm üyelerden rol alır.',
          usage: '/toplu-rol al rol:@rol',
        },
        {
          name: '/kayitsiz',
          perm: 'Bot Command',
          desc: 'Kullanıcıyı kayıtsıza atar.',
          usage: '/kayitsiz kullanici:@user',
        },
        {
          name: '/rolsuz ver',
          perm: 'Üst Yönetim',
          desc: 'Kayıtsız/whitelist rolü olmayan üyelere toplu kayıtsız rolü verir.',
          usage: '/rolsuz ver',
        },
        {
          name: '/blroller',
          perm: 'Üst Yönetim',
          desc: 'Rol kara listesi paneli — BL roller ve muaf rol yönetimi.',
          usage: '/blroller',
        },
        {
          name: '/kullanici-bilgi',
          perm: 'Staff',
          desc: 'Kullanıcı geçmişi, davet, ceza ve aktivite paneli.',
          usage: '/kullanici-bilgi kullanici:@user',
        },
        {
          name: '/avatar',
          perm: 'Herkes',
          desc: 'Kullanıcı avatarını gösterir.',
          usage: '/avatar kullanici:@user',
        },
        {
          name: '/banner',
          perm: 'Herkes',
          desc: 'Kullanıcı bannerını gösterir.',
          usage: '/banner kullanici:@user',
        },
        {
          name: 'Sağ tık: Whitelist Ekle',
          perm: 'Staff',
          desc: 'Kullanıcıya whitelist onay paneli açar.',
          usage: 'Kullanıcıya sağ tık → Whitelist Ekle',
        },
        {
          name: 'Sağ tık: Rol Ekle / Rol Al',
          perm: 'Bot Command',
          desc: 'Hızlı rol verme veya alma menüsü.',
          usage: 'Kullanıcıya sağ tık → Rol Ekle / Rol Al',
        },
      ],
    },
    staff: {
      label: 'Staff',
      title: '⭐ Staff & Yetki',
      commands: [
        {
          name: '/stat',
          perm: 'Staff',
          desc: 'Personel istatistik paneli (ticket, kayıt, ses vb.).',
          usage: '/stat kullanici:@user',
        },
        {
          name: '/staff-top',
          perm: 'Üst Yönetim',
          desc: 'Staff liderlik tablosu.',
          usage: '/staff-top',
        },
        {
          name: '/yetki-baslat',
          perm: 'Yetkili Sorumlusu',
          desc: 'Yeni staff yetkisi başlatır (L1/L2/L3 seçimi).',
          usage: '/yetki-baslat kullanici:@user',
        },
        {
          name: '/ysay',
          perm: 'Bot Command',
          desc: 'Seste olmayan staff üyelerini etiketler.',
          usage: '/ysay',
        },
        {
          name: '/nerede',
          perm: 'Staff',
          desc: 'Kullanıcının ses kanalı ve mikrofon/kulaklık durumu.',
          usage: '/nerede kullanici:@user',
        },
        {
          name: '/destek',
          perm: 'Staff',
          desc: 'Destek kaydı oluşturur.',
          usage: '/destek',
        },
        {
          name: '/mazaret',
          perm: 'Staff',
          desc: 'Mazaret bildirir; mazaret-log kanalına düşer ve yetkililer onaylar.',
          usage: '/mazaret sebep:... bitis:02.06.2026 20:30',
        },
        {
          name: '/toplanti olustur',
          perm: 'Üst Yönetim',
          desc: 'Staff toplantısı planlar; staff\'e DM bildirimi gider.',
          usage: '/toplanti olustur kanal:#ses tarih:02.06.2026 20:30 baslik:...',
        },
        {
          name: '/toplanti liste',
          perm: 'Üst Yönetim',
          desc: 'Planlanan, bitmiş ve iptal toplantıları listeler.',
          usage: '/toplanti liste',
        },
        {
          name: '/toplanti yoklama',
          perm: 'Üst Yönetim',
          desc: 'Toplantı ses kanalındaki anlık katılımcıları gösterir.',
          usage: '/toplanti yoklama id:1',
        },
        {
          name: '/toplanti bittir',
          perm: 'Üst Yönetim',
          desc: 'Toplantıyı bitirir; katılım süresi raporu oluşturur.',
          usage: '/toplanti bittir id:1',
        },
        {
          name: '/toplanti sil',
          perm: 'Üst Yönetim',
          desc: 'Planlanmış toplantıyı iptal eder.',
          usage: '/toplanti sil id:1',
        },
      ],
    },
    ticket: {
      label: 'Ticket',
      title: '🎫 Ticket & Kurulum',
      commands: [
        {
          name: '/kurulum',
          perm: 'Yönetici / Üst Yönetim',
          desc: 'Kurulum paneli: log kanalları, ticket/mülakat/ekip ticket panelleri.',
          usage: '/kurulum',
        },
        {
          name: '/ticket-kapat',
          perm: 'Staff',
          desc: 'Bulunulan ticket kanalını kapatır.',
          usage: '/ticket-kapat',
        },
        {
          name: '/ticket-isim-degistir',
          perm: 'Staff',
          desc: 'Ticket kanalının adını değiştirir.',
          usage: '/ticket-isim-degistir isim:yeni-isim',
        },
        {
          name: '/ticket-devret',
          perm: 'Staff',
          desc: 'Ticket\'ı başka bir staff\'e devreder.',
          usage: '/ticket-devret yetkili:@staff',
        },
      ],
    },
    ekip: {
      label: 'Ekip',
      title: '👥 Ekip & Meslek',
      commands: [
        {
          name: '/ekip olustur',
          perm: 'Ekip Sorumlusu / Bot Command',
          desc: 'Yeni ekip oluşturur (kanal, rol, boss).',
          usage: '/ekip olustur isim:... sahip:@user',
        },
        {
          name: '/ekip kapat',
          perm: 'Ekip Sorumlusu / Bot Command',
          desc: 'Ekibi kapatır ve kayıttan siler.',
          usage: '/ekip kapat isim:...',
        },
        {
          name: '/ekipler',
          perm: 'Bot Command / Ekip Sorumlusu',
          desc: 'Açık ekipleri listeler ve **Ekip Düzenle** ile yönetim panelini açar.',
          usage: '/ekipler isim:...',
        },
        {
          name: '/meslek',
          perm: 'Config\'de tanımlı roller',
          desc: 'Ekip ve kullanıcı mesleklerini listeler ve yönetir.',
          usage: '/meslek',
        },
      ],
    },
    ses: {
      label: 'Ses',
      title: '🔊 Ses & Whitelist',
      commands: [
        {
          name: '/streamer',
          perm: 'Streamer rolü',
          desc: 'Canlı yayın duyurusu gönderir.',
          usage: '/streamer yayinlinki:https://...',
        },
        {
          name: '/toplu-sustur',
          perm: 'Bot Command',
          desc: 'Bulunulan ses kanalındaki herkesi susturur.',
          usage: '/toplu-sustur',
        },
        {
          name: '/toplu-sustur-ac',
          perm: 'Bot Command',
          desc: 'Bulunulan ses kanalındaki susturmaları açar.',
          usage: '/toplu-sustur-ac',
        },
        {
          name: '/whitelist',
          perm: 'Staff',
          desc: 'Whitelist onay paneli açar.',
          usage: '/whitelist',
        },
      ],
    },
  },
};
