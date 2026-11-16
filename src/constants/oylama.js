module.exports = {
  options: {
    aciklama: {
      name: 'aciklama',
      description: 'Oylama açıklaması / sorusu',
    },
    sure: {
      name: 'sure',
      description: 'Oylama süresi (dakika)',
    },
    buton1: {
      name: 'buton1',
      description: '1. seçenek buton yazısı',
    },
    buton2: {
      name: 'buton2',
      description: '2. seçenek buton yazısı',
    },
  },
  buttons: {
    option1Prefix: 'oylama:1:',
    option2Prefix: 'oylama:2:',
  },
  labels: {
    ended: 'Sona Erdi',
  },
  emojis: {
    evet: '✅',
    hayir: '❌',
  },
  panel: {
    title: '📊 Oylama',
    questionLabel: '**Soru**',
    votesTitle: '**Oy Durumu**',
    colOption: 'Seçenek',
    colVotes: 'Oy',
    endsAt: '**Bitiş:** {time}',
    createdBy: '**Oluşturan:** {user}',
    statusActive: '**Durum:** Devam ediyor',
    statusEnded: '**Durum:** Sona erdi',
    totalVotes: '**Toplam oy:** {count}',
  },
  limits: {
    minMinutes: 1,
    maxMinutes: 10080,
    labelMin: 1,
    labelMax: 80,
  },
  messages: {
    noPermission:
      '❌ Bu komut için Bot Command veya Üst Yönetim yetkisine ihtiyacınız var.',
    notTextChannel: '❌ Oylama yalnızca metin kanallarında oluşturulabilir.',
    invalidDuration: '❌ Süre 1 ile 10080 dakika (7 gün) arasında olmalı.',
    invalidLabels: '❌ Buton yazıları 1-80 karakter olmalı ve birbirinden farklı olmalı.',
    created: '✅ Oylama oluşturuldu.',
    pollNotFound: '❌ Bu oylama bulunamadı veya süresi dolmuş.',
    pollEnded: '❌ Bu oylama sona ermiş.',
    voteRecorded: '✅ Oyunuz kaydedildi.',
    voteRemoved: '✅ Oyunuz kaldırıldı.',
    failed: '❌ Oylama işlenirken bir hata oluştu.',
  },
};
