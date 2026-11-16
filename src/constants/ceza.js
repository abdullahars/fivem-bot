module.exports = {
  command: {
    name: 'ceza-ekle',
    description: 'Kullanıcıya ceza ekle (Staff)',
  },
  options: {
    user: { name: 'kullanici', description: 'Ceza verilecek kullanıcı' },
    reason: { name: 'aciklama', description: 'Ceza açıklaması' },
    multiplier: { name: 'carpan', description: 'Ceza çarpanı (örn: 15 için 15x ceza)' },
    days: { name: 'gun', description: 'Kaç gün ceza (0 = süresiz)' },
  },
  messages: {
    noPermission: '❌ Bu komutu kullanmak için Staff yetkisi gerekli.',
    success:
      '✅ **{target}** kullanıcısına ceza eklendi.\n' +
      '**Ceza No:** #{number}\n' +
      '**Çarpan:** {multiplier}x\n' +
      '**Süre:** {duration}\n' +
      '{optionalExpiry}' +
      '**Açıklama:** {reason}\n' +
      '{nicknameNote}' +
      '{karakterOnayNote}',
    expiryDateLine: '**Açılış tarihi:** {expiryDate}\n',
    nicknameApplied:
      '**Takma ad:** Sunucu ismi `(GG/AA/YYYY)` formatında güncellendi — örn. `İsim Soyisim ({expiryDate})`',
    nicknameFailed: '⚠️ Takma ad güncellenemedi (yetki veya hiyerarşi).',
    karakterOnayRemoved: '\n**Karakter onay:** Rol alındı.',
    karakterOnayNone: '\n**Karakter onay:** Kullanıcıda karakter onay rolü yok.',
    karakterOnayFailed:
      '\n⚠️ **Karakter onay:** Rol alınamadı (bot yetkisi veya rol hiyerarşisi).',
    karakterOnayNoMember:
      '\n**Karakter onay:** Kullanıcı sunucuda değil; rol kontrol edilemedi.',
    targetBot: '❌ Botlara ceza verilemez.',
    notFound: '❌ Kullanıcı bulunamadı.',
  },
  publicLog: {
    title: '⚠️ Ceza Verildi',
    desc: '**Ceza No:** #{number}\n**Kullanıcı:** {target}\n**Yetkili:** {staff}\n**Çarpan:** {multiplier}x Ceza\n**Süre:** {duration}\n**Açıklama:** {reason}\n**Tarih:** <t:{timestamp}:F>\n{expiry}',
  },
  privateLog: {
    title: '📋 Ceza Log',
    desc: '**Ceza No:** #{number}\n**Hedef:** {target} (`{targetId}`)\n**Yetkili:** {staff} (`{staffId}`)\n**Çarpan:** {multiplier}x\n**Süre:** {duration}\n**Açıklama:** {reason}\n**Tarih:** <t:{timestamp}:F>\n{expiry}',
  },
  sicil: {
    title: '📋 Sicil Kaydı - {user}',
    noPenalties: 'Sicil temiz, hiç ceza kaydı yok.',
    penaltyLine: '**#{number}** ({multiplier}x) - {reason}\n└ Yetkili: {staff} • <t:{timestamp}:R>{expiry}',
    noPermissionUst: '❌ Sicil temizlemek için üst yönetim yetkisi gerekli.',
    clearSuccess: '✅ **{target}** için {count} aktif ceza kaydı sicilden kaldırıldı (pasif).',
    clearEmpty: 'ℹ️ **{target}** için temizlenecek aktif ceza kaydı yok.',
    clearLogTitle: 'Sicil Temizlendi',
    clearLogDesc:
      '**Yetkili:** {staff}\n**Kullanıcı:** {target}\n**Kaldırılan kayıt:** {count}',
  },
  duration: {
    permanent: 'Süresiz',
    days: '{days} gün',
  },
  expiry: {
    line: '\n**Açılış:** <t:{expiresAt}:F> (<t:{expiresAt}:R>)',
  },
};
