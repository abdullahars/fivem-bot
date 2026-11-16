module.exports = {
  panel: {
    title: '📋 Mülakat Sistemi',
    description:
      'Whitelist mülakatı için aşağıdaki butonu kullanın.\n\n**Mülakat Çağır** — Yetkilileri mülakata çağırır (5 dakikada bir kullanılabilir).',
    callLabel: 'Mülakat Çağır',
  },
  buttons: {
    call: 'mulakat:call',
  },
  voice: {
    notifyTitle: '🎤 Mülakat Bildirimi',
    notifyBody:
      '**Bekleyen:** {user}\n**Özel oda:** {room}\n\nMülakat bekleme sesine biri geçti. Lütfen odaya katılın.',
  },
  messages: {
    staffCalled:
      '🔔 **Mülakat çağrısı**\n\n{mentions}\n\nYetkili çağrısı yapıldı.\nÇağıran: {caller}',
    panelSent: '✅ Mülakat paneli gönderildi.',
    noChannel: '❌ Mülakat panel kanalı config içinde tanımlı değil.',
    noNotifyChannel: '❌ Mülakat bildirim kanalı config içinde tanımlı değil.',
    callCooldown: '⏳ Lütfen 5 dakika bekleyip tekrar deneyin.',
    noPermission: '❌ Bu işlem için yetkiniz yok.',
    called: '✅ Yetkililer mülakata çağrıldı.',
  },
};
