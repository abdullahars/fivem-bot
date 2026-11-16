module.exports = {
  buttons: {
    ratePrefix: 'kayitpuan:rate:',
  },

  messages: {
    dmBody:
      '✅ **Kaydınız başarılı bir şekilde onaylanmıştır.**\n\n' +
      'Sizi kayıt eden yetkiliyi nasıl buldunuz? Lütfen aşağıdan puanlayınız.',
    dmSendFailed: '[Kayıt Puan] DM gönderilemedi:',
    alreadyRated: 'ℹ️ Bu kayıt için zaten puan verdiniz.',
    invalidRequest: '❌ Puanlama isteği geçersiz veya süresi dolmuş.',
    notYourRating: '❌ Bu puanlama size ait değil.',
    thankYou: '✅ **Teşekkürler!** {stars} puanınız kaydedildi.',
    logTitle: '⭐ Kayıt Puanı',
    logDesc:
      '**Puan veren:** {voter}\n**Puan kazanan:** {staff}\n**Alınan puan:** {score}/5 {stars}',
    logChannelMissing: '[Kayıt Puan] puan-log kanalı bulunamadı.',
  },

  buttonLabels: {
    1: '⭐ 1',
    2: '⭐⭐ 2',
    3: '⭐⭐⭐ 3',
    4: '⭐⭐⭐⭐ 4',
    5: '⭐⭐⭐⭐⭐ 5',
  },
};
