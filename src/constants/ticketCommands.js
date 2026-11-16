module.exports = {
  kapat: {
    name: 'ticket-kapat',
    description: 'Bulunduğun ticket kanalını kapatır (Staff)',
  },
  isimDegistir: {
    name: 'ticket-isim-degistir',
    description: 'Ticket kanalının adını değiştirir (Staff)',
    optionName: {
      name: 'isim',
      description: 'Yeni kanal adı',
    },
  },
  devret: {
    name: 'ticket-devret',
    description: 'Ticket\'ı başka bir yetkiliye devreder (Staff)',
    optionStaff: {
      name: 'yetkili',
      description: 'Devredilecek staff üyesi',
    },
  },
  notTicketCategory: '❌ Bu komut yalnızca ticket kategorisindeki kanallarda kullanılabilir.',
  renamed: '✅ Kanal adı **{name}** olarak güncellendi.',
  invalidName: '❌ Geçerli bir kanal adı girin (harf, rakam, tire).',
  transferSelf: '❌ Ticket\'ı kendinize devredemezsiniz.',
  transferNotStaff: '❌ Devredilecek kullanıcı staff rolüne sahip olmalı.',
  transferNotClaimer: '❌ Bu ticket\'ı sadece ilgilenen yetkili devredebilir.',
  transferNotClaimed: '❌ Bu ticket henüz ilgilenilmedi. Önce ticket\'ı claim edin.',
};
