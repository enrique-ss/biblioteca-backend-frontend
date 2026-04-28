-- Dropar tabelas em ordem reversa (devido a foreign keys)
DROP TABLE IF EXISTS multas CASCADE;
DROP TABLE IF EXISTS alugueis CASCADE;
DROP TABLE IF EXISTS exemplares CASCADE;
DROP TABLE IF EXISTS acervo_digital CASCADE;
DROP TABLE IF EXISTS usuarios_leicoes_infantis CASCADE;
DROP TABLE IF EXISTS livros CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Tabela de usuários (senha gerenciada pelo Supabase Auth)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  tipo VARCHAR(20) CHECK (tipo IN ('usuario', 'bibliotecario')) NOT NULL,
  multa_pendente BOOLEAN DEFAULT FALSE,
  bloqueado BOOLEAN DEFAULT FALSE,
  motivo_bloqueio TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  infantil_xp INTEGER DEFAULT 0,
  infantil_level INTEGER DEFAULT 1,
  infantil_hearts INTEGER DEFAULT 5
);

-- Tabela de lições infantis completadas
CREATE TABLE IF NOT EXISTS usuarios_leicoes_infantis (
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  leicao_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (usuario_id, leicao_id)
);

-- Tabela de livros
CREATE TABLE IF NOT EXISTS livros (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  autor VARCHAR(150) NOT NULL,
  ano_lancamento INTEGER NOT NULL,
  genero VARCHAR(100),
  isbn VARCHAR(20),
  corredor VARCHAR(10) NOT NULL,
  prateleira VARCHAR(10) NOT NULL,
  capa_url TEXT,
  exemplares INTEGER DEFAULT 1,
  exemplares_disponiveis INTEGER DEFAULT 1,
  sinopse TEXT,
  status VARCHAR(20) CHECK (status IN ('disponivel', 'alugado')) DEFAULT 'disponivel',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de exemplares
CREATE TABLE IF NOT EXISTS exemplares (
  id SERIAL PRIMARY KEY,
  livro_id INTEGER NOT NULL REFERENCES livros(id) ON DELETE CASCADE,
  codigo VARCHAR(50),
  disponibilidade VARCHAR(20) CHECK (disponibilidade IN ('disponivel', 'emprestado', 'indisponivel', 'perdido')) DEFAULT 'disponivel',
  condicao VARCHAR(20) CHECK (condicao IN ('bom', 'danificado', 'perdido')) DEFAULT 'bom',
  observacao TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de aluguéis
CREATE TABLE IF NOT EXISTS alugueis (
  id SERIAL PRIMARY KEY,
  livro_id INTEGER NOT NULL REFERENCES livros(id) ON DELETE CASCADE,
  exemplar_id INTEGER NOT NULL REFERENCES exemplares(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  data_aluguel TIMESTAMP DEFAULT NOW(),
  data_prevista_devolucao DATE NOT NULL,
  data_devolucao TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('ativo', 'devolvido')) DEFAULT 'ativo',
  estado_devolucao VARCHAR(20) CHECK (estado_devolucao IN ('bom', 'danificado', 'perdido')),
  renovacoes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de multas
CREATE TABLE IF NOT EXISTS multas (
  id SERIAL PRIMARY KEY,
  aluguel_id INTEGER NOT NULL REFERENCES alugueis(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) CHECK (tipo IN ('atraso', 'perda')) NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  dias_atraso INTEGER DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('pendente', 'paga')) DEFAULT 'pendente',
  pago_em TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de acervo digital
CREATE TABLE IF NOT EXISTS acervo_digital (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  autor VARCHAR(150),
  categoria VARCHAR(100) NOT NULL,
  ano INTEGER NOT NULL,
  paginas INTEGER NOT NULL,
  tamanho_arquivo VARCHAR(20) NOT NULL,
  url_arquivo TEXT NOT NULL,
  capa_url TEXT,
  sinopse TEXT,
  status VARCHAR(20) CHECK (status IN ('pendente', 'aprovado')) DEFAULT 'aprovado',
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
