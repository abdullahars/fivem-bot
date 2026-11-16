module.exports = {
  buttons: {
    openModal: 'changelog:open',
    modal: 'changelog:modal',
  },
  selects: {
    authors: 'changelog:authors',
  },
  modal: {
    notesId: 'changelog_notes',
    title: 'Sunucu Güncellemesi',
    notesLabel: 'Güncelleme notları',
    notesPlaceholder: 'Yapılan değişiklikleri detaylı yazın...',
  },
  panel: {
    title: 'Changelog',
    description:
      'Sunucuya gelen güncellemeyi detaylı şekilde yazın. Yayınlandığında sürüm otomatik artar ve changelog kanalına gönderilir.',
    authorsSelectHint:
      'Önce güncellemeyi getiren kişileri seçin (birden fazla olabilir), ardından **Güncelleme Yaz** ile notları girin.',
    authorsSelectPlaceholder: 'Güncellemeyi getiren kişiler',
    selectedAuthors: '**Seçilen:** {authors}',
    openBtn: 'Güncelleme Yaz',
    tableTitle: '**Güncelleme**',
    notesTitle: '**Güncelleme Notları**',
    colMetric: 'Gösterge',
    colValue: 'Değer',
    rowVersion: 'Sürüm',
    rowAuthor: 'Getiren',
    rowDate: 'Tarih',
    publicTitle: 'Sunucu Güncellemesi',
  },
  messages: {
    noPermission: '❌ Bu işlem için Üst Yönetim rolü gerekir.',
    noAuthorsSelected: '❌ Önce güncellemeyi getiren en az bir kişi seçin.',
    channelMissing: '❌ config.js → ids.channels.changelog kanal ID tanımlı değil.',
    notesTooShort: '❌ Güncelleme notları en az 10 karakter olmalı.',
    published: '✅ **v{version}** changelog kanalına yayınlandı.',
    publishFailed: '❌ Changelog kanalına gönderilemedi.',
  },
};
