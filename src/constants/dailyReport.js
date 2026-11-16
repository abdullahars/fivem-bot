module.exports = {
  title: '📊 Günlük Sunucu Özeti',
  footerNote: 'RotekaV Bot — Otomatik günlük rapor (00:00 İstanbul)',
  sections: {
    activity:
      '**📱 Günlük aktivite**\nMesaj: **{messages}** · Ses girişi: **{voiceJoins}** · Ses süresi: **{voiceTime}** · Aktif ses üyesi: **{voiceActiveUsers}**',
    members: '**👥 Üye hareketi**\nGiriş: **{joins}** · Çıkış: **{leaves}**',
    whitelist:
      '**✅ Whitelist**\nVerilen: **{wlVer}** · Kayıtsız: **{wlKayitsiz}** · Red: **{wlRed}**',
    icIsim: '**🎭 IC İsim**\nOnay: **{icOnay}** · Red: **{icRed}**',
    tickets:
      '**🎫 Ticket**\nAçılan: **{opened}** · İlgilenilen: **{claimed}** · Kapatılan: **{closed}**',
    ekipTickets:
      '**📋 Ekip ticket**\nAçılan: **{opened}** · İlgilenilen: **{claimed}** · Kapatılan: **{closed}**',
    moderation:
      '**🔨 Moderasyon**\nBan: **{bans}** · Ban kaldırma: **{unbans}** · Blacklist: **{blacklist}** · Ceza: **{ceza}**',
    ekip: '**👥 Ekip**\nAçılan ekip: **{ekipOpened}**',
    destek: '**🤝 Destek kaydı:** **{destek}**',
    coin: '**🪙 Dağıtılan coin:** **{coinDistributed}**',
    server: '**📌 Sunucu**\nAnlık üye: **{memberCount}** · İnsan: **{humanCount}** · Bot: **{botCount}**',
  },
  channelMissing: '[Günlük rapor] gunluk-log kanalı bulunamadı. /kurulum çalıştırın.',
  sent: '[Günlük rapor] {dateKey} özeti gönderildi.',
};
