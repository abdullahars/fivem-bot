module.exports = {
  noPermission: '❌ Bu komutu kullanmak için Staff yetkisi gerekli.',
  noReviewPermission:
    '❌ Mazaret onay/red işlemi için Üst Yönetim veya Yetkili Sorumlusu yetkisi gerekli.',

  command: {
    optionSebep: {
      name: 'sebep',
      description: 'Mazaret sebebi',
    },
    optionBitis: {
      name: 'bitis',
      description: 'Mazaret bitiş tarihi (ör. 02.06.2026 20:30)',
    },
  },

  modal: {
    sebepId: 'sebep',
    bitisId: 'bitis',
    rejectReasonId: 'red_sebep',
    submitToplantiPrefix: 'mazaret:modal:toplanti:',
    rejectModalPrefix: 'mazaret:reject-modal:',
  },

  buttons: {
    toplantiOpenPrefix: 'mazaret:toplanti:open:',
    toplantiLabel: 'Mazaret Belirt',
    approvePrefix: 'mazaret:review:approve:',
    rejectPrefix: 'mazaret:review:reject:',
    approve: 'Mazaret Geçerli',
    reject: 'Mazaret Geçersiz',
  },

  status: {
    pending: 'Beklemede',
    approved: 'Geçerli',
    rejected: 'Geçersiz',
  },

  source: {
    slash: 'Komut (/mazaret)',
    meetingBefore: 'Toplantı (15 dk önce)',
    meetingStart: 'Toplantı (başlangıç)',
  },

  messages: {
    invalidDate: '❌ Geçersiz tarih formatı. Örnek: `02.06.2026 20:30`',
    pastEndDate: '❌ Mazaret bitiş tarihi geçmişte olamaz.',
    emptyReason: '❌ Mazaret sebebi boş olamaz.',
    emptyRejectReason: '❌ Red sebebi boş olamaz.',
    logChannelMissing: '❌ mazaret-log kanalı bulunamadı. `/kurulum` çalıştırın.',
    submitted: '✅ Mazaretiniz kaydedildi ve incelemeye gönderildi.',
    alreadySubmitted: 'ℹ️ Bu toplantı için zaten mazaret bildirdiniz.',
    alreadyPending: 'ℹ️ Bekleyen bir mazaret kaydınız var.',
    notFound: '❌ Mazaret kaydı bulunamadı.',
    alreadyReviewed: 'ℹ️ Bu mazaret zaten değerlendirilmiş.',
    approved: '✅ Mazaret **geçerli** olarak işaretlendi.',
    rejected: '❌ Mazaret **geçersiz** olarak işaretlendi.',

    dmApproved:
      '✅ **Mazaretiniz onaylandı**\n\n**Sebep:** {reason}\n**Bitiş:** {end}\n**Kaynak:** {source}',
    dmRejected:
      '❌ **Mazaretiniz reddedildi**\n\n**Sebep:** {reason}\n**Bitiş:** {end}\n**Red gerekçesi:** {rejectReason}\n**Kaynak:** {source}',

    logTitle: '📋 Yeni Mazaret — #{id}',
    logDesc:
      '**Kullanıcı:** {user}\n**Sebep:** {reason}\n**Bitiş:** {end}\n**Kaynak:** {source}\n**Toplantı:** {meeting}\n**Durum:** {status}',
    logReviewedTitle: '📋 Mazaret — #{id} ({status})',
    logReviewedDesc:
      '**Kullanıcı:** {user}\n**Sebep:** {reason}\n**Bitiş:** {end}\n**Kaynak:** {source}\n**Toplantı:** {meeting}\n**İnceleyen:** {reviewer}\n**Red gerekçesi:** {rejectReason}',
    noMeeting: '—',
  },
};
