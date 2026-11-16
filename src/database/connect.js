const { connectSqlite } = require('./sqlite/db');

async function connectDatabase() {
  connectSqlite();
}

module.exports = { connectDatabase };
