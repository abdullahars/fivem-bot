const ALLOWED_NAME_REGEX = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/;
const VOWELS = 'aeıioöuüAEIİOÖUÜ';

module.exports = {
  ALLOWED_NAME_REGEX,
  VOWELS,
  buttons: {
    approvePrefix: 'ic_isim_onay:',
    rejectPrefix: 'ic_isim_red:',
    rejectModalPrefix: 'ic_isim_red_modal:',
  },
  modal: {
    title: 'IC İsim Red',
    reasonId: 'reason',
    reasonLabel: 'Red sebebi',
    reasonPlaceholder: 'Oyuncuya gönderilecek açıklamayı yazın...',
  },
  panel: {
    content:
      '**IC İsim Başvurusu**\n' +
      '**Oyuncu:** {user}\n' +
      '**İstenen isim:** {name}\n\n' +
      'Yetkili işlemi: **Onayla** veya **Reddet** (red için sebep istenir).',
  },
  channel: {
    alreadyHasKarakterOnay:
      '❌ Zaten karakter onayınız var. Yeni IC isim başvurusu yapamazsınız.',
  },
  dm: {
    onay: 'IC isim başvurunuz onaylandı.\n\n**Yeni isminiz:** {name}',
    red: 'IC isim başvurunuz reddedildi.\n\n**Sebep:** {reason}',
  },
  rejectReasons: {
    foreign: 'Yabancı / geçersiz karakter kullanımı',
    vowelOnly: 'Ünlü karakterden oluşan kelime',
    invalidWords: 'İsim 2 veya 3 kelimeden oluşmalıdır',
    staffReject: 'Yetkili tarafından reddedildi',
  },
  log: {
    onayTitle: '✅ IC İsim Onaylandı',
    redTitle: '❌ IC İsim Reddedildi',
    onayDesc:
      '**Yetkili:** {staff}\n**Oyuncu:** {target}\n**İstenen:** {requested}\n**Yeni İsim:** {final}',
    redDesc:
      '**Yetkili:** {staff}\n**Oyuncu:** {target}\n**İstenen:** {requested}\n**Sebep:** {reason}',
  },
};
