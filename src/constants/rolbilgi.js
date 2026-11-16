module.exports = {
  embedHeader:
    '📝 **{role} rol bilgileri;**\n\n→ Rol Rengi : `{color}`\n→ Rol ID : `{roleId}`\n→ Roldeki Kişi Sayısı : `{count}`',
  memberLine: '{mention} - `{id}`',
  noMembersInList: '*Bu rolde üye bulunmuyor.*',
  listTruncated: '\n*…ve {remaining} üye daha (tam liste için **Üye ID Listesi**)*',
  pageNote: '_Sayfa {page}/{total}_',
  prevPage: '◀ Önceki',
  nextPage: 'Sonraki ▶',
  membersPerPage: 20,
  banMaxMembers: 40,
  banTooMany: '❌ Toplu ban en fazla **{max}** kişilik rollerde kullanılabilir. (Bu rol: **{count}** kişi)',
  buttons: {
    ids: { id: 'ids', label: 'Üye ID Listesi', emoji: '📋' },
    strip: { id: 'strip', label: 'Toplu Rol Al', emoji: '➖' },
    ban: { id: 'ban', label: 'Toplu Ban', emoji: '🔨' },
    confirm: { id: 'ok', label: 'Onayla', emoji: '✅' },
    cancel: { id: 'no', label: 'İptal', emoji: '❌' },
  },
  idsResult: '**{role}** rolündeki üye ID\'leri ({count} kişi):\n```\n{ids}\n```',
  idsFile: '**{role}** — {count} üye ID listesi ektedir.',
  stripConfirm:
    '⚠️ **{role}** rolündeki **{count}** üyeden rol alınacak. Onaylıyor musunuz?',
  banConfirm:
    '⚠️ **{role}** rolündeki **{count}** üye banlanacak. Onaylıyor musunuz?',
  stripDone: '✅ **{role}** rolü {success} üyeden alındı. (Hata: {fail})',
  banDone: '✅ **{role}** rolündeki üyelerden {success} banlandı. (Hata: {fail})',
  noMembers: '❌ Bu rolde işlem yapılacak üye yok.',
  roleNotFound: '❌ Rol bulunamadı.',
  noBanhammer: '❌ Toplu ban için Banhammer rolü gerekli.',
  processing: '⏳ İşlem yapılıyor, lütfen bekleyin…',
};
