module.exports = {
  options: {
    sebep: { name: 'sebep', description: 'Bakım sebebi' },
    acilis: { name: 'acilis', description: 'Tahmini açılış saati' },
    saat: { name: 'saat', description: 'Restart saati' },
  },
  status: {
    aktif: { label: '🟢 Online', title: '# Sunucu Aktif!' },
    bakim: { label: '🔴 Bakımda', title: '# Sunucu Bakımda!' },
    restart: { label: '🟡 Restart', title: '# Sunucu Restart Atıyor!' },
  },
  fields: {
    status: 'STATUS',
    connect: 'F8 CONNECT COMMAND',
    sebep: 'BAKIM SEBEBİ',
    acilis: 'AÇILIŞ SAATİ',
    restart: 'RESTART SAATİ',
  },
  buttons: {
    connect: { label: 'Connect', emoji: '🎮' },
  },
  noPermission: '❌ Bu komut için Üst Yönetim rolü gerekli.',
  notConfigured: '❌ FiveM sunucu ayarları config içinde tanımlı değil.',
  ip: {
    message:
      '🎮 **{server}** sunucu bağlantısı\n\n**F8:**\n```{connect}```\n\n**Adres:** `{address}`',
  },
};
