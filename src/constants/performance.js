module.exports = {
  customIds: {
    // rankoneri:onayla:<logId> / rankoneri:reddet:<logId>
    suggestionApprovePrefix: 'rankoneri:onayla:',
    suggestionRejectPrefix: 'rankoneri:reddet:',
  },

  messages: {
    noPermission: '❌ Bu komutu kullanma yetkin yok.',
    noRankPermission: '❌ Bu komutu yalnızca Üst Yönetim (Baş Yetkili ve üzeri) kullanabilir.',
    disabled: '❌ Performans sistemi devre dışı.',
    noData: 'Bu hafta için henüz performans verisi yok.',
    userNoData: 'Bu yetkili için kayıtlı performans verisi bulunamadı.',
    suggestionApproved: '✅ Rank önerisi onaylandı.',
    suggestionRejected: '❌ Rank önerisi reddedildi.',
    suggestionHandled: 'Bu öneri zaten sonuçlandırılmış.',
    suggestionNotFound: 'Öneri kaydı bulunamadı.',
    dmApproved:
      '🎉 **Tebrikler!** Performansın değerlendirildi ve rank yükseltme önerin yönetim tarafından **onaylandı**. Detaylar için yönetimle iletişime geçebilirsin.',
  },

  labels: {
    lbTitle: '📊 Haftalık Performans Liderlik Tablosu',
    profilTitle: '📈 Performans Profili',
    weekReportTitle: '🗓️ Haftalık Performans Raporu',
    suggestionTitle: '⬆️ Rank Önerisi',
    approve: 'Onayla',
    reject: 'Reddet',
    above: '✅',
    belowAvg: '⚠️ Ortalamanın altında',
    around: '➖ Ortalama seviyesinde',
    bell: '🔔',
    trendUp: '📈 Yükseliyor',
    trendDown: '📉 Düşüyor',
    trendStable: '➡️ Stabil',
  },

  medals: ['🥇', '🥈', '🥉'],
};
