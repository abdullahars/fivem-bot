module.exports = {
  buttons: {
    approvePrefix: 'whitelist_approve_',
    rejectPrefix: 'whitelist_reject_btn_',
    rejectModalPrefix: 'whitelist_reject_modal_',
  },
  modal: {
    title: 'Whitelist Red',
    reasonId: 'reason',
    reasonLabel: 'Red sebebi',
    reasonPlaceholder: 'Red sebebini yazın (loglara düşer)...',
  },
  options: {
    user: { name: 'kullanici', description: 'İşlem yapılacak kullanıcı' },
    steam: { name: 'steam', description: 'Steam ID (ör: steam:1100001...)' },
    hex: { name: 'hex', description: 'FiveM Hex ID (ör: license:xxx)' },
  },
  /** Whitelist onayından sonra, IC isim onayına kadar kullanılan geçici isim */
  pendingIcNickname: 'IC ISIM',
  messages: {
    verSuccess: '✅ {target} kullanıcısına whitelist verildi.',
    alSuccess: '✅ {target} kayıtsıza atıldı (whitelist alındı).',
    alreadyWhitelist: '❌ {target} zaten whitelist rolüne sahip.',
    notWhitelist: '❌ {target} whitelist rolüne sahip değil.',
    steamRequired: '❌ Steam ID zorunlu. Komutta `steam` alanını doldurun.',
    hexRequired: '❌ Hex ID zorunlu. Komutta `hex` alanını doldurun.',
    limitVer: '❌ Günlük whitelist verme limitine ulaştınız ({limit}).',
    limitAl: '❌ Günlük whitelist alma limitine ulaştınız ({limit}).',
    roleNotConfigured: '❌ Config\'de whitelist veya kayıtsız rol ID tanımlı değil.',
    botCantManage: '❌ Bot bu rolleri yönetemiyor (rol sırasını kontrol edin).',
    targetBot: '❌ Bot kullanıcılarına işlem yapılamaz.',
  },
  log: {
    onayTitle: 'Whitelist Onay',
    onayDesc:
      '**Yetkili:** {staff}\n**Kullanıcı:** {target}\n**Steam:** {steam}\n**Hex:** {hex}',
    redTitle: 'Whitelist Red',
    redDesc:
      '**Yetkili:** {staff}\n**Kullanıcı:** {target}\n**Sebep:** {reason}\n**Steam:** {steam}\n**Hex:** {hex}',
    summaryOnayTitle: 'Whitelist Log — Onay',
    summaryRedTitle: 'Whitelist Log — Red',
    kayitsizTitle: 'Kayıtsıza Atıldı',
    kayitsizDesc: '**Yetkili:** {staff}\n**Kullanıcı:** {target}',
  },
  dm: {
    red: 'Whitelist başvurunuz reddedildi.\n\n**Sebep:** {reason}',
  },
};
