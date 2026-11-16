module.exports = {
  notifyMinutesBefore: 15,

  noPermission: '❌ Bu komutu kullanmak için Üst Yönetim yetkisi gerekli.',

  create: {
    success:
      '✅ Toplantı planlandı.\n\n**#{id}** — {title}\n**Tarih:** {time}\n**Kanal:** {channel}\n\nStaff\'lere {notifyBefore} dk önce ve toplantı saatinde DM bildirimi gidecek.',
    invalidDate: '❌ Geçersiz tarih formatı. Örnek: `02.06.2026 20:30`',
    pastDate: '❌ Toplantı zamanı geçmişte olamaz.',
    invalidChannel: '❌ Ses kanalı seçmelisiniz.',
  },

  list: {
    title: '📅 Toplantılar',
    empty: 'Kayıtlı toplantı yok.',
    line: '**#{id}** — {title} · {status}\n└ {time} · {channel} · {creator}',
    sectionUpcoming: '**⏳ Planlanan**',
    sectionCompleted: '**✅ Bitmiş**',
    sectionCancelled: '**❌ İptal edilmiş**',
    sectionEmpty: '_Yok_',
    statusScheduled: 'Planlandı',
    statusCompleted: 'Bitti',
    statusCancelled: 'İptal',
  },

  delete: {
    success: '✅ **#{id}** toplantısı iptal edildi.',
    notFound: '❌ Toplantı bulunamadı veya zaten iptal edilmiş.',
  },

  yoklama: {
    title: '📋 Toplantı Yoklaması — #{id}',
    notFound: '❌ Toplantı bulunamadı.',
    channelMissing: '❌ Toplantı ses kanalı bulunamadı.',
    empty: 'Ses kanalında kimse yok.',
    header: '**{title}** · {channel}\n**Toplantı saati:** {time}\n\n**Kanaldaki üyeler ({count}):**\n{members}',
  },

  bittir: {
    title: '🏁 Toplantı Bitti — #{id}',
    notFound: '❌ Aktif toplantı bulunamadı (iptal edilmiş veya zaten bitmiş olabilir).',
    meetingNotFound: '❌ Toplantı kaydı bulunamadı.',
    noParticipants: 'Toplantı süresince ses kanalına giren olmadı.',
    header:
      '**{title}**\n**Başlangıç:** {start}\n**Bitiş:** {end}\n\n**Katılımcılar ({count}):**\n{list}',
    absentTitle: '🚫 Sese Gelmeyen Staff — #{id}',
    absentHeader:
      '**{title}**\n**Başlangıç:** {start}\n**Bitiş:** {end}\n\n**Sese hiç gelmeyen staff ({count}):**\n{list}',
    noAbsent: '✅ Tüm staff toplantı ses kanalına katılmış (mazaretliler hariç).',
    mazaretTitle: '📝 Mazaretliler — #{id}',
    mazaretHeader:
      '**{title}**\n**Başlangıç:** {start}\n**Bitiş:** {end}\n\n**Mazaret bildiren staff ({count}):**\n{list}',
    mazaretLine: '{label} — **{status}** · {source} · {reason}',
    noMazaret: 'Bu toplantı için mazaret bildiren staff yok.',
    buttons: {
      absent: 'Sese Gelmeyenler',
      participants: 'Katılımcılar',
      mazaret: 'Mazaretliler',
      absentPrefix: 'toplanti:gelmeyen:',
      participantsPrefix: 'toplanti:katilim:',
      mazaretPrefix: 'toplanti:mazaret:',
    },
  },

  notify: {
    dm:
      '📅 **Toplantı Bildirimi**\n\n**{title}** toplantısı **{time}** saatinde başlayacak.\nLütfen {channel} ses kanalına katılın.',
    dmStart:
      '🔴 **Toplantı Başladı!**\n\n**{title}** toplantısı şimdi başladı.\nHemen {channel} ses kanalına katılın!',
  },
};
