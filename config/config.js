/**
 * Bot yapılandırması — değişiklikten sonra botu yeniden başlatın.
 *
 * LOG (19 kanal): /kurulum ile açılır, isimle bağlanır — ID gerekmez.
 *   ticket-log, whitelist-log, ic-isim-log, … (tam liste: src/constants/logChannels.js)
 *
 * DİĞER KANALLAR: ids.channels içine Discord kanal ID yazın.
 */
module.exports = {
  // /config komutunu YALNIZCA bu kullanıcı ID'leri kullanabilir.
  // Boş bırakılırsa sadece sunucu sahibi kullanabilir.
  owner: {
    ids: [
     '492702255368110091', // 'KULLANICI_ID'',
    ],
  },

  bot: {
    // Konsola yazılacak hazır mesajı ({botTag}, {guildCount})
    readyMessage: '✅ {botTag} hazır! {guildCount} sunucuda aktif.',
    // Embed / Components V2 vurgu rengi (hex)
    embedColor: '#393A41',
    // Panel alt yazısı (-# küçük metin)
    footer: 'ao system',
    // Botun sürekli duracağı ses kanalı (boş = sese girmez)
    voice: {
      enabled: true,
      channelId: '1516484925132505161', // Discord ses kanalı 
      selfDeaf: true, // Kulaklık kapalı (önerilir)
      selfMute: false,
    },
  },

  ids: {
    // Staff yetkisi — çoğu moderasyon komutu bu role bakar
    staffRole: '1516484473703759894',
    // Bot komutlarını kullanabilen rol (top-stat, rollog vb.)
    botCommandRole: '1516484434524897344',

    roles: {
      whitelist: '1516484528154349760', // WL onayında verilen rol
      kayitsiz: '1516484536379248842', // Kayıtsız / WL red sonrası
      karakterOnay: '1516484530654154793', // IC isim onayı sonrası
      banhammer: '1516484443072757850', // Ban / unban
      ustYonetim: '1516484431538552863', // Üst yönetim komutları
      ekipSorumlusu: '1516484446818140260', // Ekip işlemleri
      blacklist: '1516484494377353266', // Blacklist rolü
      yetkiliSorumlusu: '1516484468297302037', // Yetkili sorumlusu (/yetki-baslat)
    },
  // /ekip olustur — bu rollere sahip olanlar kullanabilir (birden fazla ID)
  ekipOlustur: {
    allowedRoleIds: [
      '1516484446818140260', // Ekip Sorumlusu
    '1516484454359761012',// 
      // 'YENİ_ROL_ID',
    ],
  },

    // Kurulum dışı kanallar — kanal ID (Geliştirici Modu → ID kopyala)
    channels: {
      ticketPanel: '1516485216330322020', // Ticket panel mesajının gideceği kanal
      whitelistOnayLog: '1516485027616133240', // WL onay logu
      whitelistRedLog: '1516485029222678599', // WL red logu
      icIsim: '1516485045697646692', // IC isim başvuru kanalı (oyuncu yazar)
      mulakatPanel: '1524848999637454868', // Mülakat panel kanalı
      ekipTicketPanel: '1522649768713523360', // Ekip ticket panel kanalı
      cezalar: '1516485223716487188', // Herkese açık ceza duyurusu
      blacklistPublic: '1516485227214536925', // Herkese açık blacklist duyurusu
      changelog: '1516485074596532234', // /changelog yayın kanalı (Discord kanal ID)
    },
    categories: {
      parent: '1516484949967114260', // Varsayılan ticket kategorisi
      ekip: '1516484943893762397', // Ekip kanalları
      ekipTicket: '1516484954765263082', // Ekip ticket kanalları
      ic: '1516484952487629062', // IC ticket
      ooc: '1516484951166423132', // OOC ticket
      ac: '1516484953272094752', // AC ticket (eski bug kategorisi)
    },
  },

  ekip: {
    // /ekip olustur — ekip sahibine verilen boss perm rolü (Discord rol ID)
    bossRoleId: '1516484529404252225',
  },

  kayitsiz: {
    // Sunucuya girenlere otomatik kayıtsız rolü
    autoOnJoin: true,
  },

  whitelist: {
    requireSteam: false, // WL panelinde Steam zorunlu mu
    requireHex: false, // WL panelinde Hex zorunlu mu
    limits: {
      verPerDay: 0, // Günlük WL verme limiti (0 = sınırsız)
      kayitsizPerDay: 0, // Günlük kayıtsız limiti (0 = sınırsız)
    },
    // WL onayı sonrası kullanıcıya DM ile yetkili puanlama
    kayitPuan: {
      enabled: true,
    },
  },

  // Staff coin sistemi — /coin, /coin-dukkani, /coin-duzenle
  coin: {
    enabled: true, // Sistem açık mı (configden aç/kapat)
    // Kazanım oranları — ondalık kabul edilir (ör. 0.25)
    rates: {
      ticket: 1, // Ticket ilgilenme (claim) başına
      kayit: 1, // WL kayıt onayı başına
      icIsim: 1, // IC isim onayı başına
      voiceHour: 1, // Seste geçirilen her saat başına
      destekAlinan: 1, // Destek alınan başına
      destekYardim: 1, // Destek yardım başına
      ekipAc: 1, // Ekip açma başına
      ekipReferans: 1, // Ekip referansı gösterilen yetkili başına
    },
  },

  // Yetkili performans takip + rank öneri sistemi (/lb, /profil, /hafta-raporu)
  performance: {
    enabled: true,
    // Haftalık rapor + rank öneri kanalları (boş = env: RAPOR_KANAL_ID / RANK_ONERI_KANAL_ID)
    raporKanalId: '1520524411260895403',
    rankOneriKanalId: '1520524411260895403',
    // Ortalamanın yüzde kaçı "üstte" sayılır
    ustEsik: 110,
    // Rank önerisi için üst üste hafta + en az aktif hafta
    oneriHaftaSayisi: 3,
    oneriMinAktifHafta: 2,
    // Ağırlıklar (toplam 100)
    weights: {
      ticketKapatilan: 30,
      kayitToplam: 25,
      icToplam: 15,
      destekToplam: 10,
      ekipToplam: 10,
      mesaj: 5,
      hiz: 5,
    },
  },

  icIsim: {
    enabled: true,
    // Başvuru kanalı: ids.channels.icIsim (veya buraya channelId)
    channelId: '1516485045697646692',
    approveEmoji: '✅',
    rejectEmoji: '❌',
  },

  topStat: {
    limit: 5, // Liderlik tablosu satır sayısı
  },

  staffTop: {
    limit: 5, // Staff top listesi limiti
  },

  // Aktivite istatistikleri — destek ses kategorisi eşlemesi
  staffBilgi: {
    destekCategoryId: '1516484959538380911', // Destek ses kategorisi (boş = hesaplanmaz)
  },

  // /yetki-baslat — staff + L1/L2/L3 rol atama
  yetkiBaslat: {
    allowedRoleIds: [
      '1516484468297302037', // Yetkili Sorumlusu
      // 'YENİ_ROL_ID',
    ],
    levels: {
      l1: '1516484444343500921', // L1 perm rol ID
      l2: '1516484441499762761', // L2 perm rol ID
      l3: '1516484440770088971', // L3 perm rol ID
    },
  },

  moderation: {
    enabled: true, // Mesaj moderasyonu
  },

  ysay: {
    message: '🎤 **Yetkili ses çağrısı**\n\nSeste olmayan yetkililer, lütfen en kısa sürede ses kanallarına geçin.\n\n{mentions}',
    dmMessage: '🎤 **{guild}** sunucusunda yetkili ses çağrısı var.\n\nLütfen en kısa sürede bir ses kanalına geçin.',
  },

  logging: {
    joinLeave: true,
    messages: true,
    voice: true,
  },

  panel: {
    imageUrl: 'https://cdn.discordapp.com/attachments/1519016423589023754/1519018820314992780/f88470430350bb53189671456ebe4664.webp?ex=6a3c0804&is=6a3ab684&hm=d62c08f617b831cf36b47becc04f02e18e8c3086f1ad41d769198ffb491c174c&',
  },

  // /meslek — bu rollere sahip olanlar kullanabilir
  meslek: {
    allowedRoleIds: [
      '1516484446818140260', // Ekip Sorumlusu
      '1516484454359761012', 
    ],
  },

  // Mülakat — bekleme sesine geçince özel oda + staff bildirimi
  mulakat: {
    waitingVoiceChannelId: '1516484989351362752', // Bekleme ses kanalı
    notifyChannelId: '1524850407455854645', // Staff etiketli bildirim kanalı
    privateRoomCategoryId: '1516484929985314817', // Özel odaların kategorisi (boş = kategorisiz)
    callCooldownMinutes: 5, // Panel "Mülakat Çağır" butonu cooldown (dk)
    imageUrl: 'https://cdn.discordapp.com/attachments/1519016423589023754/1519018820314992780/f88470430350bb53189671456ebe4664.webp?ex=6a3c0804&is=6a3ab684&hm=d62c08f617b831cf36b47becc04f02e18e8c3086f1ad41d769198ffb491c174c&', // Boş = panel.imageUrl
  },

  // /streamer — yayın duyurusu (rol + kanal ID)
  streamer: {
    roleId: '1516484500631191582', // Streamer rolü
    channelId: '1516485173082980442', // Duyurunun gideceği kanal
    imageUrl: 'https://cdn.discordapp.com/attachments/1519016423589023754/1519018820314992780/f88470430350bb53189671456ebe4664.webp?ex=6a3c0804&is=6a3ab684&hm=d62c08f617b831cf36b47becc04f02e18e8c3086f1ad41d769198ffb491c174c&', // Boş = panel.imageUrl kullanılır
  },

  ekipTicket: {
    imageUrl: 'https://cdn.discordapp.com/attachments/1519016423589023754/1519018820314992780/f88470430350bb53189671456ebe4664.webp?ex=6a3c0804&is=6a3ab684&hm=d62c08f617b831cf36b47becc04f02e18e8c3086f1ad41d769198ffb491c174c&',
  },


  fivem: {
    serverName: 'ao system',
    tagline: 'Sunucumuza hoş geldiniz — kaliteli roleplay deneyimi.',
    connectCommand: 'connect 127.0.0.1:30120',
    connectLink: 'https://cfx.re/join/CFX_KODUNUZ',
    discordLink: 'https://discord.gg/ORNEK',
    discordButtonLabel: 'Discord',
    maxPlayers: 128,
    statusEndpoint: 'http://127.0.0.1:30120/dynamic.json',
    logoUrl: 'https://cdn.discordapp.com/attachments/1519016423589023754/1519018820314992780/f88470430350bb53189671456ebe4664.webp?ex=6a3c0804&is=6a3ab684&hm=d62c08f617b831cf36b47becc04f02e18e8c3086f1ad41d769198ffb491c174c&',
    images: {
      aktif: 'https://cdn.discordapp.com/attachments/1519016423589023754/1519018820314992780/f88470430350bb53189671456ebe4664.webp?ex=6a3c0804&is=6a3ab684&hm=d62c08f617b831cf36b47becc04f02e18e8c3086f1ad41d769198ffb491c174c&',
      bakim: 'https://cdn.discordapp.com/attachments/1519016423589023754/1519018820314992780/f88470430350bb53189671456ebe4664.webp?ex=6a3c0804&is=6a3ab684&hm=d62c08f617b831cf36b47becc04f02e18e8c3086f1ad41d769198ffb491c174c&',
      restart: 'https://cdn.discordapp.com/attachments/1519016423589023754/1519018820314992780/f88470430350bb53189671456ebe4664.webp?ex=6a3c0804&is=6a3ab684&hm=d62c08f617b831cf36b47becc04f02e18e8c3086f1ad41d769198ffb491c174c&',
    },
  },
};
