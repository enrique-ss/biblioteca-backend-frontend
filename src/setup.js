// --- CONFIGURAÇÃO INICIAL DO BANCO DE DADOS ---
// Este arquivo cria as tabelas e a estrutura do banco de dados no seu computador.
// Ele define como as informações de livros, usuários e aluguéis serão guardadas.

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

// Define onde o arquivo do banco de dados será salvo (na pasta /data)
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const dbPath = path.join(dataDir, 'biblioteca.sqlite');

// Esta função cria a "planta" do banco de dados (as tabelas)
function applySchema(db) {
  db.pragma('journal_mode = WAL'); // Melhora a velocidade do banco
  db.pragma('foreign_keys = ON'); // Garante que as conexões entre tabelas funcionem corretamente

  db.exec(`
    -- Tabela que guarda as pessoas cadastradas (usuários e bibliotecários)
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
      infantil_hearts INTEGER DEFAULT 5,
      bio TEXT,
      generos_favoritos TEXT,
      avatar_url TEXT,
      banner_url TEXT,
      bloqueios TEXT DEFAULT '{}' -- JSON com restrições granulares (fisico, digital, social, infantil)
    );

    -- Tabela para o progresso das crianças nas lições
    CREATE TABLE IF NOT EXISTS usuarios_leicoes_infantis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,
      leicao_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(usuario_id, leicao_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    -- Tabela que guarda a lista de livros físicos
    CREATE TABLE IF NOT EXISTS livros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      autor TEXT NOT NULL,
      ano_lancamento INTEGER NOT NULL,
      genero TEXT,
      isbn TEXT,
      corredor TEXT NOT NULL, -- Localização física na biblioteca
      prateleira TEXT NOT NULL,
      capa_url TEXT,
      exemplares INTEGER DEFAULT 1,
      exemplares_disponiveis INTEGER DEFAULT 1,
      sinopse TEXT,
      status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'alugado')),
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabela que controla cada unidade física de um livro (exemplares)
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

    -- Tabela que registra quem pegou qual livro e quando deve devolver
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

    -- Tabela que guarda as multas de quem atrasou ou perdeu livros
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

    -- Tabela para os livros digitais (PDFs e arquivos)
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
      sinopse TEXT,
      status TEXT DEFAULT 'aprovado' CHECK (status IN ('pendente', 'aprovado')),
      usuario_id TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );

    -- Tabela que registra quando um usuário lê um livro digital
    CREATE TABLE IF NOT EXISTS leituras_digitais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,
      livro_digital_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (livro_digital_id) REFERENCES acervo_digital(id) ON DELETE CASCADE,
      UNIQUE(usuario_id, livro_digital_id) -- Garante que conte apenas uma vez por livro
    );

    -- Tabela de Amizades (Novo Sistema Social)
    CREATE TABLE IF NOT EXISTS amizades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_remetente TEXT NOT NULL,
      usuario_destinatario TEXT NOT NULL,
      status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_remetente) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_destinatario) REFERENCES usuarios(id) ON DELETE CASCADE,
      UNIQUE(usuario_remetente, usuario_destinatario)
    );
    -- Tabela de Avaliações de Livros e Digitais
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,
      livro_id INTEGER,
      acervo_digital_id INTEGER,
      nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
      comentario TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (livro_id) REFERENCES livros(id) ON DELETE CASCADE,
      FOREIGN KEY (acervo_digital_id) REFERENCES acervo_digital(id) ON DELETE CASCADE,
      CHECK (livro_id IS NOT NULL OR acervo_digital_id IS NOT NULL)
    );

    -- Tabela de Clubes de Leitura
    CREATE TABLE IF NOT EXISTS clubes_leitura (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      criado_por TEXT NOT NULL,
      livro_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (livro_id) REFERENCES livros(id) ON DELETE SET NULL
    );

    -- Tabela de Mensagens dos Clubes
    CREATE TABLE IF NOT EXISTS clube_mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clube_id INTEGER NOT NULL,
      usuario_id TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clube_id) REFERENCES clubes_leitura(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    -- Tabela de Comentários no Feed de Atividades
    CREATE TABLE IF NOT EXISTS atividades_comentarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      atividade_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      comentario TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    -- Tabela de Chat Privado entre Amigos
    CREATE TABLE IF NOT EXISTS mensagens_diretas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remetente_id TEXT NOT NULL,
      destinatario_id TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      lida INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
  `);

  // Migração: Adiciona a coluna created_at se ela não existir (para bancos legados)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(usuarios_leicoes_infantis)").all();
    const hasCreatedAt = tableInfo.some(col => col.name === 'created_at');
    if (!hasCreatedAt) {
      db.exec("ALTER TABLE usuarios_leicoes_infantis ADD COLUMN created_at TEXT");
      console.log("✅ Migração: Coluna 'created_at' adicionada a usuarios_leicoes_infantis.");
    }
  } catch (e) {
    console.error("❌ Erro ao verificar/adicionar coluna created_at:", e);
  }

  // Migração: Garante que todas as novas colunas existam na tabela usuários
  try {
    const tableInfo = db.prepare("PRAGMA table_info(usuarios)").all();
    const cols = tableInfo.map(c => c.name);
    
    const migrations = [
      { name: 'infantil_xp', type: 'INTEGER DEFAULT 0' },
      { name: 'infantil_level', type: 'INTEGER DEFAULT 1' },
      { name: 'infantil_hearts', type: 'INTEGER DEFAULT 5' },
      { name: 'bio', type: 'TEXT' },
      { name: 'generos_favoritos', type: 'TEXT' },
      { name: 'avatar_url', type: 'TEXT' },
      { name: 'banner_url', type: 'TEXT' },
      { name: 'bloqueios', type: "TEXT DEFAULT '{}'" }
    ];

    migrations.forEach(m => {
      if (!cols.includes(m.name)) {
        db.exec(`ALTER TABLE usuarios ADD COLUMN ${m.name} ${m.type}`);
        console.log(`✅ Migração: Coluna '${m.name}' adicionada a usuarios.`);
      }
    });
  } catch (e) {
    console.error("❌ Erro ao realizar migrações na tabela usuarios:", e);
  }
}

