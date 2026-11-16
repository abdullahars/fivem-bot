module.exports = {
  options: {
    user: { name: 'kullanici', description: 'Banlanacak kullanıcı' },
    reason: { name: 'sebep', description: 'Ban sebebi' },
    target: { name: 'hedef', description: 'Kullanıcı veya Discord ID' },
    id: { name: 'id', description: 'Discord kullanıcı ID' },
  },
  messages: {
    targetBot: '❌ Botlar banlanamaz.',
    notBannable: '❌ Bu kullanıcı banlanamıyor.',
    noReason: '❌ Ban sebebi girmelisiniz.',
    noTarget: '❌ Kullanıcı veya ID belirtmelisiniz.',
    invalidId: '❌ Geçersiz kullanıcı ID.',
    banSuccess: '✅ {target} banlandı.\n**Sebep:** {reason}',
    unbanSuccess: '✅ {target} banı kaldırıldı.',
    notBanned: '❌ Bu kullanıcı için aktif ban kaydı bulunamadı.',
    notFound: '❌ Ban kaydı bulunamadı.',
    alreadyBanned: '❌ Kullanıcı zaten banlı.',
    botNoPerm: '❌ Botun ban yetkisi yok.',
    noBanhammer: '❌ Bu komut için Banhammer rolü gerekli.',
  },
  log: {
    banTitle: '🔨 Kullanıcı Banlandı',
    unbanTitle: '🔓 Ban Kaldırıldı',
    banDesc:
      '**Yetkili:** {staff}\n**Hedef:** {target}\n**Sebep:** {reason}\n**Tarih:** {date}',
    unbanDesc: '**Yetkili:** {staff}\n**Hedef:** {target}\n**Tarih:** {date}',
  },
  bilgi: {
    title: '🔨 Ban Bilgisi',
    activeDesc:
      '**Banlanan:** {target}\n**Sebep:** {reason}\n**Banlayan:** {staff}\n**Tarih:** <t:{ts}:F> (<t:{ts}:R>)',
    inactiveDesc:
      '**Banlanan:** {target}\n**Sebep:** {reason}\n**Banlayan:** {staff}\n**Ban Tarihi:** <t:{ts}:F>\n**Kaldıran:** {unbanner}\n**Kaldırılma:** <t:{uts}:F>',
    unbanButton: 'Ban Kaldır',
  },
};
