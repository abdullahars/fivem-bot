module.exports = {
  options: {
    user: { name: 'kullanici', description: 'İşlem yapılacak kullanıcı' },
    role: { name: 'rol', description: 'Verilecek / alınacak rol' },
  },
  messages: {
    targetBot: '❌ Botlara rol işlemi yapılamaz.',
    roleNotFound: '❌ Rol bulunamadı.',
    botCantManage: '❌ Bu rolü yönetemiyorum (yetki veya hiyerarşi).',
    alreadyHas: '❌ {target} zaten **{role}** rolüne sahip.',
    doesntHave: '❌ {target} zaten **{role}** rolüne sahip değil.',
    verSuccess: '✅ {target} kullanıcısına **{role}** rolü verildi.',
    alSuccess: '✅ {target} kullanıcısından **{role}** rolü alındı.',
  },
  log: {
    verTitle: '➕ Rol Verildi',
    alTitle: '➖ Rol Alındı',
    desc: '**Yetkili:** {staff}\n**Hedef:** {target}\n**Rol:** {role}',
  },
};
