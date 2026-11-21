<div align="center">

# 🎮 FiveM Discord Yönetim Botu

**FiveM sunucuları için ticket, whitelist, moderasyon ve personel istatistik sistemini tek çatı altında toplayan Discord botu.**

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-database-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

[Özellikler](#-özellikler) · [Kurulum](#-kurulum) · [Yapılandırma](#%EF%B8%8F-yapılandırma) · [Komutlar](#-komutlar) · [Sistemler](#-sistemler) · [Proje Yapısı](#-proje-yapısı)

</div>
---

## 🤝 Katkı ve Destek

Hata bildirimi ve öneriler için discord: apozinyo bölümünü kullanabilirsiniz.

Projeyi faydalı bulduysanız ⭐ vermeyi unutmayın. **50 ⭐'a ulaşıldığında**, tam koruma ve rol yedekleme (backup) özelliklerini içeren guard projesi de paylaşılacaktır.

## 📄 Lisans

Bu proje [MIT](LICENSE) lisansı ile lisanslanmıştır.

## 📞 İletişim

Discord: **apozinyo**



---

## 📖 Genel Bakış

Bu bot, Discord.js v14 ve modern **Components v2** arayüzü ile geliştirilmiş, FiveM roleplay sunucularının günlük yönetim ihtiyaçlarını karşılamak üzere tasarlanmıştır. Tüm mesajlar ve yapılandırma değerleri koddan ayrıldığı için botu kendi sunucunuza uyarlamak için kod yazmanız gerekmez.

## ✨ Özellikler

| Modül | Öne Çıkanlar |
|-------|--------------|
| 🎫 **Ticket** | 4 kategori (IC, OOC, Donate, Bug), claim & transfer, üye ekleme, otomatik transcript |
| 📊 **İstatistik** | 6 sekmeli personel paneli, günlük/haftalık/aylık raporlama, liderlik tablosu ve grafikler |
| 👥 **Kullanıcı Yönetimi** | Onay panelli whitelist, kayıtsız atama, IC isim onay/red, kullanıcı geçmişi, ban/unban |
| 🛡️ **Moderasyon** | Çarpan ve süre destekli ceza sistemi, sicil kayıtları, destek kayıt sistemi |
| 🎭 **Rol Yönetimi** | Tekli ve toplu rol işlemleri, rol geçmişi, sağ tık (context menu) entegrasyonu |
| 🏢 **Ekip** | Dinamik ekip kanalları, üye yönetimi, açma/kapatma takibi |
| 📢 **Duyurular** | Aktif / Bakım / Restart duyuruları, özelleştirilebilir görseller |

## 🚀 Kurulum

### Gereksinimler

- [Node.js](https://nodejs.org/) v18 veya üzeri
- Veritabanı (SQLite) (yerel veya Atlas)
- Bir [Discord Bot Token](https://discord.com/developers/applications)

### Adımlar

```bash
# 1. Projeyi klonlayın
git clone <repo-url>
cd test_fivem_bots

# 2. Bağımlılıkları yükleyin
npm install

# 3. Ortam değişkenlerini oluşturun
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id
```

Ardından `config/config.json` dosyasını sunucunuza göre doldurun ([Yapılandırma](#%EF%B8%8F-yapılandırma)) ve botu başlatın:

```bash
# 4. Slash komutlarını Discord'a kaydedin
npm run deploy-commands

# 5. Botu çalıştırın
npm start
```

## ⚙️ Yapılandırma

Tüm sunucuya özel ayarlar `config/config.json` dosyasında tutulur.

<details>
<summary><b>Örnek config.json (görüntülemek için tıklayın)</b></summary>

```json
{
  "bot": {
    "readyMessage": "✅ {botTag} hazır! {guildCount} sunucuda aktif.",
    "embedColor": "#393A41",
    "footer": "Sunucu Adı"
  },
  "ids": {
    "staffRole": "STAFF_ROLE_ID",
    "botCommandRole": "BOT_COMMAND_ROLE_ID",
    "roles": {
      "whitelist": "WHITELIST_ROLE_ID",
      "kayitsiz": "KAYITSIZ_ROLE_ID",
      "karakterOnay": "KARAKTER_ONAY_ROLE_ID",
      "banhammer": "BANHAMMER_ROLE_ID",
      "ustYonetim": "UST_YONETIM_ROLE_ID",
      "ekipSorumlusu": "EKIP_SORUMLUSU_ROLE_ID"
    },
    "channels": {
      "ticketLog": "TICKET_LOG_CHANNEL_ID",
      "whitelistLog": "WHITELIST_LOG_CHANNEL_ID",
      "icIsimLog": "IC_ISIM_LOG_CHANNEL_ID",
      "roleLog": "ROLE_LOG_CHANNEL_ID",
      "banLog": "BAN_LOG_CHANNEL_ID",
      "cezalar": "CEZALAR_CHANNEL_ID",
      "cezaLog": "CEZA_LOG_CHANNEL_ID",
      "destekLog": "DESTEK_LOG_CHANNEL_ID"
    },
    "categories": {
      "parent": "PARENT_CATEGORY_ID",
      "ekip": "EKIP_CATEGORY_ID",
      "ic": "IC_CATEGORY_ID",
      "ooc": "OOC_CATEGORY_ID",
      "donate": "DONATE_CATEGORY_ID",
      "bug": "BUG_CATEGORY_ID"
    }
  },
  "whitelist": {
    "requireSteam": false,
    "requireHex": false,
    "limits": {
      "verPerDay": 0,
      "kayitsizPerDay": 0
    }
  },
  "fivem": {
    "serverName": "Sunucu Adı",
    "connectCommand": "connect 127.0.0.1:30120",
    "images": {
      "aktif": "IMAGE_URL",
      "bakim": "IMAGE_URL",
      "restart": "IMAGE_URL"
    }
  }
}
```

</details>

### Özelleştirme

- **Mesajlar:** `src/constants/` klasöründeki dosyalardan düzenlenir.
- **Embed rengi:** `bot.embedColor` değeri.
- **Duyuru görselleri:** `fivem.images` altındaki bağlantılar.

## 📝 Komutlar

> **Yetki seviyeleri:** `Administrator` › `Üst Yönetim` › `Bot Command` › `Staff` › `Herkes`

<details open>
<summary><b>🛠️ Yönetim ve Duyuru</b></summary>

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `/ticket-panel` | Ticket panelini oluşturur | Administrator |
| `/aktif` | Sunucu aktif duyurusu | Üst Yönetim |
| `/bakim` | Sunucu bakım duyurusu | Üst Yönetim |
| `/restart` | Sunucu restart duyurusu | Üst Yönetim |

</details>

<details>
<summary><b>👥 Kullanıcı Yönetimi</b></summary>

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `/whitelist ver` | Onay paneliyle whitelist verir | Staff |
| `/kayitsiz` | Kullanıcıyı kayıtsıza atar | Bot Command |
| `/kullanici-bilgi` | Kullanıcı bilgilerini gösterir | Staff |
| `/ban` | Kullanıcıyı banlar | Banhammer |
| `/unban` | Banı kaldırır | Banhammer |
| `/ban-bilgi` | Ban bilgilerini gösterir | Staff |

</details>

<details>
<summary><b>📊 İstatistik</b></summary>

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `/stat` | Personel istatistiklerini gösterir | Staff |
| `/staff-top` | Liderlik tablosunu gösterir | Üst Yönetim |
| `/top-stat` | Sunucu liderlik tablosu | Bot Command |

</details>

<details>
<summary><b>🛡️ Moderasyon</b></summary>

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `/ceza-ekle` | Kullanıcıya ceza ekler | Staff |
| `/sicil` | Sicil kaydını gösterir | Staff |
| `/destek` | Destek kaydı oluşturur | Staff |

</details>

<details>
<summary><b>🎭 Rol Yönetimi</b></summary>

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `/rol ver` / `/rol al` | Kullanıcıya rol verir / alır | Bot Command · Manage Roles |
| `/toplu-rol ver` / `/toplu-rol al` | Toplu rol verir / alır | Bot Command |
| `/rollog` | Rol geçmişini gösterir | Bot Command |
| `/rolbilgi` | Rol bilgilerini gösterir | Bot Command |

**Context menu:** *Whitelist Ekle*, *Rol Ekle*, *Rol Al* — kullanıcıya sağ tıklayarak kullanılabilir.

</details>

<details>
<summary><b>🏢 Ekip ve Diğer</b></summary>

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `/ekipolustur` | Yeni ekip kanalı oluşturur | Ekip Sorumlusu |
| `/ip` | Sunucu bağlantı bilgisi | Herkes |
| `/ysay` | Seste olmayan staffları etiketler | Bot Command |
| `/mulakat-panel-kur` | Mülakat panelini kurar | Bot Command |

</details>

## 🔧 Sistemler

### 🎫 Ticket

1. `/ticket-panel` ile panel kurulur.
2. Kullanıcı kategori seçerek ticket açar.
3. Yetkili ticket'ı **claim** eder (gerekirse transfer eder veya üye ekler).
4. Ticket kapatıldığında transcript otomatik oluşturulur ve loglanır.

### ✅ Whitelist

```text
/whitelist ver @kullanıcı
```

Onay paneli kullanıcı bilgilerini, son 5 giriş/çıkış kaydını ve sicili gösterir. **Onay** butonuyla whitelist rolü verilir, **Red** ile işlem iptal edilir.

### ⚖️ Ceza

```text
/ceza-ekle @kullanıcı "Kural ihlali" 15 5
```

Örnekte **15x çarpan** ve **5 gün** süre uygulanır; bitiş tarihi otomatik hesaplanır. Cezalar sicile işlenir ve hem herkese açık hem de özel log kanalına gönderilir.

### 🤝 Destek

```text
/destek
  alan-yetkililer: @yetkili1 @yetkili2
  veren-stafflar:  @staff1 @staff2
  aciklama:        "Kullanıcı hesap problemi çözüldü"
  ceza-alanlar:    @kullanıcı   (opsiyonel)
```

Kayıt sonrasında ilgili personelin istatistikleri otomatik güncellenir.

### 📊 İstatistik Paneli

```text
/stat @kullanıcı
```

| Sekme | İçerik |
|-------|--------|
| Genel Özet | Tüm istatistiklerin özeti, her satırda *Detay* butonu |
| Ticket | Ticket sayıları ve kategori dağılımı |
| IC İsim | Onay / red istatistikleri |
| Kayıt / WL | Whitelist ve kayıtsız işlemleri |
| Ekip | Ekip açma / kapatma |
| Destek | Alınan / verilen destek |

### 🏆 Staff Top

```text
/staff-top
```

Kayıt, ticket, IC isim onayı ve destek kategorilerinde **Top 5** liderlik tablosu ve [QuickChart](https://quickchart.io/) ile oluşturulan dinamik grafik sunar. 🔄 butonu ile anlık güncellenir.

### 🎭 Rol ve 🏢 Ekip

```text
/rol ver @kullanıcı @rol
/toplu-rol ver @rol @kişi1 @kişi2 @kişi3
/ekipolustur "Ekip Adı" @ekip-sahibi
```

## 📁 Proje Yapısı

```text
test_fivem_bots/
├── config/
│   └── config.json            # Ana yapılandırma
├── src/
│   ├── commands/              # Slash komutları
│   ├── constants/             # Mesaj ve sabit değerler
│   ├── database/
│   │   ├── connect.js
│   │   └── models/            # MongoDB modelleri
│   ├── events/                # Discord event handler'ları
│   ├── services/              # İş mantığı katmanı
│   ├── utils/                 # Yardımcı fonksiyonlar
│   ├── config/loadConfig.js   # Config yükleyici
│   ├── index.js               # Giriş noktası
│   └── deploy-commands.js     # Komut kaydı
├── .env.example
├── package.json
└── README.md
```

## 🔒 Güvenlik

- Hassas bilgiler yalnızca `.env` dosyasında tutulur ve `.gitignore` ile repoya dahil edilmez.
- Yetki kontrolü her komutta ayrı ayrı yapılır.


<div align="center">
<sub>Discord.js v14 ve Components v2 ile geliştirilmiştir.</sub>
</div>
