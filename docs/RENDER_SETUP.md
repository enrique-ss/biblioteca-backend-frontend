# Configuração do Projeto com Supabase

## Passo 1: Criar Tabelas no Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione o projeto "biblioteca"
3. Vá em "SQL Editor" no menu lateral
4. Clique em "New Query" e cole o SQL abaixo:

```sql
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
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
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
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
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
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
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
  status VARCHAR(20) CHECK (status IN ('pendente', 'aprovado')) DEFAULT 'aprovado',
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

5. Clique em "Run" para executar o SQL

## Passo 2: Criar Usuários Padrão

No mesmo SQL Editor do Supabase, execute o SQL abaixo para criar os usuários padrão:

```sql
-- Criar usuário admin no Supabase Auth (senha: admin123)
-- Para criar manualmente no painel Supabase:
-- 1. Authentication > Users > Add User
-- 2. Email: admin@admin.com, Senha: admin123
-- 3. User Metadata: { "nome": "Administrador Master", "tipo": "bibliotecario" }

-- Criar usuário comum no Supabase Auth (senha: user123)
-- Para criar manualmente no painel Supabase:
-- 1. Authentication > Users > Add User
-- 2. Email: user@user.com, Senha: user123
-- 3. User Metadata: { "nome": "Usuário Teste", "tipo": "usuario" }
```

**Credenciais:**
- Admin: admin@admin.com / senha: admin123
- Usuário: user@user.com / senha: user123

## Passo 3: Configurar Variáveis de Ambiente no Render

1. Acesse o painel do Render: https://dashboard.render.com/
2. Selecione o serviço "biblioteca-backend-frontend"
3. Clique em "Environment" na barra lateral
4. Adicione as seguintes variáveis de ambiente:

### Variáveis de Ambiente Necessárias

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://db.mtjrxenjffwjytjfkock.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anJ4ZW5qZmZ3anl0amZrb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI0NzU2NzQsImV4cCI6MjAzODA1MTY3NH0.5V2yFjK3H8X7mZ9L2k4Y5Q6R1P8N7K9J2L4M5X8Y3Z
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anJ4ZW5qZmZ3anl0amZrb2NrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0NDI1NCwiZXhwIjoyMDkxMzIwMjU0fQ.Qlmhp4kG3y0_X6d2O7aetFj8eYLLfLhobotP-Kk8bCI
CORS_ORIGIN=https://biblioteca-backend-frontend.onrender.com
```

### Passo a Passo

1. Clique em "Add Environment Variable"
2. Para cada variável:
   - **Key**: Nome da variável (ex: SUPABASE_URL)
   - **Value**: Valor correspondente
   - Clique em "Save"
3. Após adicionar todas as variáveis, clique em "Save Changes"
4. O Render fará um novo deploy automaticamente

## Importante

- O projeto agora usa Supabase em vez de PostgreSQL direto
- As tabelas devem ser criadas no painel do Supabase (SQL Editor)
- O setup.js apenas cria usuários, não cria tabelas
- Configure as variáveis de ambiente no painel do Render com as credenciais do Supabase
