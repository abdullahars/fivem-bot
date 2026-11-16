/** Panel metinleri ve ticket tipleri (ID'ler config'den gelir) */
module.exports = {
  layout: 'v2',

  title: 'Roteka V | Destek Ticket Sistemi',
  description: 'Destek almak için aşağıdaki kategorilerden ilgili olanı seçin.',

  ticketTypes: [
    {
      id: 'ic',
      buttonLabel: 'IC Ticket',
      buttonEmoji: '🎭',
      buttonStyle: 'Primary',
      sectionTitle: 'IC Destek',
      sectionDescription: 'Oyun içi karakter ve rolplay konuları için.',
      sectionEmoji: '🎭',
      channelNamePrefix: 'ic-ticket',
    },
    {
      id: 'ooc',
      buttonLabel: 'OOC Ticket',
      buttonEmoji: '💬',
      buttonStyle: 'Secondary',
      sectionTitle: 'OOC Destek',
      sectionDescription: 'Oyun dışı genel destek ve sorular için.',
      sectionEmoji: '💬',
      channelNamePrefix: 'ooc-ticket',
    },
    {
      id: 'ac',
      buttonLabel: 'AC Ticket',
      buttonEmoji: '🛡️',
      buttonStyle: 'Danger',
      sectionTitle: 'AC Ticket',
      sectionDescription: 'Anti-cheat şikayet ve inceleme talepleri için.',
      sectionEmoji: '🛡️',
      channelNamePrefix: 'ac-ticket',
    },
  ],
};
