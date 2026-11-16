module.exports = {
  options: {
    yayinLinki: {
      name: 'yayinlinki',
      description: 'Canlı yayın linki (Twitch, YouTube, Kick vb.)',
    },
  },
  buttons: {
    watch: {
      label: 'Yayını İzle',
      emoji: '🔗',
    },
  },
  panel: {
    notifyLine: '🔔 {user} bir yayın başlattı!',
    title: '🔴 Canlı Yayın Bildirimi',
    liveLine: '✨ **{name}** şu anda canlı yayında!',
    inviteLine: 'Heyecana ortak olmak için hemen katılın!',
    linkTitle: '🔗 **Yayın Linki**',
    linkText: '[Buraya Tıkla!]({url})',
    timeLine: '🕐 **Yayın Saati:** <t:{ts}:F> (<t:{ts}:R>)',
  },
  log: {
    title: '📺 Streamer Yayın Duyurusu',
    fields: {
      streamer: 'Yayıncı',
      link: 'Yayın Linki',
      target: 'Duyuru Kanalı',
      command: 'Komut',
    },
  },
  messages: {
    noPermission: '❌ Bu komut için Streamer rolü gerekir.',
    notConfigured: '❌ config.js → streamer.roleId ve streamer.channelId tanımlı değil.',
    invalidUrl: '❌ Geçerli bir yayın linki girin (http:// veya https://).',
    channelMissing: '❌ Streamer kanalı bulunamadı veya yazı kanalı değil.',
    botMissingPermission: '❌ Streamer kanalına mesaj gönderme yetkim yok.',
    published: '✅ Yayın duyurusu streamer kanalına gönderildi.',
    failed: '❌ Yayın duyurusu gönderilemedi.',
  },
};
