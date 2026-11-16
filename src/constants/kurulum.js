module.exports = {
  select: {
    customId: 'kurulum:select',
    placeholder: 'Kurulum işlemi seçin…',
    options: {
      kanallar: {
        value: 'kanallar',
        label: 'Log kanallarını kur',
        description: 'Tüm log kanallarını oluşturur ve isimle bağlar',
      },
      ticket: {
        value: 'ticket',
        label: 'Ticket paneli kur',
        description: 'Ana ticket panel mesajını gönderir',
      },
      mulakat: {
        value: 'mulakat',
        label: 'Mülakat paneli kur',
        description: 'Mülakat çağrı panelini gönderir',
      },
      ekipTicket: {
        value: 'ekip_ticket',
        label: 'Ekip ticket paneli kur',
        description: 'Ekip başvuru ticket panelini gönderir',
      },
    },
  },

  messages: {
    noPermission:
      '❌ Bu komutu yalnızca **Yönetici** veya **Üst Yönetim** kullanabilir.',
    noManageChannels: '❌ Botun **Kanalları Yönet** yetkisi yok.',
    panelTitle: '⚙️ Kurulum Paneli',
    panelDesc:
      'Aşağıdan yapmak istediğiniz kurulum işlemini seçin.\n\n' +
      '• **Log kanalları** — ticket-log, mazaret-log vb.\n' +
      '• **Ticket paneli** — ana destek paneli\n' +
      '• **Mülakat paneli** — mülakat çağrı paneli\n' +
      '• **Ekip ticket paneli** — ekip başvuru paneli',
    invalidOption: '❌ Geçersiz kurulum seçeneği.',
    ticketPanelSent: '✅ Ticket paneli {channel} kanalına gönderildi.',
    mulakatPanelSent: '✅ Mülakat paneli {channel} kanalına gönderildi.',
    ekipTicketPanelSent: '✅ Ekip ticket paneli {channel} kanalına gönderildi.',
    channelMissing: '❌ Panel kanalı config içinde tanımlı değil veya bulunamadı.',
    success:
      '✅ **Log kanalları kuruldu**\n' +
      '**Kategori:** {category}\n' +
      '**Yeni kanallar:** {created}\n' +
      '**Zaten vardı:** {existing}\n' +
      '**Bağlanan:** {found}/{total}\n' +
      '{missingNote}',
    missingNote: '\n⚠️ Bulunamayan: {names}',
    noneCreated: '—',
    noneExisting: '—',
  },
};
