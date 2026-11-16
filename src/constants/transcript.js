module.exports = {
  fileName: 'ticket-{ticketNumber}-gecmis.txt',
  dmMessage: '📄 Ticket geçmişiniz ektedir. Ticket numaranız: **#{ticketNumber}**',
  logEmbed: {
    title: '📋 Ticket Kapatıldı',
    description:
      '**Ticket:** #{ticketNumber}\n**Kategori:** {ticketType}\n**Açan:** {user}\n**Kapatan:** {closedBy}\n**İlgilenen:** {claimedBy}\n**Süre:** {duration}',
  },
  dmFailed: '⚠️ <@{userId}> kullanıcısına DM gönderilemedi (kapalı olabilir).',
};
