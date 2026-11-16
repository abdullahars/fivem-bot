/**
 * bot.db içeriğini terminalde özetler.
 *
 * Kullanım:
 *   node scripts/db-inspect.js
 *   node scripts/db-inspect.js tickets
 *   node scripts/db-inspect.js tickets 20
 *   node scripts/db-inspect.js --tables
 */
require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const { join } = require('path');

const dbPath =
  process.env.SQLITE_PATH?.trim() || join(process.cwd(), 'data', 'bot.db');

const args = process.argv.slice(2);
const listTablesOnly = args.includes('--tables') || args.includes('-l');
const tableArg = args.find((a) => !a.startsWith('-'));
const limitArg = args.filter((a) => /^\d+$/.test(a))[0];
const limit = Math.min(Number(limitArg) || 10, 500);

let db;
try {
  db = new DatabaseSync(dbPath);
} catch (err) {
  console.error(`Veritabanı açılamadı: ${dbPath}`);
  console.error(err.message);
  process.exit(1);
}

console.log(`\nDosya: ${dbPath}\n`);

const tables = db
  .prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`
  )
  .all()
  .map((r) => r.name);

if (listTablesOnly || !tableArg) {
  console.log('Tablolar (satır sayısı):');
  console.log('─'.repeat(40));
  for (const name of tables) {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get();
    console.log(`  ${name.padEnd(28)} ${row.c}`);
  }
  console.log('\nDetay için:');
  console.log('  node scripts/db-inspect.js <tablo_adı> [satır_limiti]');
  console.log('  Örnek: node scripts/db-inspect.js tickets 15\n');
  if (!tableArg) process.exit(0);
}

const table = tableArg;
if (!tables.includes(table)) {
  console.error(`Bilinmeyen tablo: ${table}`);
  console.error('Mevcut:', tables.join(', '));
  process.exit(1);
}

const total = db.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get().c;
const rows = db.prepare(`SELECT * FROM "${table}" ORDER BY id DESC LIMIT ?`).all(limit);

console.log(`Tablo: ${table}  (toplam ${total}, son ${rows.length} kayıt)\n`);
if (rows.length === 0) {
  console.log('(boş)\n');
  process.exit(0);
}

console.table(rows);
console.log('');
