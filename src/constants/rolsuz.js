module.exports = {
  sub: {
    ver: { name: 'ver', description: 'Rolsüz üyelere kayıtsız rolü ver' },
  },
  messages: {
    noPermission: '❌ Bu komut için üst yönetim yetkisi gerekli.',
    roleNotConfigured: '❌ Kayıtsız veya whitelist rolü config.js içinde tanımlı değil.',
    botCantManage: '❌ Bot kayıtsız rolünü yönetemiyor (yetki veya hiyerarşi).',
    scanning: '⏳ Üyeler yükleniyor…',
    noEligible: 'ℹ️ Kayıtsız veya whitelist rolü olmayan uygun üye bulunamadı.',
    done:
      '✅ **Rolsüz** işlemi tamamlandı.\n\n' +
      '**Kayıtsız verilen:** {success}\n' +
      '**Zaten kayıtsız/whitelist:** {skipped}\n' +
      '**Başarısız:** {failed}\n' +
      '**Taranan üye:** {total}',
  },
};
