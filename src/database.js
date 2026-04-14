const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { applySchema, dbPath } = require('./setup');

dotenv.config({ quiet: true });

const requestedMode = (process.env.APP_MODE || 'offline').trim().toLowerCase();
const hasSupabaseConfig = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const runtimeMode = requestedMode === 'online' && hasSupabaseConfig ? 'online' : 'offline';
const isOfflineMode = runtimeMode !== 'online';
const jwtSecret = process.env.JWT_SECRET || 'offline-biblioteca-dev-secret';

function normalizeBoolean(value) {
  if (value === true || value === false) return value;
  if (value === 1 || value === 0) return Boolean(value);
  return value;
}

function mapRow(table, row) {
  if (!row) return row;

  if (table === 'usuarios') {
    return {
      ...row,
      multa_pendente: normalizeBoolean(row.multa_pendente),
      bloqueado: normalizeBoolean(row.bloqueado)
    };
  }

  return row;
}

function mapOutgoingUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    created_at: row.created_at,
    user_metadata: {
      nome: row.nome,
      tipo: row.tipo
    }
  };
}

function parseTopLevelColumns(selection) {
  if (!selection || selection === '*') {
    return ['*'];
  }

  const parts = [];
  let current = '';
  let depth = 0;

  for (const char of selection) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;

    if (char === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

const RELATIONS = {
  acervo_digital: {
    usuarios: { table: 'usuarios', localKey: 'usuario_id', foreignKey: 'id' }
  },
  alugueis: {
    livros: { table: 'livros', localKey: 'livro_id', foreignKey: 'id' },
    exemplares: { table: 'exemplares', localKey: 'exemplar_id', foreignKey: 'id' },
    usuarios: { table: 'usuarios', localKey: 'usuario_id', foreignKey: 'id' }
  },
  multas: {
    alugueis: { table: 'alugueis', localKey: 'aluguel_id', foreignKey: 'id' }
  }
};

class OfflineQueryBuilder {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.action = 'select';
    this.selection = '*';
    this.selectOptions = {};
    this.filters = [];
    this.ordering = null;
    this.rangeArgs = null;
    this.limitValue = null;
    this.expectSingle = false;
    this.expectMaybeSingle = false;
    this.payload = null;
    this.upsertOptions = {};
  }

  select(columns = '*', options = {}) {
    this.selection = columns;
    this.selectOptions = options || {};
    return this;
  }

  insert(payload) {
    this.action = 'insert';
    this.payload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(payload) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(payload, options = {}) {
    this.action = 'upsert';
    this.payload = Array.isArray(payload) ? payload : [payload];
    this.upsertOptions = options;
    return this;
  }

  eq(column, value) { this.filters.push({ op: 'eq', column, value }); return this; }
  neq(column, value) { this.filters.push({ op: 'neq', column, value }); return this; }
  is(column, value) { this.filters.push({ op: 'is', column, value }); return this; }
  not(column, operator, value) { this.filters.push({ op: 'not', column, operator, value }); return this; }
  gt(column, value) { this.filters.push({ op: 'gt', column, value }); return this; }
  gte(column, value) { this.filters.push({ op: 'gte', column, value }); return this; }
  lt(column, value) { this.filters.push({ op: 'lt', column, value }); return this; }
  lte(column, value) { this.filters.push({ op: 'lte', column, value }); return this; }
  in(column, values) { this.filters.push({ op: 'in', column, value: values }); return this; }
  or(expression) { this.filters.push({ op: 'or', expression }); return this; }
  order(column, options = {}) { this.ordering = { column, ascending: options?.ascending !== false }; return this; }
  range(from, to) { this.rangeArgs = [from, to]; return this; }
  limit(value) { this.limitValue = value; return this; }
  single() { this.expectSingle = true; return this; }
  maybeSingle() { this.expectMaybeSingle = true; return this; }

  then(resolve, reject) {
    return Promise.resolve(this.execute()).then(resolve, reject);
  }

  getNestedValue(row, pathExpression) {
    return String(pathExpression).split('.').reduce((acc, key) => acc?.[key], row);
  }

  compareValues(left, right) {
    if (left === null || left === undefined) return left === right ? 0 : -1;
    if (typeof left === 'number' || typeof right === 'number') {
      return Number(left) - Number(right);
    }

    const leftDate = Date.parse(left);
    const rightDate = Date.parse(right);
    if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
      return leftDate - rightDate;
    }

    return String(left).localeCompare(String(right), 'pt-BR', { sensitivity: 'base' });
  }

  matchCondition(row, condition) {
    const value = this.getNestedValue(row, condition.column);

    switch (condition.op) {
      case 'eq': return value === condition.value;
      case 'neq': return value !== condition.value;
      case 'is': return condition.value === null ? value === null || value === undefined : value === condition.value;
      case 'not':
        if (condition.operator === 'is') {
          return condition.value === null ? value !== null && value !== undefined : value !== condition.value;
        }
        return true;
      case 'gt': return this.compareValues(value, condition.value) > 0;
      case 'gte': return this.compareValues(value, condition.value) >= 0;
      case 'lt': return this.compareValues(value, condition.value) < 0;
      case 'lte': return this.compareValues(value, condition.value) <= 0;
      case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
      case 'or': {
        const tests = String(condition.expression)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

        return tests.some((test) => {
          const marker = '.ilike.';
          if (!test.includes(marker)) return false;
          const [column, rawPattern] = test.split(marker);
          const current = this.getNestedValue(row, column);
          const normalized = String(rawPattern || '').replace(/^%|%$/g, '').toLowerCase();
          return String(current || '').toLowerCase().includes(normalized);
        });
      }
      default:
        return true;
    }
  }

  enrichRow(table, row, selection) {
    const relationConfig = RELATIONS[table] || {};
    const parts = parseTopLevelColumns(selection);
    const needsAll = parts.includes('*');
    const output = needsAll ? { ...row } : {};

    for (const part of parts) {
      if (part === '*') continue;

      if (part.includes('(')) {
        const relationName = part.slice(0, part.indexOf('(')).trim();
        const innerSelection = part.slice(part.indexOf('(') + 1, -1).trim() || '*';
        const relation = relationConfig[relationName];

        if (!relation) continue;

        const baseRelatedRow = this.client
          .fetchAll(relation.table)
          .find((candidate) => candidate[relation.foreignKey] === row[relation.localKey]);

        output[relationName] = baseRelatedRow
          ? this.enrichRow(relation.table, baseRelatedRow, innerSelection)
          : null;
        continue;
      }

      output[part] = row[part];
    }

    return output;
  }

  projectRows(rows) {
    return rows.map((row) => this.enrichRow(this.table, row, this.selection));
  }

  applyFilters(rows) {
    if (!this.filters.length) return rows;
    return rows.filter((row) => this.filters.every((condition) => this.matchCondition(row, condition)));
  }

  applyOrdering(rows) {
    if (!this.ordering) return rows;
    const { column, ascending } = this.ordering;

    return [...rows].sort((a, b) => {
      const result = this.compareValues(this.getNestedValue(a, column), this.getNestedValue(b, column));
      return ascending ? result : result * -1;
    });
  }

  applyRange(rows) {
    if (this.rangeArgs) {
      const [from, to] = this.rangeArgs;
      return rows.slice(from, to + 1);
    }

    if (typeof this.limitValue === 'number') {
      return rows.slice(0, this.limitValue);
    }

    return rows;
  }

  buildResult(rows, totalCount) {
    const count = this.selectOptions?.count === 'exact' ? totalCount : null;
    const data = this.selectOptions?.head ? null : rows;

    if (this.expectSingle) {
      return {
        data: rows[0] || null,
        count,
        error: rows.length === 1 ? null : null
      };
    }

    if (this.expectMaybeSingle) {
      return {
        data: rows[0] || null,
        count,
        error: null
      };
    }

    return { data, count, error: null };
  }

  performInsert() {
    const inserted = this.payload.map((item) => this.client.insertRow(this.table, item));
    const projected = this.projectRows(inserted);
    return this.buildResult(projected, projected.length);
  }

  performUpdate() {
    const rows = this.applyFilters(this.client.fetchAll(this.table));
    const updated = rows.map((row) => this.client.updateRow(this.table, row.id, this.payload));
    const projected = this.projectRows(updated.filter(Boolean));
    return this.buildResult(projected, projected.length);
  }

  performDelete() {
    const rows = this.applyFilters(this.client.fetchAll(this.table));
    rows.forEach((row) => this.client.deleteRow(this.table, row.id));
    return { data: null, count: null, error: null };
  }

  performUpsert() {
    const conflictColumn = this.upsertOptions?.onConflict || 'id';
    const resultRows = this.payload.map((item) => this.client.upsertRow(this.table, item, conflictColumn));
    const projected = this.projectRows(resultRows);
    return this.buildResult(projected, projected.length);
  }

  executeSelect() {
    let rows = this.client.fetchAll(this.table);
    rows = this.projectRows(rows);
    rows = this.applyFilters(rows);
    const totalCount = rows.length;
    rows = this.applyOrdering(rows);
    rows = this.applyRange(rows);
    return this.buildResult(rows, totalCount);
  }

  execute() {
    switch (this.action) {
      case 'insert': return this.performInsert();
      case 'update': return this.performUpdate();
      case 'delete': return this.performDelete();
      case 'upsert': return this.performUpsert();
      default: return this.executeSelect();
    }
  }
}

class OfflineClient {
  constructor(db) {
    this.db = db;
    this.auth = {
      admin: {
        listUsers: async () => ({
          data: { users: this.fetchAll('usuarios').filter((row) => !row.deleted_at).map(mapOutgoingUser) },
          error: null
        }),
        createUser: async ({ email, password, user_metadata = {}, email_confirm = true }) => {
          const existing = this.db.prepare('SELECT * FROM usuarios WHERE email = ?').get(String(email).toLowerCase());
          if (existing) {
            return { data: null, error: new Error('Usuario ja existe.') };
          }

          const now = new Date().toISOString();
          const user = this.insertRow('usuarios', {
            id: crypto.randomUUID(),
            nome: user_metadata.nome || 'Usuario',
            email: String(email).toLowerCase(),
            senha_hash: await bcrypt.hash(String(password), 10),
            tipo: user_metadata.tipo || 'usuario',
            multa_pendente: false,
            bloqueado: false,
            motivo_bloqueio: null,
            deleted_at: null,
            created_at: now,
            infantil_xp: 0,
            infantil_level: 1,
            infantil_hearts: 5
          });

          return { data: { user: mapOutgoingUser(user) }, error: null };
        },
        updateUserById: async (id, updates = {}) => {
          const current = this.db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
          if (!current) {
            return { data: null, error: new Error('Usuario nao encontrado.') };
          }

          const patch = {};
          if (updates.email !== undefined) patch.email = String(updates.email).toLowerCase();
          if (updates.password !== undefined) patch.senha_hash = await bcrypt.hash(String(updates.password), 10);
          if (updates.user_metadata) {
            if (updates.user_metadata.nome !== undefined) patch.nome = updates.user_metadata.nome;
            if (updates.user_metadata.tipo !== undefined) patch.tipo = updates.user_metadata.tipo;
          }

          const updated = this.updateRow('usuarios', id, patch);
          return { data: { user: mapOutgoingUser(updated) }, error: null };
        }
      }
    };
  }

  from(table) {
    return new OfflineQueryBuilder(this, table);
  }

  fetchAll(table) {
    const rows = this.db.prepare(`SELECT * FROM ${table}`).all();
    return rows.map((row) => mapRow(table, row));
  }

  getPrimaryKey(table) {
    return 'id';
  }

  getInsertableRow(table, payload) {
    const row = { ...payload };
    const now = new Date().toISOString();

    if (table === 'usuarios') {
      row.id = row.id || crypto.randomUUID();
      row.email = String(row.email || '').toLowerCase();
      row.created_at = row.created_at || now;
      row.multa_pendente = row.multa_pendente ? 1 : 0;
      row.bloqueado = row.bloqueado ? 1 : 0;
      row.infantil_xp = row.infantil_xp ?? 0;
      row.infantil_level = row.infantil_level ?? 1;
      row.infantil_hearts = row.infantil_hearts ?? 5;
      return row;
    }

    if (['livros', 'exemplares', 'alugueis', 'multas', 'acervo_digital'].includes(table)) {
      row.created_at = row.created_at || now;
      return row;
    }

    return row;
  }

  insertRow(table, payload) {
    const row = this.getInsertableRow(table, payload);
    const keys = Object.keys(row);
    const placeholders = keys.map((key) => `@${key}`).join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const info = this.db.prepare(sql).run(row);

    if (row.id === undefined && info.lastInsertRowid !== undefined) {
      row.id = Number(info.lastInsertRowid);
    }

    return mapRow(table, this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(row.id));
  }

  updateRow(table, id, updates) {
    const patch = { ...updates };
    if (table === 'usuarios') {
      if (patch.email !== undefined) patch.email = String(patch.email).toLowerCase();
      if (patch.multa_pendente !== undefined) patch.multa_pendente = patch.multa_pendente ? 1 : 0;
      if (patch.bloqueado !== undefined) patch.bloqueado = patch.bloqueado ? 1 : 0;
    }

    const keys = Object.keys(patch);
    if (!keys.length) {
      return mapRow(table, this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
    }

    const assignments = keys.map((key) => `${key} = @${key}`).join(', ');
    this.db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = @id`).run({ ...patch, id });
    return mapRow(table, this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
  }

  deleteRow(table, id) {
    this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  }

  upsertRow(table, payload, conflictColumn) {
    const row = this.getInsertableRow(table, payload);
    const existing = this.db.prepare(`SELECT * FROM ${table} WHERE ${conflictColumn} = ?`).get(row[conflictColumn]);
    if (existing) {
      return this.updateRow(table, existing.id, row);
    }
    return this.insertRow(table, row);
  }
}

class OfflineAuthClient {
  constructor(client) {
    this.client = client;
    this.auth = {
      signUp: async ({ email, password, options = {} }) => {
        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = this.client.db.prepare('SELECT * FROM usuarios WHERE email = ?').get(normalizedEmail);
        if (existing) {
          return { data: null, error: new Error('Usuario ja existe.') };
        }

        const user = this.client.insertRow('usuarios', {
          id: crypto.randomUUID(),
          nome: options?.data?.nome || 'Usuario',
          email: normalizedEmail,
          senha_hash: await bcrypt.hash(String(password), 10),
          tipo: options?.data?.tipo || 'usuario',
          multa_pendente: false,
          bloqueado: false,
          motivo_bloqueio: null,
          deleted_at: null,
          created_at: new Date().toISOString(),
          infantil_xp: 0,
          infantil_level: 1,
          infantil_hearts: 5
        });

        const session = this.createSession(user);
        return { data: { user: mapOutgoingUser(user), session }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        const normalizedEmail = String(email).trim().toLowerCase();
        const user = this.client.db.prepare('SELECT * FROM usuarios WHERE email = ?').get(normalizedEmail);

        if (!user || !user.senha_hash) {
          return { data: null, error: new Error('Credenciais invalidas.') };
        }

        const valid = await bcrypt.compare(String(password), user.senha_hash);
        if (!valid) {
          return { data: null, error: new Error('Credenciais invalidas.') };
        }

        const session = this.createSession(user);
        return { data: { user: mapOutgoingUser(mapRow('usuarios', user)), session }, error: null };
      },
      getUser: async (token) => {
        try {
          const payload = jwt.verify(token, jwtSecret);
          const user = this.client.db.prepare('SELECT * FROM usuarios WHERE id = ?').get(payload.sub);
          if (!user) {
            return { data: { user: null }, error: new Error('Token invalido.') };
          }

          return { data: { user: mapOutgoingUser(mapRow('usuarios', user)) }, error: null };
        } catch (error) {
          return { data: { user: null }, error };
        }
      }
    };
  }

  createSession(user) {
    const access_token = jwt.sign(
      { sub: user.id, email: user.email, tipo: user.tipo, mode: 'offline' },
      jwtSecret,
      { expiresIn: '30d' }
    );

    return { access_token, token_type: 'bearer' };
  }
}

if (!isOfflineMode) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });

  module.exports = supabase;
  module.exports.supabaseAuth = supabaseAuth;
  module.exports.runtimeMode = runtimeMode;
  module.exports.isOfflineMode = false;
} else {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  applySchema(db);

  const offlineClient = new OfflineClient(db);
  const offlineAuth = new OfflineAuthClient(offlineClient);

  module.exports = offlineClient;
  module.exports.supabaseAuth = offlineAuth;
  module.exports.runtimeMode = runtimeMode;
  module.exports.isOfflineMode = true;
}
