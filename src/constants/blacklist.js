module.exports = {
  options: {
    user: {
      name: 'kullanici',
      description: 'Blacklist eklenecek/kaldırılacak kullanıcı',
    },
    reason: {
      name: 'aciklama',
      description: 'Blacklist sebebi',
    },
  },

  messages: {
    success: '✅ **{user}** blacklist\'e eklendi.\n📋 **Blacklist No:** #{number}',
    removed: '✅ **{user}** blacklist\'ten kaldırıldı. Kayıtsız rolü verildi.\n📋 **Blacklist No:** #{number}',
    notFound: '❌ Bu kullanıcı aktif blacklist\'te değil.',
    alreadyBlacklisted:
      '❌ **{user}** zaten blacklist\'te.\n📋 **Blacklist No:** #{number}',
    noPermission: '❌ Bu komutu kullanmak için Banhammer yetkisi gerekli.',
    targetBot: '❌ Bot kullanıcıları blacklist\'e eklenemez.',
  },

  publicLog: {
    title: 'Blacklist Eklendi',
    desc:
      '**Blacklist No:** #{number}\n' +
      '**Kullanıcı:** {user}\n' +
      '**Sebep:** {reason}\n' +
      '**Yetkili:** {staff}\n' +
      '**Tarih:** <t:{timestamp}:F>',
  },

  privateLog: {
    title: 'Blacklist Detay',
    desc:
      '**Blacklist No:** #{number}\n' +
      '**Kullanıcı:** {user}\n' +
      '**User ID:** `{userId}`\n' +
      '**Sebep:** {reason}\n' +
      '**Yetkili:** {staff}\n' +
      '**Staff ID:** `{staffId}`\n' +
      '**Alınan roller:** {roles}\n' +
      '**Tarih:** <t:{timestamp}:F>',
  },

  removePublicLog: {
    title: 'Blacklist Kaldırıldı',
    desc:
      '**Blacklist No:** #{number}\n' +
      '**Kullanıcı:** {user}\n' +
      '**Kaldıran:** {staff}\n' +
      '**Tarih:** <t:{timestamp}:F>',
  },

  infoPanel: {
    title: 'Blacklist Bilgisi',
    activeDesc:
      '**Durum:** Aktif\n' +
      '**Blacklist No:** #{number}\n' +
      '**Kullanıcı:** {user}\n' +
      '**User ID:** `{userId}`\n' +
      '**Sebep:** {reason}\n' +
      '**Ekleyen:** {staff}\n' +
      '**Eklenme:** <t:{timestamp}:F>\n' +
      '**Alınan roller:** {roles}',
    inactiveDesc:
      '**Durum:** Kaldırılmış\n' +
      '**Blacklist No:** #{number}\n' +
      '**Kullanıcı:** {user}\n' +
      '**Sebep:** {reason}\n' +
      '**Ekleyen:** {staff}\n' +
      '**Eklenme:** <t:{timestamp}:F>\n' +
      '**Kaldıran:** {removedBy}\n' +
      '**Kaldırılma:** <t:{removedAt}:F>',
    notFound: 'Bu kullanıcı için blacklist kaydı bulunamadı.',
  },

  autoBlacklist: {
    title: 'Otomatik Blacklist',
    desc:
      '**{user}** sunucuya giriş yaptı; aktif blacklist kaydı uygulandı.\n\n' +
      '**Blacklist No:** #{number}',
  },
};
