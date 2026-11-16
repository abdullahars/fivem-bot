module.exports = {
  title: '👮 Yetki Başlat',
  description:
    '{target} için yetki seviyesi seçin.\n\nStaff perm **otomatik verilir**. Aşağıdan **L1**, **L2** veya **L3** seçin.',
  buttons: {
    l1: { id: 'l1', label: 'L1', emoji: '1️⃣' },
    l2: { id: 'l2', label: 'L2', emoji: '2️⃣' },
    l3: { id: 'l3', label: 'L3', emoji: '3️⃣' },
  },
  prefix: 'yetkibaslat',
  noPermission: '❌ Bu komutu kullanmak için Yetkili Sorumlusu yetkisi gerekli.',
  noTarget: '❌ Bir kullanıcı belirtmelisiniz.',
  targetIsBot: '❌ Botlara yetki verilemez.',
  levelNotConfigured: '❌ {level} rolü config.js içinde tanımlı değil.',
  staffRoleMissing: '❌ Staff rolü config.js içinde tanımlı değil.',
  success:
    '✅ {target} için **Staff** + **{level}** verildi.\nYetki başlangıcı: {startedAt}',
  alreadyDone: '✅ {target} için **{level}** zaten atandı.',
  botRoleTooLow: '❌ Bot rolü, verilecek rollerden yüksek olmalı.',
  levelLabels: { l1: 'L1', l2: 'L2', l3: 'L3' },
};
