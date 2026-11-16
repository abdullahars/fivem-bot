module.exports = {
  options: {
    user: { name: 'kullanici', description: 'Bilgisi görüntülenecek kullanıcı' },
    id: { name: 'id', description: 'Discord kullanıcı ID' },
  },
  title: '👤 Kullanıcı Bilgisi',
  fields: {
    ids: '**Steam / Hex**',
    idsEmpty: 'Kayıt yok',
    tickets: '🎫 Açılan Ticket',
    messages: '💬 Mesaj Sayısı',
    voice: '🔊 Ses Süresi',
    joined: '📅 Sunucuya Giriş',
    created: '📅 Hesap Oluşturma',
    roles: '🎭 Son Rol İşlemleri',
    rolesEmpty: 'Rol kaydı yok',
    ban: '🔨 Ban Durumu',
    banActive: 'Aktif ban — **{reason}**',
    banNone: 'Aktif ban yok',
    inviteUnknown: 'Bilinmiyor',
    inviteBlock:
      '**Sunucuya giriş:** {joinedVia}\n**Yaptığı davet:** {invitesMade} kullanım ({inviteCodes} kod)\n**Davet ettiği üye:** {invitedCount}',
  },
  roleLine: '`{action}` **{role}** — {staff} (<t:{ts}:R>)',
  buttons: {
    refresh: { id: 'refresh', label: 'Yenile', emoji: '🔄' },
    rollog: { id: 'rollog', label: 'Rol Geçmişi', emoji: '📋' },
    ban: { id: 'ban', label: 'Ban Bilgi', emoji: '🔨' },
  },
  noTarget: '❌ Kullanıcı veya ID belirtmelisiniz.',
  notFound: '❌ Kullanıcı bulunamadı.',
};