// Apaga tudo e cria do zero (usado para limpar o sistema)
function recreateDatabase() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = OFF');
  db.exec(`
    DROP TABLE IF EXISTS amizades;
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

// Inicia o processo de configuração
function configurarBanco() {
  recreateDatabase();
  console.log(`Banco offline recriado em ${dbPath}`);

  // Adiciona alguns usuários fictícios para popular o Social
  const db = new Database(dbPath);
  const insertUser = db.prepare(`
    INSERT INTO usuarios (id, nome, email, tipo, bio, infantil_level, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const dummyUsers = [
    ['u1', 'Ana Clara', 'ana@email.com', 'usuario', 'Apaixonada por romances históricos e café.', 5, '2026-01-10T10:00:00Z'],
    ['u2', 'Bruno Silva', 'bruno@email.com', 'usuario', 'Explorador de mundos de fantasia e ficção científica.', 8, '2026-02-15T14:30:00Z'],
    ['u3', 'Carla Mendes', 'carla@email.com', 'usuario', 'Leitora voraz de mistérios e thrillers psicológicos.', 12, '2026-03-20T09:15:00Z'],
    ['u4', 'Daniel Souza', 'daniel@email.com', 'usuario', 'Interessado em tecnologia, programação e filosofia.', 3, '2026-04-05T11:45:00Z'],
    ['u5', 'Elena Rocha', 'elena@email.com', 'usuario', 'Poetisa nas horas vagas e fã de literatura clássica.', 15, '2026-04-25T16:20:00Z']
  ];

  dummyUsers.forEach(user => insertUser.run(...user));

  // Adiciona alguns livros digitais para testar o "Publicado por"
  const insertDigital = db.prepare(`
    INSERT INTO acervo_digital (id, titulo, autor, categoria, ano, paginas, status, usuario_id, url_arquivo, tamanho_arquivo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDigital.run(1, 'O Guia do Mochileiro das Galáxias', 'Douglas Adams', 'Ficção Científica', 1979, 208, 'aprovado', 'u1', 'https://example.com/mochileiro.pdf', '2MB');
  insertDigital.run(2, 'Sapiens: Uma Breve História da Humanidade', 'Yuval Noah Harari', 'História', 2011, 464, 'aprovado', 'u2', 'https://example.com/sapiens.pdf', '5MB');
  insertDigital.run(3, 'O Código Da Vinci', 'Dan Brown', 'Suspense', 2003, 432, 'aprovado', 'u3', 'https://example.com/davinci.pdf', '3MB');

  console.log('✔ Dados de teste (Usuários e Acervo Digital) inseridos com sucesso.');
  db.close();

  return true;
}

// Se rodar este arquivo sozinho no terminal, ele limpa o banco
if (require.main === module) {
  const ok = configurarBanco();
  process.exitCode = ok ? 0 : 1;
}

// Retorna a instância do banco para uso direto com SQL nativo
let _dbInstance = null;
function getDb() {
  if (!_dbInstance) {
    const Database = require('better-sqlite3');
    // Garante que a pasta 'data' exista antes de tentar abrir o banco
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    _dbInstance = new Database(dbPath);
    _dbInstance.pragma('journal_mode = WAL');
    _dbInstance.pragma('foreign_keys = ON');
  }
  return _dbInstance;
}

module.exports = { configurarBanco, applySchema, dbPath, getDb };
