module.exports = {
  title: '🏆 Staff Top — Liderlik Tablosu',
  description: 'Sunucu personelinin en yüksek performans gösterenleri.',
  boards: {
    kayit: {
      title: '📋 Kayıt Yapan (Top {limit})',
      empty: '_Henüz kayıt verisi yok._',
    },
    ticket: {
      title: '🎫 Ticket İlgilenen (Top {limit})',
      empty: '_Henüz ticket verisi yok._',
    },
    ic: {
      title: '🎭 IC İsim Onaylayan (Top {limit})',
      empty: '_Henüz IC onay verisi yok._',
    },
    destek: {
      title: '🤝 Destek Alan (Top {limit})',
      empty: '_Henüz destek verisi yok._',
    },
    ekip: {
      title: '👥 Ekip Açan (Top {limit})',
      empty: '_Henüz ekip açma verisi yok._',
    },
  },
  row: '`{rank}.` {user} — **{count}**',
  footer: 'Son güncelleme: {time}',
  button: { id: 'refresh', label: 'Güncelle', emoji: '🔄' },
  myStats: { id: 'mystats', label: 'Güncel Stat', emoji: '📊' },
  gap: { id: 'gap', label: 'Listeye Girmek İçin', emoji: '🎯' },
  buttonsHint: 'Güncel statunuzu ve listeye girmek için gerekenleri görmek için butonları kullanın.',
  myStatsTitle: '📊 Güncel Stat — {user}',
  myStatsLine: '**{label}:** {total} (bugün: {today})',
  myStatsEmpty: 'Henüz kayıtlı staff statunuz yok.',
  gapTitle: '🎯 Listeye Girmek İçin — {user}',
  gapOnList: '**{label}:** ✅ Listede (#{rank}) — **{score}** stat',
  gapNeed: '**{label}:** **{needed}** stat daha (senin: **{score}**, liste eşiği: **{cutoff}**)',
  gapNeedEmpty: '**{label}:** **{needed}** stat daha (liste henüz boş)',
  noPermission: '❌ Bu işlem için yetkili rolü gerekli.',
  noPermissionRefresh: '❌ Listeyi güncellemek için Üst Yönetim rolü gerekli.',
  updated: '✅ Staff top listesi güncellendi.',
};
