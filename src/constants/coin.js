/** Coin sistemi sabitleri — /coin, /coin-dukkani, /coin-duzenle */

const emoji = '🪙';

const reasons = {
  ticket: 'Ticket ilgilenme',
  kayit: 'Kayıt yapma',
  icIsim: 'IC isim onaylama',
  voiceHour: 'Seste saat başı',
  destekAlinan: 'Destek alınan',
  destekYardim: 'Destek yardım',
  ekipAc: 'Ekip açma',
  ekipReferans: 'Ekip referansı',
  purchase: 'Dükkan alışverişi',
  manual: 'Manuel',
};

const rateKeys = {
  ticket: { label: 'Ticket İlgilenme', path: 'coin.rates.ticket' },
  kayit: { label: 'Kayıt Yapma', path: 'coin.rates.kayit' },
  icIsim: { label: 'IC İsim Onaylama', path: 'coin.rates.icIsim' },
  voiceHour: { label: 'Seste Saat Başı', path: 'coin.rates.voiceHour' },
  destekAlinan: { label: 'Destek Alınan', path: 'coin.rates.destekAlinan' },
  destekYardim: { label: 'Destek Yardım', path: 'coin.rates.destekYardim' },
  ekipAc: { label: 'Ekip Açma', path: 'coin.rates.ekipAc' },
  ekipReferans: { label: 'Ekip Referansı', path: 'coin.rates.ekipReferans' },
};

const customId = {
  // Dükkan (staff)
  shopBuy: 'coin:buy:',
  // Düzenle paneli (owner)
  home: 'coindz:home',
  menuRates: 'coindz:rates',
  menuItems: 'coindz:items',
  menuReset: 'coindz:reset',
  menuAddCoin: 'coindz:caddmenu',
  menuRemoveCoin: 'coindz:cremmenu',
  addCoinUser: 'coindz:cadduser',
  removeCoinUser: 'coindz:cremuser',
  addCoinModal: 'coindz:caddm:', // + userId
  removeCoinModal: 'coindz:cremm:', // + userId
  rateEdit: 'coindz:rate:', // + key  → modal
  rateModal: 'coindz:ratem:', // + key
  itemAdd: 'coindz:itemadd',
  itemAddModal: 'coindz:itemaddm',
  itemSelect: 'coindz:itemsel',
  itemEdit: 'coindz:itemedit:', // + id → modal
  itemEditModal: 'coindz:itemeditm:', // + id
  itemToggle: 'coindz:itemtgl:', // + id
  itemDelete: 'coindz:itemdel:', // + id
  itemDeleteConfirm: 'coindz:itemdelc:', // + id
  resetConfirm1: 'coindz:reset1',
  resetConfirm2: 'coindz:reset2',
  resetExec: 'coindz:resetx',
};

