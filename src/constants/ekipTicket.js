module.exports = {
  title: 'Roteka V | Ekip Ticket Sistemi',
  description: 'Destek almak için aşağıdaki kategorilerden ilgili olanı seçin.',
  
  types: {
    illegal: {
      id: 'illegal',
      label: 'İllegal Ekip Başvurusu',
      emoji: '🔫',
      description: 'İllegal rol işlemleri ve sorunları için.',
      buttonLabel: 'İllegal Ekip Başvurusu',
      buttonStyle: 'Danger', // Red
      channelNamePrefix: 'illegal-ticket',
    },
    legal: {
      id: 'legal',
      label: 'Legal Ekip Başvurusu',
      emoji: '📋',
      description: 'Legal oluşumlar ve başvuru sorunları için.',
      buttonLabel: 'Legal Ekip Başvurusu',
      buttonStyle: 'Success', // Green
      channelNamePrefix: 'legal-ticket',
    },
    isletme: {
      id: 'isletme',
      label: 'İşletme Başvurusu',
      emoji: '🏢',
      description: 'Mekan ve işletme ile ilgili konular.',
      buttonLabel: 'İşletme Başvurusu',
      buttonStyle: 'Primary', // Blue
      channelNamePrefix: 'isletme-ticket',
    },
  },

  channel: {
    welcomeTitle: '📋 Ekip Ticket #{number}',
    welcomeDesc:
      'Merhaba {user}!\n\n' +
      'Ekip ticket\'ınız oluşturuldu. Yetkili ekibimiz en kısa sürede size yardımcı olacaktır.\n\n' +
      '**Kategori:** {category}\n' +
      '**Ticket No:** #{number}',
    buttons: {
      claim: { id: 'ekip_ticket_claim', label: 'İlgilen', emoji: '✋' },
      close: { id: 'ekip_ticket_close', label: 'Kapat', emoji: '🔒' },
      transfer: { id: 'ekip_ticket_transfer', label: 'Devret', emoji: '🔄' },
      addMember: { id: 'ekip_ticket_add', label: 'Üye Ekle', emoji: '➕' },
    },
  },

  messages: {
    ticketCreated: '✅ Ekip ticket\'ınız oluşturuldu: {channel}',
    alreadyHasTicket: '❌ Zaten açık bir ekip ticket\'ınız var: {channel}',
    notTicketChannel: '❌ Bu kanal bir ekip ticket kanalı değil.',
    claimed: '✅ {staff} bu ticket\'ı ilgileniyor.',
    alreadyClaimed: '❌ Bu ticket zaten {staff} tarafından ilgileniyor.',
    closed: '🔒 Ticket {staff} tarafından kapatıldı. Kanal 5 saniye içinde silinecek.',
    transferred: '🔄 Ticket {oldStaff} → {newStaff} devredildi.',
    memberAdded: '➕ {member} ticket\'a eklendi.',
    transferPrompt: 'Ticket\'ı devretmek istediğiniz yetkiliyi seçin:',
    addMemberPrompt: 'Ticket\'a eklemek istediğiniz üyeyi seçin:',
    transcriptSent: '📄 Ticket geçmişi DM\'inize gönderildi.',
    transcriptFailed: '❌ Ticket geçmişi gönderilemedi (DM kapalı olabilir).',
  },

  transcript: {
    header: '📋 Ekip Ticket Geçmişi - #{number}',
    info:
      '**Açan:** {opener}\n' +
      '**Kategori:** {category}\n' +
      '**Açılış:** {openedAt}\n' +
      '**Kapanış:** {closedAt}\n' +
      '**İlgilenen:** {claimer}\n' +
      '**Kapatan:** {closer}',
    messageFormat: '[{time}] {author}: {content}',
    attachmentNote: '[Dosya: {name}]',
  },

  log: {
    title: '📋 Ekip Ticket Kapatıldı',
    desc:
      '**Ticket No:** #{number}\n' +
      '**Kategori:** {category}\n' +
      '**Açan:** {opener}\n' +
      '**İlgilenen:** {claimer}\n' +
      '**Kapatan:** {closer}\n' +
      '**Açılış:** <t:{openedAt}:F>\n' +
      '**Kapanış:** <t:{closedAt}:F>\n' +
      '**Süre:** {duration}',
  },
};
