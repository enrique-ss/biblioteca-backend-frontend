# 🗄️ Esquema de Banco de Dados

O banco de dados relacional (MySQL) está estruturado com as tabelas principais conectadas através de Foreign Keys, garantindo a integridade dos dados e transações.

## Tabelas e Relacionamentos

### 1. `usuarios`
Dedicada ao armazenamento de quem acessa o sistema.
- **Campos:** `id`, `nome`, `email` (único), `senha` (hash bcrypt), `tipo` (ENUM: 'usuario', 'bibliotecario'), `multa_pendente` (boolean), `bloqueado` (boolean), `motivo_bloqueio` (text), `created_at`.
- **Relacionamentos:** 1 Usuário para N Aluguéis / Multas.

### 2. `livros`
Informação metadada de uma obra física.
- **Campos:** `id`, `titulo`, `autor`, `ano_lancamento`, `genero`, `isbn`, `corredor`, `prateleira`, `capa_url` (longtext/base64), `exemplares` (total), `exemplares_disponiveis`, `status`, `deleted_at`, `created_at`.

### 3. `exemplares`
O objeto físico do livro, permitindo gerenciar múltiplas cópias do mesmo título.
- **Campos:** `id`, `livro_id` (FK), `codigo`, `disponibilidade` (ENUM: 'disponivel', 'emprestado', 'indisponivel', 'perdido'), `condicao` (ENUM: 'bom', 'danificado', 'perdido'), `observacao`, `created_at`.

### 4. `acervo_digital`
Gestão de documentos e livros virtuais (PDFs).
- **Campos:** `id`, `titulo`, `autor`, `categoria`, `ano`, `paginas`, `tamanho_arquivo`, `url_arquivo` (longtext/base64), `capa_url` (longtext/base64), `status` (ENUM: 'pendente', 'aprovado'), `usuario_id` (FK), `created_at`.

### 5. `alugueis`
O registro de concessão de um exemplar a um usuário.
- **Campos:** `id`, `livro_id` (FK), `exemplar_id` (FK), `usuario_id` (FK), `data_aluguel`, `data_prevista_devolucao` (14 dias), `data_devolucao` (nullable), `status`, `estado_devolucao`, `renovacoes`, `created_at`.

### 6. `multas`
Geradas quando há atraso na devolução ou perda permanente.
- **Campos:** `id`, `aluguel_id` (FK), `usuario_id` (FK), `tipo` (ENUM: 'atraso', 'perda'), `valor`, `dias_atraso`, `status`, `pago_em`, `created_at`.

## Principais Índices
Para melhoria de desempenho, há índices definidos nas tabelas para buscas constantes, tais como:
- `idx_livros_status`, `idx_livros_titulo`, `idx_livros_autor`, `idx_exemplares_livro_disp`, `idx_alugueis_prazo`, `idx_multas_usuario_status`.
