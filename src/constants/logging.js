module.exports = {
  join: {
    title: '📥 Sunucuya Giriş',
    desc: '**Kullanıcı:** {user}\n**ID:** `{id}`\n**Hesap yaşı:** {accountAge}',
    text: '👤+ {user} - [{id}] {displayName} kişisi sunucuya katıldı! Davet eden : {inviter} ({inviteUses}) ({memberCount})',
  },
  leave: {
    title: '📤 Sunucudan Çıkış',
    desc: '**Kullanıcı:** {user}\n**ID:** `{id}`\n**Sunucuda kalma:** {stay}',
    text: '👤- {user} sunucumuzdan ayrıldı! Davet eden: {inviter} ({inviteUses})',
  },
  messageDelete: {
    title: '🗑️ Mesaj Silindi',
    desc: '**Kanal:** {channel}\n**Yazar:** {author}\n**İçerik:**\n{content}',
  },
  messageEdit: {
    title: '✏️ Mesaj Düzenlendi',
    desc: '**Kanal:** {channel}\n**Yazar:** {author}\n**Eski:**\n{old}\n**Yeni:**\n{new}',
  },
  voiceJoin: {
    desc: '{user} üyesi {channel} kanalına katıldı.',
    momentTitle: 'Kanala Girdiği Anda:',
    momentBody: '**Mikrofonu:** {mic}\n**Kulaklığı:** {deaf}',
    meta: '**Girdiği Kanal:** {channel} (`{channelId}`)\n**Kullanıcı:** {username} (`{userId}`)\n**Eylem Gerçekleşme:** <t:{ts}:R>',
    membersTitle: 'Girdiği An Kanalda Bulunan Üyeler:',
  },
  voiceLeave: {
    desc: '{user} üyesi {channelLine} kanalından ayrıldı.',
    momentTitle: 'Kanaldan Ayrıldığı Anda:',
    momentBody: '**Mikrofonu:** {mic}\n**Kulaklığı:** {deaf}',
    meta: '**Ayrıldığı Kanal:** {channel} (`{channelId}`)\n**Kullanıcı:** {username} (`{userId}`)\n**Eylem Gerçekleşme:** <t:{ts}:R>',
    membersTitle: 'Kanaldan Ayrıldığı An Kanalda Bulunan Üyeler:',
  },
  voiceMove: {
    withExecutor:
      '{user} kişisi {executor} tarafından <t:{ts}:R> {oldChannelLine} adlı ses kanalından {newChannelLine} adlı ses kanalına taşındı!',
    selfMove:
      '{user} kişisi <t:{ts}:R> {oldChannelLine} adlı ses kanalından {newChannelLine} adlı ses kanalına geçti!',
  },
  voiceDisconnect: {
    withExecutor:
      '{user} kişisi {executor} tarafından <t:{ts}:R> {channelLine} adlı ses kanalından çıkarıldı!',
  },
  voiceSelfMuteOn: '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda kendini susturdu!',
  voiceSelfMuteOff:
    '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda kendi susturmasını kaldırdı!',
  voiceServerMuteOn:
    '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda sunucu susturması uygulandı!',
  voiceServerMuteOff:
    '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda sunucu susturması kaldırıldı!',
  voiceSelfDeafOn:
    '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda kulaklığını kapattı!',
  voiceSelfDeafOff:
    '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda kulaklık susturmasını kaldırdı!',
  voiceServerDeafOn:
    '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda sunucu sağırlaştırması uygulandı!',
  voiceServerDeafOff:
    '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda sunucu sağırlaştırması kaldırıldı!',
  voiceCameraOn: '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda kamerayı açtı!',
  voiceCameraOff: '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda kamerayı kapattı!',
  voiceStreamOn: '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda yayını başlattı!',
  voiceStreamOff: '{user} kişisi <t:{ts}:R> {channelLine} adlı sesli kanalda yayını kapattı!',
  noChannelMembers: 'Kanalda Üye Bulunmuyor.',
  emptyContent: '*İçerik yok*',
  truncated: '*(mesaj kısaltıldı)*',
};
