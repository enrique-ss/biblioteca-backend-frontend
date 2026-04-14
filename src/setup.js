const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const dbPath = path.join(dataDir, 'biblioteca.sqlite');

function applySchema(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT,
      tipo TEXT NOT NULL CHECK (tipo IN ('usuario', 'bibliotecario')),
      multa_pendente INTEGER DEFAULT 0,
      bloqueado INTEGER DEFAULT 0,
      motivo_bloqueio TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      infantil_xp INTEGER DEFAULT 0,
      infantil_level INTEGER DEFAULT 1,
      infantil_hearts INTEGER DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS usuarios_leicoes_infantis (
      usuario_id TEXT NOT NULL,
      leicao_id TEXT NOT NULL,
      PRIMARY KEY (usuario_id, leicao_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS livros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      autor TEXT NOT NULL,
      ano_lancamento INTEGER NOT NULL,
      genero TEXT,
      isbn TEXT,
      corredor TEXT NOT NULL,
      prateleira TEXT NOT NULL,
      capa_url TEXT,
      exemplares INTEGER DEFAULT 1,
      exemplares_disponiveis INTEGER DEFAULT 1,
      status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'alugado')),
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exemplares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      livro_id INTEGER NOT NULL,
      codigo TEXT,
      disponibilidade TEXT DEFAULT 'disponivel' CHECK (disponibilidade IN ('disponivel', 'emprestado', 'indisponivel', 'perdido')),
      condicao TEXT DEFAULT 'bom' CHECK (condicao IN ('bom', 'danificado', 'perdido')),
      observacao TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (livro_id) REFERENCES livros(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alugueis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      livro_id INTEGER NOT NULL,
      exemplar_id INTEGER NOT NULL,
      usuario_id TEXT NOT NULL,
      data_aluguel TEXT DEFAULT CURRENT_TIMESTAMP,
      data_prevista_devolucao TEXT NOT NULL,
      data_devolucao TEXT,
      status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'devolvido')),
      estado_devolucao TEXT CHECK (estado_devolucao IN ('bom', 'danificado', 'perdido')),
      renovacoes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (livro_id) REFERENCES livros(id) ON DELETE CASCADE,
      FOREIGN KEY (exemplar_id) REFERENCES exemplares(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS multas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluguel_id INTEGER NOT NULL,
      usuario_id TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('atraso', 'perda')),
      valor REAL NOT NULL,
      dias_atraso INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga')),
      pago_em TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aluguel_id) REFERENCES alugueis(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS acervo_digital (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      autor TEXT,
      categoria TEXT NOT NULL,
      ano INTEGER NOT NULL,
      paginas INTEGER NOT NULL,
      tamanho_arquivo TEXT NOT NULL,
      url_arquivo TEXT NOT NULL,
      capa_url TEXT,
      status TEXT DEFAULT 'aprovado' CHECK (status IN ('pendente', 'aprovado')),
      usuario_id TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
  `);
}

function recreateDatabase() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = OFF');
  db.exec(`
    DROP TABLE IF EXISTS multas;
    DROP TABLE IF EXISTS alugueis;
    DROP TABLE IF EXISTS exemplares;
    DROP TABLE IF EXISTS acervo_digital;
    DROP TABLE IF EXISTS usuarios_leicoes_infantis;
    DROP TABLE IF EXISTS livros;
    DROP TABLE IF EXISTS usuarios;
  `);
  db.pragma('foreign_keys = ON');
  applySchema(db);
  db.exec('VACUUM;');
  db.close();
}

function configurarBanco() {
  recreateDatabase();
  console.log(`Banco offline recriado em ${dbPath}`);
  return true;
}

if (require.main === module) {
  const ok = configurarBanco();
  process.exitCode = ok ? 0 : 1;
}

module.exports = { configurarBanco, applySchema, dbPath };
