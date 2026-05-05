/**
 * CAMADA DE DADOS (Database)
 * Este módulo é o coração da persistência do Biblio Verso. Ele gerencia a conexão híbrida:
 * 1. MODO ONLINE: Utiliza o Supabase (PostgreSQL na nuvem) para escalabilidade.
 * 2. MODO OFFLINE: Simula a API do Supabase usando o SQLite local para desenvolvimento sem internet.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // Utilizado para gerar identificadores únicos (UUIDs)
const bcrypt = require('bcryptjs'); // Utilizado para transformar senhas em códigos ilegíveis (segurança)
const jwt = require('jsonwebtoken'); // Utilizado para gerar os "crachás digitais" de acesso (Tokens)
const Database = require('better-sqlite3'); // Banco de dados local ultrarrápido
const { createClient } = require('@supabase/supabase-js'); // Cliente oficial da infraestrutura de nuvem
const dotenv = require('dotenv');
const { applySchema, dbPath } = require('./setup'); // Script de criação das tabelas

dotenv.config({ quiet: true });

// --- CONFIGURAÇÃO DO MODO DE OPERAÇÃO ---
// O sistema decide se vai rodar "Online" (na nuvem) ou "Offline" (no computador local)
const requestedMode = (process.env.APP_MODE || 'offline').trim().toLowerCase();
const hasSupabaseConfig = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const runtimeMode = requestedMode === 'online' && hasSupabaseConfig ? 'online' : 'offline';
const isOfflineMode = runtimeMode !== 'online';
const jwtSecret = process.env.JWT_SECRET || 'offline-biblioteca-dev-secret';

// --- FUNÇÕES DE AJUDA (UTILITÁRIOS) ---

// Transforma valores de banco (0 ou 1) em Sim ou Não (true/false)
function normalizeBoolean(value) {
  if (value === true || value === false) return value;
  if (value === 1 || value === 0) return Boolean(value);
  return value;
}

// Organiza os dados que saem da tabela de usuários
function mapRow(table, row) {
  if (!row) return row;

  if (table === 'usuarios') {
    return {
      ...row,
      multa_pendente: normalizeBoolean(row.multa_pendente),
      bloqueado: normalizeBoolean(row.bloqueado),
      bloqueios: row.bloqueios ? JSON.parse(row.bloqueios) : {}
    };
  }

  return row;
}

// Prepara o usuário para ser enviado ao frontend (esconde a senha)
function mapOutgoingUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    created_at: row.created_at,
    user_metadata: {
      nome: row.nome,
      tipo: row.tipo,
      bloqueios: row.bloqueios,
      bloqueado: Boolean(row.bloqueado)
    }
  };
}

// Ajuda a entender quais colunas o sistema quer buscar
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

// --- RELACIONAMENTOS ---
// Define como as tabelas se conectam (ex: um aluguel pertence a um livro)
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
  },
  amizades: {
    usuarios: { table: 'usuarios', localKey: 'usuario_remetente', foreignKey: 'id' }
  },
  clube_mensagens: {
    usuarios: { table: 'usuarios', localKey: 'usuario_id', foreignKey: 'id' }
  },
  mensagens_diretas: {
    usuarios: { table: 'usuarios', localKey: 'remetente_id', foreignKey: 'id' }
  }
};

// --- CONSTRUTOR DE CONSULTAS OFFLINE ---
// Esta classe simula o comportamento do Supabase, mas usando o banco local (SQLite)
class OfflineQueryBuilder {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.action = 'select'; // O que vamos fazer (buscar, inserir, deletar...)
    this.selection = '*';
    this.selectOptions = {};
    this.filters = []; // Filtros (ex: buscar apenas livros de "Ação")
    this.ordering = null;
    this.rangeArgs = null;
    this.limitValue = null;
    this.expectSingle = false;
    this.expectMaybeSingle = false;
    this.payload = null;
    this.upsertOptions = {};
  }

  // Funções para montar a busca (fluente)
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

  // Métodos de filtragem (igual ao Supabase)
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

  // Executa a consulta quando tudo estiver montado
  then(resolve, reject) {
    return Promise.resolve(this.execute()).then(resolve, reject);
  }

  // Busca valores dentro de objetos relacionados
  getNestedValue(row, pathExpression) {
    const parts = String(pathExpression).split('.');
    let current = row;
    let currentTable = this.table;

    for (const key of parts) {
      if (current === null || current === undefined) return undefined;

      if (Object.prototype.hasOwnProperty.call(current, key)) {
        current = current[key];

        const directRelation = RELATIONS[currentTable]?.[key];
        if (directRelation) {
          currentTable = directRelation.table;
        }
        continue;
      }

      const relation = RELATIONS[currentTable]?.[key];
      if (!relation) return undefined;

      current = this.client
        .fetchAll(relation.table)
        .find((candidate) => this.valuesEqual(candidate[relation.foreignKey], current[relation.localKey]));
      currentTable = relation.table;
    }

    return current;
  }

  // Compara dois valores para saber qual é maior ou se são iguais
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

  valuesEqual(left, right) {
    if (left === null || left === undefined || right === null || right === undefined) {
      return left === right;
    }

    return this.compareValues(left, right) === 0;
  }

  // Verifica se uma linha do banco atende ao filtro
  matchCondition(row, condition) {
    const value = this.getNestedValue(row, condition.column);

    switch (condition.op) {
      case 'eq': return this.valuesEqual(value, condition.value);
      case 'neq': return !this.valuesEqual(value, condition.value);
      case 'is': return condition.value === null ? value === null || value === undefined : this.valuesEqual(value, condition.value);
      case 'not':
        if (condition.operator === 'is') {
          return condition.value === null ? value !== null && value !== undefined : !this.valuesEqual(value, condition.value);
        }
        return true;
      case 'gt': return this.compareValues(value, condition.value) > 0;
      case 'gte': return this.compareValues(value, condition.value) >= 0;
      case 'lt': return this.compareValues(value, condition.value) < 0;
      case 'lte': return this.compareValues(value, condition.value) <= 0;
      case 'in': return Array.isArray(condition.value) && condition.value.some((item) => this.valuesEqual(value, item));

      case 'or': {
        const tests = String(condition.expression)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

        return tests.some((test) => {
          // O formato esperado é "coluna.operador.valor"
          const parts = test.split('.');
          if (parts.length < 3) return false;
          
          const col = parts[0];
          const op = parts[1];
          const val = parts.slice(2).join('.'); // Rejunta caso o valor tenha pontos

          const current = this.getNestedValue(row, col);
          
          switch (op) {
            case 'eq': return this.valuesEqual(current, val);
            case 'neq': return !this.valuesEqual(current, val);
            case 'ilike': {
              const normalized = String(val || '').replace(/^%|%$/g, '').toLowerCase();
              return String(current || '').toLowerCase().includes(normalized);
            }
            case 'gt': return this.compareValues(current, val) > 0;
            case 'gte': return this.compareValues(current, val) >= 0;
            case 'lt': return this.compareValues(current, val) < 0;
            case 'lte': return this.compareValues(current, val) <= 0;
            case 'is': return val === 'null' ? (current === null || current === undefined) : this.valuesEqual(current, val);
            case 'in': {
              // Formato do IN no OR costuma ser (val1,val2,val3)
              const vals = val.replace(/^\(|\)$/g, '').split('|');
              return vals.some(v => this.valuesEqual(current, v));
            }
            default: return false;
          }
        });
      }

      default:
        return true;
    }
  }

  // Traz dados de outras tabelas se necessário (ex: pegar os dados do livro junto com o aluguel)
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
          .find((candidate) => this.valuesEqual(candidate[relation.foreignKey], row[relation.localKey]));

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

  // Aplica todos os filtros na lista de resultados
  applyFilters(rows) {
    if (!this.filters.length) return rows;
    return rows.filter((row) => this.filters.every((condition) => this.matchCondition(row, condition)));
  }

  // Ordena os resultados
  applyOrdering(rows) {
    if (!this.ordering) return rows;
    const { column, ascending } = this.ordering;

    return [...rows].sort((a, b) => {
      const result = this.compareValues(this.getNestedValue(a, column), this.getNestedValue(b, column));
      return ascending ? result : result * -1;
    });
  }

  // Pega apenas uma parte dos resultados (paginação)
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

  // Monta o objeto final que a API vai responder
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

  // Realiza a inserção no banco local
  performInsert() {
    const inserted = this.payload.map((item) => this.client.insertRow(this.table, item));
    const projected = this.projectRows(inserted);
    return this.buildResult(projected, projected.length);
  }

  // Realiza a atualização no banco local
  performUpdate() {
    const rows = this.applyFilters(this.client.fetchAll(this.table));
    const updated = rows.map((row) => this.client.updateRow(this.table, row.id, this.payload));
    const projected = this.projectRows(updated.filter(Boolean));
    return this.buildResult(projected, projected.length);
  }

  // Apaga dados do banco local
  performDelete() {
    const rows = this.applyFilters(this.client.fetchAll(this.table));
    rows.forEach((row) => this.client.deleteRow(this.table, row.id));
    return { data: null, count: null, error: null };
  }

  // Insere ou atualiza se já existir
  performUpsert() {
    const conflictColumn = this.upsertOptions?.onConflict || 'id';
    const resultRows = this.payload.map((item) => this.client.upsertRow(this.table, item, conflictColumn));
    const projected = this.projectRows(resultRows);
    return this.buildResult(projected, projected.length);
  }

  // Executa a busca (SELECT)
  executeSelect() {
    let rows = this.client.fetchAll(this.table);
    rows = this.applyFilters(rows);
    const totalCount = rows.length;
    rows = this.applyOrdering(rows);
    rows = this.applyRange(rows);
    rows = this.projectRows(rows);
    return this.buildResult(rows, totalCount);
  }

  // Decide qual ação tomar
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

// --- CLIENTE OFFLINE ---
// Gerencia a conexão com o banco SQLite e simula as funções administrativas do Supabase
class OfflineClient {
  constructor(db) {
    this.db = db;
    this.auth = {
      admin: {
        // Lista todos os usuários do sistema
        listUsers: async () => ({
          data: { users: this.fetchAll('usuarios').filter((row) => !row.deleted_at).map(mapOutgoingUser) },
          error: null
        }),
        // Cria um novo usuário manualmente (admin)
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
        // Atualiza dados de um usuário
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

  // Inicia uma nova consulta em uma tabela
  from(table) {
    return new OfflineQueryBuilder(this, table);
  }

  // Busca todas as linhas de uma tabela
  fetchAll(table) {
    const rows = this.db.prepare(`SELECT * FROM ${table}`).all();
    return rows.map((row) => mapRow(table, row));
  }

  getPrimaryKey(table) {
    try {
      const info = this.db.prepare(`PRAGMA table_info(${table})`).all();
      const pks = info.filter(c => c.pk > 0).sort((a, b) => a.pk - b.pk).map(c => c.name);
      if (pks.length === 1) return pks[0];
      if (pks.length > 1) return pks;
      return 'id';
    } catch (e) {
      return 'id';
    }
  }

  // Prepara os dados para serem salvos (garante campos obrigatórios)
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

    if (['livros', 'exemplares', 'alugueis', 'multas', 'acervo_digital', 'usuarios_leicoes_infantis'].includes(table)) {
      row.created_at = row.created_at || now;
      return row;
    }

    return row;
  }

  // Insere fisicamente na tabela SQLite
  insertRow(table, payload) {
    const row = this.getInsertableRow(table, payload);
    const keys = Object.keys(row);
    
    // Converte objetos para strings JSON para o SQLite
    keys.forEach(key => {
      if (row[key] !== null && typeof row[key] === 'object') {
        row[key] = JSON.stringify(row[key]);
      }
    });

    const placeholders = keys.map((key) => `@${key}`).join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

    try {
      const info = this.db.prepare(sql).run(row);
      const pk = this.getPrimaryKey(table);

      if (Array.isArray(pk)) {
        const conditions = pk.map(k => `${k} = @${k}`).join(' AND ');
        return mapRow(table, this.db.prepare(`SELECT * FROM ${table} WHERE ${conditions}`).get(row)) || row;
      } else {
        if (row[pk] === undefined && info.lastInsertRowid !== undefined && info.lastInsertRowid !== 0n) {
          row[pk] = Number(info.lastInsertRowid);
        }
        return mapRow(table, this.db.prepare(`SELECT * FROM ${table} WHERE ${pk} = ?`).get(row[pk] || null)) || row;
      }
    } catch (error) {
      // Silencia erros esperados (como e-mail já existente) para não poluir o terminal
      if (!error.message.includes('UNIQUE constraint failed')) {
        console.error(`❌ Erro inesperado na tabela ${table}:`, error);
      }
      throw error;
    }
  }

  // Atualiza fisicamente na tabela SQLite
  updateRow(table, id, updates) {
    const patch = { ...updates };
    const pk = this.getPrimaryKey(table);

    if (table === 'usuarios') {
      if (patch.email !== undefined) patch.email = String(patch.email).toLowerCase();
      if (patch.multa_pendente !== undefined) patch.multa_pendente = patch.multa_pendente ? 1 : 0;
      if (patch.bloqueado !== undefined) patch.bloqueado = patch.bloqueado ? 1 : 0;
    }

    const keys = Object.keys(patch);
    if (!keys.length) {
      if (Array.isArray(pk)) return mapRow(table, this.db.prepare(`SELECT * FROM ${table} WHERE ${pk.map(k => `${k} = ?`).join(' AND ')}`).get(...(Array.isArray(id) ? id : [id])));
      return mapRow(table, this.db.prepare(`SELECT * FROM ${table} WHERE ${pk} = ?`).get(id));
    }

    // Converte objetos para strings JSON para o SQLite
    keys.forEach(key => {
      if (patch[key] !== null && typeof patch[key] === 'object') {
        patch[key] = JSON.stringify(patch[key]);
      }
    });

    if (Array.isArray(pk)) {
      // Para chaves compostas, 'id' deve ser um objeto contendo os valores das chaves
      const assignments = keys.map((key) => `${key} = @${key}`).join(', ');
      const conditions = pk.map(k => `${k} = @__pk_${k}`).join(' AND ');
      const queryData = { ...patch };
      pk.forEach(k => queryData[`__pk_${k}`] = id[k]);
      this.db.prepare(`UPDATE ${table} SET ${assignments} WHERE ${conditions}`).run(queryData);
      return mapRow(table, this.db.prepare(`SELECT * FROM ${table} WHERE ${conditions}`).get(queryData));
    } else {
      const assignments = keys.map((key) => `${key} = @${key}`).join(', ');
      this.db.prepare(`UPDATE ${table} SET ${assignments} WHERE ${pk} = @pk_val`).run({ ...patch, pk_val: id });
      return mapRow(table, this.db.prepare(`SELECT * FROM ${table} WHERE ${pk} = ?`).get(id));
    }
  }

  // Deleta fisicamente da tabela SQLite
  deleteRow(table, id) {
    const pk = this.getPrimaryKey(table);
    if (Array.isArray(pk)) {
      const conditions = pk.map(k => `${k} = @${k}`).join(' AND ');
      this.db.prepare(`DELETE FROM ${table} WHERE ${conditions}`).run(id);
    } else {
      this.db.prepare(`DELETE FROM ${table} WHERE ${pk} = ?`).run(id);
    }
  }

  // Insere ou atualiza (UPSERT)
  upsertRow(table, payload, conflictColumn) {
    const row = this.getInsertableRow(table, payload);
    const existing = this.db.prepare(`SELECT * FROM ${table} WHERE ${conflictColumn} = ?`).get(row[conflictColumn]);
    if (existing) {
      return this.updateRow(table, existing.id, row);
    }
    return this.insertRow(table, row);
  }


  // Os métodos de busca, inserção e atualização agora usam o OfflineQueryBuilder
  // definido no início do arquivo para manter compatibilidade total com a API do Supabase.
}

// --- CLIENTE DE AUTENTICAÇÃO OFFLINE ---
// Gerencia logins, cadastros e tokens sem precisar de internet
class OfflineAuthClient {
  constructor(client) {
    this.client = client;
    this.auth = {
      // Cadastro de novo usuário
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
      // Login com email e senha
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

        if (user.bloqueado) {
          return { data: null, error: new Error('Esta conta foi suspensa permanentemente por um administrador.') };
        }

        const session = this.createSession(user);
        return { data: { user: mapOutgoingUser(mapRow('usuarios', user)), session }, error: null };
      },
      // Verifica quem é o dono do token enviado
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

  // Gera um token (crachá) que vale por 30 dias
  createSession(user) {
    const access_token = jwt.sign(
      { sub: user.id, email: user.email, tipo: user.tipo, mode: 'offline' },
      jwtSecret,
      { expiresIn: '30d' }
    );

    return { access_token, token_type: 'bearer' };
  }
}

// --- EXPORTAÇÃO FINAL ---
// Aqui o sistema decide qual cliente entregar para o resto do código
if (!isOfflineMode) {
  // Modo Online: Conecta com o Supabase na nuvem
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
  // Modo Offline: Cria a pasta e o arquivo de banco local
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  applySchema(db); // Cria as tabelas se não existirem

  const offlineClient = new OfflineClient(db);
  const offlineAuth = new OfflineAuthClient(offlineClient);

  module.exports = offlineClient;
  module.exports.supabaseAuth = offlineAuth;
  module.exports.runtimeMode = runtimeMode;
  module.exports.isOfflineMode = true;
}
