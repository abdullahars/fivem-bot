# Veritabanı (SQLite)

Bot verileri yerel SQLite dosyasında tutulur. Bağlantı Node.js yerleşik **`node:sqlite`** modülü ile yapılır (ek native paket gerekmez).

**Gereksinim:** Node.js **22.5+** (önerilen: 24.x — botu başlattığınız `node` ile aynı sürüm).

## Dizin yapısı

```
src/database/
  connect.js          # Bağlantı giriş noktası
  README.md
  models/             # Servislerin import ettiği API (Mongoose uyumlu)
  sqlite/
    db.js             # node:sqlite (DatabaseSync)
    schema.js         # Tablo tanımları
    definitions.js    # Kolon eşlemeleri
    modelFactory.js   # findOne, create, save, countDocuments, ...
```

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `SQLITE_PATH` | İsteğe bağlı. Varsayılan: `data/bot.db` (proje kökü) |

## Veriyi görüntüleme

### 1) Proje scripti (terminal)

```bash
npm run db:tables              # tüm tablolar + satır sayısı
npm run db:inspect             # aynı özet
node scripts/db-inspect.js tickets 20   # tickets tablosundan son 20 kayıt
```

### 2) Grafik program (önerilen)

[DB Browser for SQLite](https://sqlitebrowser.org/) — `data/bot.db` dosyasını aç, Browse Data sekmesinden tabloları incele.

Alternatif: DBeaver, HeidiSQL, VS Code eklentisi **SQLite Viewer**.

### 3) sqlite3 komut satırı (yüklüyse)

```bash
sqlite3 data/bot.db
.tables
SELECT * FROM tickets LIMIT 5;
.quit
```

## Notlar

- Eski MongoDB verisi otomatik taşınmaz; yeni kurulumda boş veritabanı oluşur.
- `data/` klasörü `.gitignore` içindedir.
- Botu her zaman aynı Node ile çalıştırın: `where node` → genelde `C:\Program Files\nodejs\node.exe`.
- Bot çalışırken WAL modu kullanılır; GUI ile açarken botu durdurmak daha güvenlidir.
