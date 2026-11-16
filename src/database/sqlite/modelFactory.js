const { getDb } = require('./db');

const nowIso = () => new Date().toISOString();

function camelToSnake(key) {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function snakeToCamel(key) {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toBindValue(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function parseFilterValue(key, value, params) {
  if (value === null || value === undefined) {
    return `${key} IS NULL`;
  }
  if (typeof value === 'boolean') {
    params.push(value ? 1 : 0);
    return `${key} = ?`;
  }
  if (value instanceof Date) {
    params.push(value.toISOString());
    return `${key} = ?`;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value.$in) {
      const placeholders = value.$in.map(() => {
        params.push(null);
        return '?';
      });
      value.$in.forEach((v, i) => {
        params[params.length - value.$in.length + i] = toBindValue(v);
      });
      return `${key} IN (${placeholders.join(', ')})`;
    }
    if (value.$gt !== undefined) {
      params.push(toBindValue(value.$gt));
      return `${key} > ?`;
    }
    if (value.$gte !== undefined) {
      params.push(toBindValue(value.$gte));
      return `${key} >= ?`;
    }
    if (value.$lt !== undefined) {
      params.push(toBindValue(value.$lt));
      return `${key} < ?`;
    }
    if (value.$lte !== undefined) {
      params.push(toBindValue(value.$lte));
      return `${key} <= ?`;
    }
    if (value.$ne !== undefined) {
      params.push(toBindValue(value.$ne));
      return `${key} != ?`;
    }
  }
  params.push(value);
  return `${key} = ?`;
}

const TIMESTAMP_FIELDS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

function resolveFilterColumn(rawKey, fullMap) {
  if (rawKey === '_id') return 'id';
  return fullMap[rawKey] || camelToSnake(rawKey);
}

function buildSubFilter(subFilter, fullMap, params) {
  const subParts = [];
  for (const [rawKey, value] of Object.entries(subFilter)) {
    const col = resolveFilterColumn(rawKey, fullMap);
    subParts.push(parseFilterValue(col, value, params));
  }
  return subParts.join(' AND ');
}

function buildWhere(filter, columnMap) {
  const params = [];
  const parts = [];
  const fullMap = { ...TIMESTAMP_FIELDS, ...columnMap };

  for (const [rawKey, value] of Object.entries(filter || {})) {
    if (rawKey === '$or' && Array.isArray(value)) {
      const orParts = value.map((sub) => `(${buildSubFilter(sub, fullMap, params)})`);
      parts.push(`(${orParts.join(' OR ')})`);
      continue;
    }
    const col = resolveFilterColumn(rawKey, fullMap);
    parts.push(parseFilterValue(col, value, params));
  }

  const sql = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
  return { sql, params };
}

function rowToDoc(row, config) {
  if (!row) return null;
  const doc = { _id: String(row.id) };

  for (const [dbCol, appKey] of Object.entries(config.columns)) {
    if (dbCol === 'id') continue;
    let val = row[dbCol];

    if (config.jsonFields?.includes(appKey)) {
      try {
        val = val ? JSON.parse(val) : config.jsonDefaults?.[appKey] ?? null;
      } catch {
        val = config.jsonDefaults?.[appKey] ?? null;
      }
    }

    if (config.dateFields?.includes(appKey) && val) {
      val = new Date(val);
    }

    if (config.boolFields?.includes(appKey)) {
      val = Boolean(val);
    }

    doc[appKey] = val;
  }

  if (row.created_at) doc.createdAt = new Date(row.created_at);
  if (row.updated_at) doc.updatedAt = new Date(row.updated_at);

  return doc;
}

function docToRow(data, config, forUpdate = false) {
  const row = {};
  const ts = nowIso();

  for (const [dbCol, appKey] of Object.entries(config.columns)) {
    if (dbCol === 'id') continue;
    if (data[appKey] === undefined) continue;

    let val = data[appKey];

    if (config.jsonFields?.includes(appKey)) {
      val = JSON.stringify(val ?? config.jsonDefaults?.[appKey] ?? []);
    }

    if (config.dateFields?.includes(appKey) && val instanceof Date) {
      val = val.toISOString();
    }

    if (config.boolFields?.includes(appKey)) {
      val = val ? 1 : 0;
    }

    row[dbCol] = val;
  }

  if (!forUpdate) {
    row.created_at = data.createdAt ? new Date(data.createdAt).toISOString() : ts;
  }
  row.updated_at = ts;

  return row;
}

class FindOneQuery {
  constructor(config, columnMap, filter) {
    this.config = config;
    this._columnMap = columnMap;
    this.filter = filter;
    this._sort = null;
    this._lean = false;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  exec() {
    const db = getDb();
    const { sql: whereSql, params } = buildWhere(this.filter, this._columnMap);
    let sql = `SELECT * FROM ${this.config.table} ${whereSql}`;
    const allParams = [...params];

    if (this._sort) {
      const orders = Object.entries(this._sort).map(([k, dir]) => {
        const col = this._columnMap[k] || camelToSnake(k);
        return `${col} ${dir === -1 ? 'DESC' : 'ASC'}`;
      });
      sql += ` ORDER BY ${orders.join(', ')}`;
    }

    sql += ' LIMIT 1';
    const row = db.prepare(sql).get(...allParams);
    const doc = rowToDoc(row, this.config);
    if (!doc) return null;
    return this._lean ? doc : wrapDocument(doc, this.config);
  }

  then(onFulfilled, onRejected) {
    return Promise.resolve().then(() => this.exec()).then(onFulfilled, onRejected);
  }
}

class Query {
  constructor(config, filter) {
    this.config = config;
    this.filter = filter;
    this._sort = null;
    this._limit = null;
    this._lean = false;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  exec() {
    const db = getDb();
    const columnMap = this._columnMap || {};
    if (!this._columnMap) {
      for (const [dbCol, appKey] of Object.entries(this.config.columns)) {
        columnMap[appKey] = dbCol;
      }
      Object.assign(columnMap, TIMESTAMP_FIELDS);
    }

    const { sql: whereSql, params } = buildWhere(this.filter, columnMap);
    let sql = `SELECT * FROM ${this.config.table} ${whereSql}`;
    const allParams = [...params];

    if (this._sort) {
      const orders = Object.entries(this._sort).map(([k, dir]) => {
        const col = columnMap[k] || camelToSnake(k);
        return `${col} ${dir === -1 ? 'DESC' : 'ASC'}`;
      });
      sql += ` ORDER BY ${orders.join(', ')}`;
    }

    if (this._limit) {
      sql += ' LIMIT ?';
      allParams.push(this._limit);
    }

    const rows = db.prepare(sql).all(...allParams);
    return rows.map((r) => rowToDoc(r, this.config));
  }

  then(onFulfilled, onRejected) {
    return Promise.resolve().then(() => this.exec()).then(onFulfilled, onRejected);
  }
}

function wrapDocument(doc, config) {
  if (!doc) return null;

  const save = async function save() {
    const db = getDb();
    const id = Number(doc._id);
    const row = docToRow(doc, config, true);
    delete row.created_at;

    const sets = Object.keys(row)
      .map((k) => `${k} = ?`)
      .join(', ');
    const vals = Object.values(row);
    vals.push(id);

    db.prepare(`UPDATE ${config.table} SET ${sets} WHERE id = ?`).run(...vals);
    doc.updatedAt = new Date(row.updated_at);
    return doc;
  };

  return new Proxy(doc, {
    get(target, prop) {
      if (prop === 'save') return save;
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

function incrementUpsert(config, columnMap, filter, inc) {
  const conflictTargets = UPSERT_CONFLICT_KEYS[config.table];
  if (!conflictTargets) return null;

  const fullMap = { ...TIMESTAMP_FIELDS, ...columnMap };
  const conflictSet = new Set(conflictTargets);

  for (const key of Object.keys(filter || {})) {
    const col = fullMap[key] || camelToSnake(key);
    if (!conflictSet.has(col)) return null;
  }

  const db = getDb();
  const now = nowIso();
  const insertCols = [];
  const insertVals = [];

  for (const col of conflictTargets) {
    const appKey =
      Object.entries(fullMap).find(([, dbCol]) => dbCol === col)?.[0] ||
      snakeToCamel(col);
    insertCols.push(col);
    insertVals.push(toBindValue(filter[appKey]));
  }

  for (const [appKey, amount] of Object.entries(inc)) {
    const col = fullMap[appKey] || camelToSnake(appKey);
    if (!insertCols.includes(col)) {
      insertCols.push(col);
      insertVals.push(amount);
    }
  }

  insertCols.push('created_at', 'updated_at');
  insertVals.push(now, now);

  const placeholders = insertCols.map(() => '?').join(', ');
  const updates = Object.entries(inc)
    .map(([appKey]) => {
      const col = fullMap[appKey] || camelToSnake(appKey);
      return `${col} = ${col} + excluded.${col}`;
    })
    .concat(['updated_at = excluded.updated_at'])
    .join(', ');

  db.prepare(
    `INSERT INTO ${config.table} (${insertCols.join(', ')}) VALUES (${placeholders})
     ON CONFLICT(${conflictTargets.join(', ')}) DO UPDATE SET ${updates}`
  ).run(...insertVals);

  const whereVals = conflictTargets.map((col) => {
    const appKey =
      Object.entries(fullMap).find(([, dbCol]) => dbCol === col)?.[0] ||
      snakeToCamel(col);
    return toBindValue(filter[appKey]);
  });

  const row = db
    .prepare(
      `SELECT * FROM ${config.table} WHERE ${conflictTargets
        .map((col) => `${col} = ?`)
        .join(' AND ')}`
    )
    .get(...whereVals);

  return wrapDocument(rowToDoc(row, config), config);
}

const UPSERT_CONFLICT_KEYS = {
  user_activity: ['guild_id', 'user_id'],
  user_channel_stats: ['guild_id', 'user_id', 'channel_id'],
  user_daily_activity: ['guild_id', 'user_id', 'date_key'],
};

function createModel(config) {
  const columnMap = {};
  for (const [dbCol, appKey] of Object.entries(config.columns)) {
    columnMap[appKey] = dbCol;
  }

  return {
    findOne(filter) {
      const fullMap = { ...TIMESTAMP_FIELDS, ...columnMap };
      return new FindOneQuery(config, fullMap, filter);
    },

    find(filter) {
      const q = new Query(config, filter);
      q._columnMap = { ...TIMESTAMP_FIELDS, ...columnMap };
      return q;
    },

    async findById(id) {
      const db = getDb();
      const row = db
        .prepare(`SELECT * FROM ${config.table} WHERE id = ?`)
        .get(Number(id));
      return wrapDocument(rowToDoc(row, config), config);
    },

    async create(data) {
      const db = getDb();
      const row = docToRow(data, config, false);
      delete row.id;

      const cols = Object.keys(row);
      const placeholders = cols.map(() => '?').join(', ');
      const result = db
        .prepare(
          `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES (${placeholders})`
        )
        .run(...cols.map((c) => row[c]));

      const inserted = db
        .prepare(`SELECT * FROM ${config.table} WHERE id = ?`)
        .get(Number(result.lastInsertRowid));
      return wrapDocument(rowToDoc(inserted, config), config);
    },

    async countDocuments(filter) {
      const db = getDb();
      const fullMap = { ...TIMESTAMP_FIELDS, ...columnMap };
      const { sql, params } = buildWhere(filter, fullMap);
      const row = db
        .prepare(`SELECT COUNT(*) AS cnt FROM ${config.table} ${sql}`)
        .get(...params);
      return row.cnt;
    },

    async updateMany(filter, update) {
      const db = getDb();
      const set = update.$set || update;
      const fullMap = { ...TIMESTAMP_FIELDS, ...columnMap };
      const { sql: whereSql, params: whereParams } = buildWhere(filter, fullMap);

      const setParts = [];
      const setParams = [];
      for (const [key, value] of Object.entries(set)) {
        const col = columnMap[key] || camelToSnake(key);
        if (config.jsonFields?.includes(key)) {
          setParts.push(`${col} = ?`);
          setParams.push(JSON.stringify(value));
        } else if (config.boolFields?.includes(key)) {
          setParts.push(`${col} = ?`);
          setParams.push(value ? 1 : 0);
        } else if (value instanceof Date) {
          setParts.push(`${col} = ?`);
          setParams.push(value.toISOString());
        } else {
          setParts.push(`${col} = ?`);
          setParams.push(value);
        }
      }
      setParts.push('updated_at = ?');
      setParams.push(nowIso());

      const result = db
        .prepare(
          `UPDATE ${config.table} SET ${setParts.join(', ')} ${whereSql}`
        )
        .run(...setParams, ...whereParams);

      return { modifiedCount: result.changes };
    },

    async findOneAndUpdate(filter, update, options = {}) {
      const inc = update.$inc || {};
      const set = update.$set || {};

      if (
        options.upsert &&
        Object.keys(set).length === 0 &&
        Object.keys(inc).length > 0
      ) {
        const upserted = incrementUpsert(config, columnMap, filter, inc);
        if (upserted) return upserted;
      }

      let doc = await this.findOne(filter);

      if (!doc) {
        if (!options.upsert) return null;
        const initial = { ...filter, ...set };
        for (const [k, v] of Object.entries(inc)) {
          initial[k] = v;
        }
        return this.create(initial);
      }

      for (const [k, v] of Object.entries(inc)) {
        doc[k] = (doc[k] || 0) + v;
      }
      Object.assign(doc, set);
      await doc.save();
      return doc;
    },

    async deleteOne(filter) {
      const db = getDb();
      let sql;
      let params;

      if (filter._id != null) {
        sql = `DELETE FROM ${config.table} WHERE id = ?`;
        params = [Number(filter._id)];
      } else {
        const built = buildWhere(filter, columnMap);
        sql = `DELETE FROM ${config.table} ${built.sql}`;
        params = built.params;
      }

      const result = db.prepare(sql).run(...params);
      return { deletedCount: result.changes };
    },
  };
}

function createCounterModel() {
  return {
    async findByIdAndUpdate(id, update, options = {}) {
      const db = getDb();
      const inc = update.$inc?.seq ?? 1;

      if (options.upsert) {
        db.prepare(
          `INSERT INTO counters (id, seq) VALUES (?, 0) ON CONFLICT(id) DO NOTHING`
        ).run(id);
      }

      db.prepare(`UPDATE counters SET seq = seq + ? WHERE id = ?`).run(inc, id);
      const row = db.prepare(`SELECT * FROM counters WHERE id = ?`).get(id);

      if (!row && options.upsert) {
        db.prepare(`INSERT INTO counters (id, seq) VALUES (?, ?)`).run(id, inc);
        return { _id: id, seq: inc };
      }

      return { _id: row.id, seq: row.seq };
    },
  };
}

module.exports = { createModel, createCounterModel, rowToDoc, docToRow };
