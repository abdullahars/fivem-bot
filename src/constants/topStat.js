module.exports = {
  title: '🏆 Sunucu Liderlik Tablosu',
  description: 'En aktif yetkililer (ilk {limit})',
  boards: {
    ticketClosed: { title: '🎫 En Çok Ticket Kapatan', field: 'totalClosed' },
    ticketClaimed: { title: '✋ En Çok Ticket İlgilenen', field: 'totalClaimed' },
    whitelistVer: { title: '✅ En Çok WL Veren', field: 'totalWhitelistVer' },
    icOnay: { title: '🎭 En Çok IC İsim Onaylayan', field: 'totalIcOnay' },
  },
  empty: '_Henüz veri yok._',
  row: '`{rank}.` {user} — **{count}**',
};
