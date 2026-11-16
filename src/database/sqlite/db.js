const { DatabaseSync } = require('node:sqlite');
const { join } = require('path');
const { mkdirSync } = require('fs');
const { initSchema } = require('./schema');

let db = null;

function getDbPath() {
  const fromEnv = process.env.SQLITE_PATH?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), 'data', 'bot.db');
}

function getDb() {
  if (!db) {
    throw new Error('Veritabanı bağlı değil. connectDatabase() çağrılmalı.');
  }
  return db;
}

function connectSqlite() {
  const dbPath = getDbPath();
  mkdirSync(join(dbPath, '..'), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  initSchema(db);
  console.log(`[DB] SQLite bağlantısı (node:sqlite): ${dbPath}`);
  return db;
}

function closeSqlite() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, connectSqlite, closeSqlite, getDbPath };
