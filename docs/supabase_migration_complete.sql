-- MIGRAÇÃO COMPLETA PARA SUPABASE - ATUALIZAR SCHEMA PARA SUPORAR CHAT E FUNCIONALIDADES SOCIAIS
-- Execute este script no painel SQL do Supabase para sincronizar com o schema local

-- 1. Adicionar colunas faltantes na tabela usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS generos_favoritos TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS bloqueios TEXT DEFAULT '{}';

-- 2. Corrigir a tabela usuarios_leicoes_infantis (compatibilidade)
DROP TABLE IF EXISTS usuarios_leicoes_infantis CASCADE;
CREATE TABLE IF NOT EXISTS usuarios_leicoes_infantis (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  leicao_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, leicao_id)
);

-- 3. Tabela de leituras digitais
CREATE TABLE IF NOT EXISTS leituras_digitais (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  livro_digital_id BIGINT NOT NULL REFERENCES acervo_digital(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, livro_digital_id)
);

-- 4. Tabela de Amizades
CREATE TABLE IF NOT EXISTS amizades (
  id BIGSERIAL PRIMARY KEY,
  usuario_remetente UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  usuario_destinatario UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_remetente, usuario_destinatario)
);

-- 5. Tabela de Avaliações
CREATE TABLE IF NOT EXISTS avaliacoes (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  livro_id BIGINT REFERENCES livros(id) ON DELETE CASCADE,
  acervo_digital_id BIGINT REFERENCES acervo_digital(id) ON DELETE CASCADE,
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (livro_id IS NOT NULL OR acervo_digital_id IS NOT NULL)
);

-- 6. Tabela de Clubes de Leitura
CREATE TABLE IF NOT EXISTS clubes_leitura (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  criado_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  livro_id BIGINT REFERENCES livros(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Tabela de Mensagens dos Clubes
CREATE TABLE IF NOT EXISTS clube_mensagens (
  id BIGSERIAL PRIMARY KEY,
  clube_id BIGINT NOT NULL REFERENCES clubes_leitura(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Tabela de Comentários no Feed de Atividades
CREATE TABLE IF NOT EXISTS atividades_comentarios (
  id BIGSERIAL PRIMARY KEY,
  atividade_id UUID NOT NULL,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Tabela de Chat Privado entre Amigos (MENSAGENS DIRETAS)
CREATE TABLE IF NOT EXISTS mensagens_diretas (
  id BIGSERIAL PRIMARY KEY,
  remetente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Índices para performance
CREATE INDEX IF NOT EXISTS idx_amizades_remetente ON amizades(usuario_remetente);
CREATE INDEX IF NOT EXISTS idx_amizades_destinatario ON amizades(usuario_destinatario);
CREATE INDEX IF NOT EXISTS idx_amizades_status ON amizades(status);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_livro ON avaliacoes(livro_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_digital ON avaliacoes(acervo_digital_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_usuario ON avaliacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clube_mensagens_clube ON clube_mensagens(clube_id);
CREATE INDEX IF NOT EXISTS idx_clube_mensagens_usuario ON clube_mensagens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_diretas_remetente ON mensagens_diretas(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_diretas_destinatario ON mensagens_diretas(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_atividades_comentarios_atividade ON atividades_comentarios(atividade_id);
CREATE INDEX IF NOT EXISTS idx_leituras_digitais_usuario ON leituras_digitais(usuario_id);
CREATE INDEX IF NOT EXISTS idx_leituras_digitais_livro ON leituras_digitais(livro_digital_id);

-- 11. Políticas de segurança (RLS) - Habilitar RLS nas novas tabelas
ALTER TABLE amizades ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubes_leitura ENABLE ROW LEVEL SECURITY;
ALTER TABLE clube_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_diretas ENABLE ROW LEVEL SECURITY;
ALTER TABLE leituras_digitais ENABLE ROW LEVEL SECURITY;

-- 12. Políticas de acesso (básicas - ajustar conforme necessidade)
-- Amizades
CREATE POLICY "Users can view their friendships" ON amizades
  FOR SELECT USING (auth.uid() = usuario_remetente OR auth.uid() = usuario_destinatario);

CREATE POLICY "Users can create friendships" ON amizades
  FOR INSERT WITH CHECK (auth.uid() = usuario_remetente);

CREATE POLICY "Users can update their friendships" ON amizades
  FOR UPDATE USING (auth.uid() = usuario_remetente OR auth.uid() = usuario_destinatario);

-- Avaliações
CREATE POLICY "Anyone can read reviews" ON avaliacoes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON avaliacoes FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Users can update their own reviews" ON avaliacoes FOR UPDATE USING (auth.uid() = usuario_id);

-- Clubes de Leitura
CREATE POLICY "Anyone can read book clubs" ON clubes_leitura FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create book clubs" ON clubes_leitura FOR INSERT WITH CHECK (auth.uid() = criado_por);
CREATE POLICY "Users can update their own clubs" ON clubes_leitura FOR UPDATE USING (auth.uid() = criado_por);

-- Mensagens dos Clubes
CREATE POLICY "Anyone can read club messages" ON clube_mensagens FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send club messages" ON clube_mensagens FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Comentários no Feed
CREATE POLICY "Anyone can read activity comments" ON atividades_comentarios FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create activity comments" ON atividades_comentarios FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Mensagens Diretas
CREATE POLICY "Users can view their direct messages" ON mensagens_diretas
  FOR SELECT USING (auth.uid() = remetente_id OR auth.uid() = destinatario_id);

CREATE POLICY "Users can send direct messages" ON mensagens_diretas
  FOR INSERT WITH CHECK (auth.uid() = remetente_id);

-- Leituras Digitais
CREATE POLICY "Users can manage their digital readings" ON leituras_digitais
  FOR ALL USING (auth.uid() = usuario_id);

-- 13. Triggers para atualizar timestamps (opcional)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para as tabelas principais
CREATE TRIGGER update_amizades_updated_at BEFORE INSERT ON amizades 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_avaliacoes_updated_at BEFORE INSERT ON avaliacoes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clubes_leitura_updated_at BEFORE INSERT ON clubes_leitura 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clube_mensagens_updated_at BEFORE INSERT ON clube_mensagens 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_atividades_comentarios_updated_at BEFORE INSERT ON atividades_comentarios 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mensagens_diretas_updated_at BEFORE INSERT ON mensagens_diretas 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leituras_digitais_updated_at BEFORE INSERT ON leituras_digitais 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. Inserir dados de teste (opcional)
INSERT INTO clubes_leitura (nome, descricao, criado_por) VALUES 
('Clube de Ficção Científica', 'Para amantes de mundos futuristas e tecnologia', (SELECT id FROM usuarios LIMIT 1)),
('Clube de Romance Histórico', 'Explorando amores através das épocas', (SELECT id FROM usuarios LIMIT 1)),
('Clube de Mistério e Thriller', 'Para quem gosta de suspense e reviravoltas', (SELECT id FROM usuarios LIMIT 1))
ON CONFLICT DO NOTHING;

COMMIT;
