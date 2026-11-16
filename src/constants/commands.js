module.exports = {
  changelog: {
    name: 'changelog',
    description: 'Sunucu güncelleme notu yayınlar (Üst Yönetim)',
  },
  sil: {
    name: 'sil',
    description: 'Kanaldaki son mesajları siler (Bot Command / Üst Yönetim)',
    optionAmount: {
      name: 'sayi',
      description: 'Silinecek mesaj sayısı (1-500)',
    },
  },
  say: {
    name: 'say',
    description: 'Sunucu istatistiklerini gösterir (Bot Command)',
  },
  kilit: {
    name: 'kilit',
    description: 'Kanalı kilitle / kilidi aç — yazmayı kapatır (Üst Yönetim)',
  },
  streamer: {
    name: 'streamer',
    description: 'Canlı yayın duyurusu gönderir (Streamer)',
    optionYayinLinki: {
      name: 'yayinlinki',
      description: 'Canlı yayın linki',
    },
  },
  meslek: {
    name: 'meslek',
    description: 'Tüm ekip ve kullanıcı mesleklerini listeler ve yönetir',
  },
  cekilis: {
    name: 'cekilis',
    description: 'Çekiliş başlatır (Üst Yönetim)',
    optionAciklama: {
      name: 'aciklama',
      description: 'Çekiliş açıklaması / ödül bilgisi',
    },
    optionKazanan: {
      name: 'kazanan',
      description: 'Kazanacak kişi sayısı (aynı sayıda yedek)',
    },
    optionSure: {
      name: 'sure',
      description: 'Çekiliş süresi (dakika)',
    },
  },
  oylama: {
    name: 'oylama',
    description: 'İki seçenekli oylama oluşturur (Bot Command / Üst Yönetim)',
    optionAciklama: {
      name: 'aciklama',
      description: 'Oylama açıklaması / sorusu',
    },
    optionSure: {
      name: 'sure',
      description: 'Oylama süresi (dakika)',
    },
    optionButon1: {
      name: 'buton1',
      description: '1. seçenek buton yazısı',
    },
    optionButon2: {
      name: 'buton2',
      description: '2. seçenek buton yazısı',
    },
  },
  stat: {
    name: 'stat',
    description: 'Personel istatistik paneli (Staff)',
    optionUser: {
      name: 'kullanici',
      description: 'İstatistiğine bakılacak staff (boş = kendiniz)',
    },
  },
  topStat: {
    name: 'top-stat',
    description: 'Sunucu liderlik tablosu (Bot Command)',
  },
  whitelist: {
    name: 'whitelist',
    description: 'Whitelist onay paneli aç (Staff)',
  },
  kayitsiz: {
    name: 'kayitsiz',
    description: 'Kullanıcıyı kayıtsıza at (Bot Command)',
    optionUser: {
      name: 'kullanici',
      description: 'Kayıtsıza atılacak kullanıcı',
    },
  },
  rolsuz: {
    name: 'rolsuz',
    description: 'Rolsüz üyelere toplu kayıtsız rolü (Üst Yönetim)',
    sub: {
      ver: { name: 'ver', description: 'Kayıtsız/whitelist rolü olmayanlara kayıtsız ver' },
    },
  },
  topluSustur: {
    name: 'toplu-sustur',
    description: 'Ses kanalındaki herkesi susturur (Bot Command)',
  },
  topluSusturAc: {
    name: 'toplu-sustur-ac',
    description: 'Ses kanalı susturmalarını açar (Bot Command)',
  },
  rollog: {
    name: 'rollog',
    description: 'Kullanıcının rol geçmişini gösterir (Bot Command)',
    optionUser: {
      name: 'kullanici',
      description: 'Rol geçmişine bakılacak kullanıcı',
    },
  },
  islemler: {
    name: 'işlemler',
    description: 'Kullanıcıya yapılan tüm yetkili işlemlerini gösterir (Bot Command)',
    optionUser: {
      name: 'kullanici',
      description: 'İşlem geçmişine bakılacak kullanıcı',
    },
  },
  rolbilgi: {
    name: 'rolbilgi',
    description: 'Rol bilgisi ve toplu işlemler (Bot Command)',
    optionRole: {
      name: 'rol',
      description: 'Bilgisi görüntülenecek rol',
    },
  },
  rol: {
    name: 'rol',
    description: 'Kullanıcıya rol ver / al (Bot Command)',
    sub: {
      ver: { name: 'ver', description: 'Kullanıcıya rol ver' },
      al: { name: 'al', description: 'Kullanıcıdan rol al' },
    },
  },
  ban: {
    name: 'ban',
    description: 'Kullanıcıyı banla (Banhammer)',
  },
  unban: {
    name: 'unban',
    description: 'Ban kaldır (Banhammer)',
  },
  banBilgi: {
    name: 'ban-bilgi',
    description: 'Ban bilgisi görüntüle (Staff)',
  },
  yetkiBaslat: {
    name: 'yetki-baslat',
    description: 'Staff yetkisi başlat — L1/L2/L3 seç (Yetkili Sorumlusu)',
    optionUser: {
      name: 'kullanici',
      description: 'Yetki verilecek kullanıcı',
    },
  },
  staffTop: {
    name: 'staff-top',
    description: 'Staff top liderlik paneli (Üst Yönetim)',
  },
  kullaniciBilgi: {
    name: 'kullanici-bilgi',
    description: 'Kullanıcı geçmişi ve bilgileri (Staff)',
  },
  aktif: {
    name: 'aktif',
    description: 'Sunucu aktif duyurusu (Üst Yönetim)',
  },
  bakim: {
    name: 'bakim',
    description: 'Sunucu bakım duyurusu (Üst Yönetim)',
  },
  restart: {
    name: 'restart',
    description: 'Sunucu restart duyurusu (Üst Yönetim)',
  },
  ip: {
    name: 'ip',
    description: 'Sunucu bağlantı IP / connect komutu',
  },
  avatar: {
    name: 'avatar',
    description: 'Kullanıcı avatarını gösterir',
  },
  banner: {
    name: 'banner',
    description: 'Kullanıcı bannerını gösterir',
  },
  ysay: {
    name: 'ysay',
    description: 'Seste olmayan staff üyelerini etiketle (Bot Command)',
  },
  ekip: {
    name: 'ekip',
    description: 'Ekip yönetimi (Bot Command / Ekip Sorumlusu)',
  },
  ekipler: {
    name: 'ekipler',
    description: 'Sunucudaki ekipleri listeler (Bot Command / Ekip Sorumlusu)',
  },
  topluRol: {
    name: 'toplu-rol',
    description: 'Toplu rol ver/al (Bot Command)',
    sub: {
      ver: { name: 'ver', description: 'Tüm üyelere rol ver' },
      al: { name: 'al', description: 'Tüm üyelerden rol al' },
    },
  },
  cezaEkle: {
    name: 'ceza-ekle',
    description: 'Kullanıcıya ceza ekle (Staff)',
    optionUser: {
      name: 'kullanici',
      description: 'Ceza verilecek kullanıcı',
    },
    optionReason: {
      name: 'aciklama',
      description: 'Ceza açıklaması',
    },
  },
  sicil: {
    name: 'sicil',
    description: 'Kullanıcının sicil kaydını görüntüle (Staff)',
    optionUser: {
      name: 'kullanici',
      description: 'Sicili görüntülenecek kullanıcı',
    },
  },
  destek: {
    name: 'destek',
    description: 'Destek kaydı oluştur (Staff)',
  },
  blacklist: {
    name: 'blacklist',
    description: 'Kullanıcıyı blacklist\'e ekle (Banhammer)',
    optionUser: {
      name: 'kullanici',
      description: 'Blacklist eklenecek kullanıcı',
    },
    optionReason: {
      name: 'aciklama',
      description: 'Blacklist sebebi',
    },
  },
  unblacklist: {
    name: 'unblacklist',
    description: 'Kullanıcıyı blacklist\'ten kaldır (Staff)',
    optionUser: {
      name: 'kullanici',
      description: 'Blacklist\'ten kaldırılacak kullanıcı',
    },
  },
  blacklistBilgi: {
    name: 'blacklist-bilgi',
    description: 'Kullanıcının blacklist bilgisini göster (Staff)',
    optionUser: {
      name: 'kullanici',
      description: 'Bilgisine bakılacak kullanıcı',
    },
  },
  ticketKapat: {
    name: 'ticket-kapat',
    description: 'Bulunduğun ticket kanalını kapatır (Staff)',
  },
  ticketIsimDegistir: {
    name: 'ticket-isim-degistir',
    description: 'Ticket kanalının adını değiştirir (Staff)',
    optionName: {
      name: 'isim',
      description: 'Yeni kanal adı',
    },
  },
  ticketDevret: {
    name: 'ticket-devret',
    description: 'Ticket\'ı başka bir yetkiliye devreder (Staff)',
    optionStaff: {
      name: 'yetkili',
      description: 'Devredilecek staff üyesi',
    },
  },
  kurulum: {
    name: 'kurulum',
    description: 'Kurulum paneli — log kanalları, ticket/mülakat/ekip panelleri (Yönetici / Üst Yönetim)',
  },
  config: {
    name: 'config',
    description: 'Config ayar paneli — rol, kanal ve aç/kapat ayarları (Owner)',
  },
  veriler: {
    name: 'veriler',
    description: 'Veri yönetimi — stat/puan/sicil sıfırlama paneli (Owner)',
  },
  coin: {
    name: 'coin',
    description: 'Coin durumunu gösterir (Staff)',
  },
  coinDukkani: {
    name: 'coin-dukkani',
    description: 'Coin ile alınabilecek ödülleri gösterir (Staff)',
  },
  coinDuzenle: {
    name: 'coin-duzenle',
    description: 'Coin oranları, dükkan ürünleri ve sıfırlama (Owner)',
  },
  lb: {
    name: 'lb',
    description: 'Haftalık performans liderlik tablosu (Yetkili Sorumlusu)',
  },
  profil: {
    name: 'profil',
    description: 'Yetkilinin son 4 haftalık performans grafiği (Yetkili Sorumlusu)',
    optionUser: {
      name: 'kullanici',
      description: 'Performansı görüntülenecek yetkili',
    },
  },
  haftaRaporu: {
    name: 'hafta-raporu',
    description: 'Geçen haftanın performans raporunu gönderir (Yetkili Sorumlusu)',
  },
  blroller: {
    name: 'blroller',
    description: 'Rol kara listesi paneli — BL roller ve muaf rol yönetimi (Üst Yönetim)',
  },
  toplanti: {
    name: 'toplanti',
    description: 'Staff toplantı planlama (Üst Yönetim)',
    sub: {
      olustur: { name: 'olustur', description: 'Yeni toplantı planla' },
      liste: { name: 'liste', description: 'Planlanan toplantıları listele' },
      sil: { name: 'sil', description: 'Toplantıyı iptal et' },
      yoklama: { name: 'yoklama', description: 'Ses kanalındaki katılımcıları listele' },
      bittir: { name: 'bittir', description: 'Toplantıyı bitir ve katılım raporu oluştur' },
    },
    options: {
      baslik: { name: 'baslik', description: 'Toplantı başlığı' },
      kanal: { name: 'kanal', description: 'Toplantı ses kanalı' },
      tarih: { name: 'tarih', description: 'Tarih ve saat (ör. 02.06.2026 20:30)' },
      id: { name: 'id', description: 'Toplantı numarası (#id)' },
    },
  },
  nerede: {
    name: 'nerede',
    description: 'Kullanıcının ses kanalı ve mikrofon/kulaklık durumu (Staff)',
    optionUser: {
      name: 'kullanici',
      description: 'Sorgulanacak kullanıcı',
    },
  },
  help: {
    name: 'help',
    description: 'Bot komut rehberi — kategorili kullanım paneli (Bot Command / Üst Yönetim)',
  },
  mazaret: {
    name: 'mazaret',
    description: 'Mazaret bildir (Staff)',
  },
  contextMenus: {
    whitelistEkle: {
      name: 'Whitelist Ekle',
      type: 2,
    },
    rolEkle: {
      name: 'Rol Ekle',
      type: 2,
    },
    rolAl: {
      name: 'Rol Al',
      type: 2,
    },
  },
};
