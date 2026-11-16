module.exports = {
  channel: {
    title: '## 🎫 Ticket #{ticketNumber}',
    welcome: 'Hoş geldiniz! Yetkililer en kısa sürede yardımcı olacaktır.',
    staffHeader: '### 🛡️ Yetkili İşlemleri',
  },
  embed: {
    title: '🎫 Ticket #{ticketNumber}',
    description:
      '**Kategori:** {ticketType}\n**Açan:** {user}\n**Durum:** {status}\n**İlgilenen:** {claimedBy}',
    footer: 'Ticket #{ticketNumber}',
  },
  buttons: {
    claim: { label: 'İlgilen', emoji: '✋', hint: 'Ticket ile ilgilenmeye başla' },
    close: { label: 'Kapat', emoji: '🔒', hint: 'Ticket\'ı kapat ve arşivle' },
    transfer: { label: 'Devret', emoji: '🔄', hint: 'Başka staff\'a devret' },
    addMember: { label: 'Üye Ekle', emoji: '➕', hint: 'Kanala üye ekle' },
  },
  statusLabels: {
    open: '🟢 Açık',
    claimed: '🟡 İlgileniliyor',
    closed: '🔴 Kapalı',
  },
};
