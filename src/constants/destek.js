module.exports = {
  options: {
    receivers: {
      name: 'alan-yetkililer',
      description: 'Desteği alan yetkililer (virgülle ayırarak @mention)',
    },
    providers: {
      name: 'veren-stafflar',
      description: 'Destekte bulunan stafflar (virgülle ayırarak @mention)',
    },
    penalized: {
      name: 'ceza-alanlar',
      description: 'Destekten ceza alan kişiler (virgülle ayırarak @mention, opsiyonel)',
    },
    description: {
      name: 'aciklama',
      description: 'Destek açıklaması',
    },
  },
  
  messages: {
    success: '✅ Destek kaydı oluşturuldu (#{number}).',
    noPermission: '❌ Bu komutu kullanma yetkiniz yok.',
    invalidUsers: '❌ Geçersiz kullanıcı mention formatı. Lütfen @kullanıcı formatında girin.',
    noReceivers: '❌ En az bir desteği alan yetkili belirtmelisiniz.',
    noProviders: '❌ En az bir destekte bulunan staff belirtmelisiniz.',
  },
  
  panel: {
    title: '📋 Destek Kaydı',
    fields: {
      number: 'Destek No',
      receivers: 'Desteği Alan Yetkililer',
      providers: 'Destekte Bulunan Stafflar',
      penalized: 'Ceza Alan Kişiler',
      description: 'Açıklama',
      createdBy: 'Oluşturan',
      timestamp: 'Tarih',
    },
    noPenalized: 'Yok',
  },
  
  log: {
    title: '📋 Destek Kaydı Oluşturuldu',
    desc:
      '**Destek No:** #{number}\n\n' +
      '**Desteği Alan Yetkililer:**\n{receivers}\n\n' +
      '**Destekte Bulunan Stafflar:**\n{providers}\n\n' +
      '**Ceza Alan Kişiler:**\n{penalized}\n\n' +
      '**Açıklama:**\n{description}\n\n' +
      '**Oluşturan:** {createdBy}\n' +
      '**Tarih:** <t:{timestamp}:F>',
  },
  
  stats: {
    supportReceived: 'Destek Alınan',
    supportProvided: 'Destek Verilen',
  },
};
