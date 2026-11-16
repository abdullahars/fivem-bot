module.exports = {
  optionAmount: {
    name: 'sayi',
    description: 'Silinecek mesaj sayısı (1-500)',
  },
  messages: {
    noPermission:
      '❌ Bu komut için Bot Command veya Üst Yönetim yetkisine ihtiyacınız var.',
    notTextChannel: '❌ Bu komut yalnızca metin kanallarında kullanılabilir.',
    invalidAmount: '❌ Silinecek mesaj sayısı 1 ile 500 arasında olmalı.',
    botMissingPermission: '❌ Bu kanalda mesaj silme yetkim yok.',
    nothingDeleted: '❌ Silinecek mesaj bulunamadı (14 günden eski mesajlar toplu silinemez).',
    deleted: '✅ **{count}** mesaj silindi.',
    partialDeleted:
      '✅ **{count}** mesaj silindi. Kalan mesajlar 14 günden eski olduğu için silinemedi.',
    failed: '❌ Mesajlar silinirken bir hata oluştu.',
  },
  limits: {
    min: 1,
    max: 500,
    batchSize: 100,
  },
};