const messages = {
  disabled: '❌ Coin sistemi şu anda kapalı. (config → coin.enabled)',
  noPermissionStaff: '❌ Bu komutu yalnızca yetkililer kullanabilir.',
  noPermissionOwner: '❌ Bu komutu yalnızca config\'de tanımlı **Owner** kullanabilir.',

  // /coin
  balanceTitle: `${emoji} Coin Durumu`,
  balanceLine: `**{user}** bakiyesi: **{balance}** ${emoji}`,
  balanceDetail:
    'Toplam kazanılan: **{earned}** · Toplam harcanan: **{spent}**',
  balanceRates: '**Kazanım Oranları**\n{rates}',

  // /coin-dukkani
  shopTitle: `${emoji} Coin Dükkanı`,
  shopEmpty: 'ℹ️ Dükkanda şu anda satışta ürün yok.',
  shopYourBalance: `Bakiyen: **{balance}** ${emoji}`,
  shopItemLine: '**{name}** — `{cost}` ' + emoji + '{stock}\n> {desc}',
  shopBuyPlaceholder: 'Satın almak istediğin ürünü seç…',
  buyInsufficient: '❌ Yetersiz bakiye. Gerekli: **{cost}**, bakiyen: **{balance}**.',
  buyOutOfStock: '❌ Bu ürün stokta kalmadı.',
  buyInactive: '❌ Bu ürün artık satışta değil.',
  buySuccess: `✅ **{name}** satın alındı! Harcanan: **{cost}** ${emoji} · Kalan bakiye: **{balance}**`,

  // log (text)
  logEarn:
    `${emoji} **Coin Kazanım** | {user} **+{amount}** coin kazandı (sebep: {reason}) · yeni bakiye: **{balance}**`,
  logSpend:
    `${emoji} **Coin Harcama** | {user} **{name}** ürününü aldı, **-{cost}** coin · kalan: **{balance}**`,

  // /coin-duzenle
  dzTitle: '🛠️ Coin Yönetim Paneli',
  dzDesc:
    'Coin oranlarını düzenleyin, dükkan ürünlerini yönetin veya tüm coinleri sıfırlayın.',
  dzMenuRates: 'Coin Oranları',
  dzMenuItems: 'Dükkan Ürünleri',
  dzMenuReset: 'Coin Sıfırla',
  dzMenuAddCoin: 'Coin Ekle',
  dzMenuRemoveCoin: 'Coin Sil',
  dzBack: 'Ana Menü',

  dzAddCoinTitle: '➕ Coin Ekle',
  dzAddCoinDesc: 'Coin eklemek istediğiniz kullanıcıyı seçin.',
  dzRemoveCoinTitle: '➖ Coin Sil',
  dzRemoveCoinDesc: 'Coin silmek istediğiniz kullanıcıyı seçin.',
  dzCoinUserPlaceholder: 'Kullanıcı seç…',
  modalAddCoinTitle: 'Coin Ekle',
  modalRemoveCoinTitle: 'Coin Sil',
  modalCoinAmount: 'Miktar (ondalık olabilir)',
  dzCoinAdded: '✅ {user} kullanıcısına **{amount}** coin eklendi. Yeni bakiye: **{balance}**',
  dzCoinRemoved: '✅ {user} kullanıcısından **{amount}** coin silindi. Yeni bakiye: **{balance}**',

  logManualAdd:
    '🪙 **Coin Ekleme** | {admin}, {user} kullanıcısına **+{amount}** coin ekledi · yeni bakiye: **{balance}**',
  logManualRemove:
    '🪙 **Coin Silme** | {admin}, {user} kullanıcısından **-{amount}** coin sildi · kalan: **{balance}**',
  dzRatesTitle: '⚙️ Coin Kazanım Oranları',
  dzRatesDesc: 'Düzenlemek için bir oran seçin. Ondalık değer girebilirsiniz (ör. 0.25).',
  dzItemsTitle: '🛒 Dükkan Ürünleri',
  dzItemsEmpty: 'Henüz ürün eklenmemiş.',
  dzItemAddLabel: 'Yeni Ürün Ekle',
  dzItemSelectPlaceholder: 'Düzenlenecek ürünü seç…',
  dzItemEditLabel: 'Düzenle',
  dzItemToggleOn: 'Satışa Aç',
  dzItemToggleOff: 'Satıştan Kaldır',
  dzItemDeleteLabel: 'Sil',
  dzItemDetail:
    '**{name}**\nFiyat: **{cost}** ' + emoji + '\nStok: {stock}\nDurum: {status}\nAçıklama: {desc}',
  dzItemDeleteConfirm: '⚠️ **{name}** ürününü silmek istediğinize emin misiniz?',
  dzResetTitle: '🚨 Coin Sıfırlama',
  dzResetConfirm1:
    '⚠️ Sunucudaki **TÜM** kullanıcıların coin bakiyeleri sıfırlanacak. Bu işlem geri alınamaz.\n\nDevam etmek için onaylayın. **(1/2)**',
  dzResetConfirm2:
    '🚨 **SON ONAY** — Tüm coin bakiyeleri **kalıcı olarak** sıfırlanacak. **(2/2)**',
  dzResetDone: '✅ Tüm coin bakiyeleri sıfırlandı. ({count} kayıt)',
  dzRateUpdated: '✅ **{label}** oranı **{value}** olarak güncellendi.',
  dzItemAdded: '✅ **{name}** ürünü eklendi.',
  dzItemUpdated: '✅ **{name}** güncellendi.',
  dzItemDeleted: '🗑️ Ürün silindi.',
  dzItemToggled: '✅ Ürün durumu güncellendi.',
  dzInvalidNumber: '❌ Geçerli bir sayı girin.',

  // modal
  modalRateTitle: 'Oran Düzenle',
  modalRateLabel: 'Yeni oran (ondalık olabilir)',
  modalItemTitle: 'Ürün Bilgileri',
  modalItemName: 'Ürün adı',
  modalItemDesc: 'Açıklama',
  modalItemCost: 'Fiyat (coin)',
  modalItemStock: 'Stok (-1 = sınırsız)',

  cancel: 'İptal / Ana Menü',
  back: 'Geri',
  rateLine: '• **{label}:** {value} ' + emoji,
  stockUnlimited: ' · Sınırsız',
  stockLeft: ' · Stok: {n}',
};

module.exports = { emoji, reasons, rateKeys, customId, messages };
