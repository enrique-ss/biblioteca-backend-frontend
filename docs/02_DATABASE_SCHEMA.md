# 🗄️ Esquema de Banco de Dados

O banco de dados relacional (MySQL) está estruturado com as tabelas principais conectadas através de Foreign Keys, garantindo a integridade dos dados e transações.

## Tabelas e Relacionamentos

### 1. `usuarios`
Dedicada ao armazenamento de quem acessa o sistema.
- **Campos:** `id`, `nome`, `email` (único), `senha` (hash bcrypt), `tipo` (ENUM: 'usuario', 'bibliotecario'), `multa_pendente` (boolean), `bloqueado` (boolean), `motivo_bloqueio` (text), `created_at`.
- **Relacionamentos:** 1 Usuário para N Aluguéis / Multas.

### 2. `livros`
Informação metadada de uma obra.
- **Campos:** `id`, `titulo`, `autor`, `ano_lancamento`, `genero`, `isbn`, `corredor`, `prateleira`, `exemplares` (total), `exemplares_disponiveis`, `status` (ENUM: 'disponivel', 'alugado'), `deleted_at`, `created_at`.

### 3. `exemplares`
O objeto físico do livro, permitindo gerenciar múltiplas cópias do mesmo título.
- **Campos:** `id`, `livro_id` (FK), `codigo`, `disponibilidade` (ENUM: 'disponivel', 'emprestado', 'indisponivel', 'perdido'), `condicao` (ENUM: 'bom', 'danificado', 'perdido'), `observacao`, `created_at`.

### 4. `alugueis`
O registro de concessão de um exemplar a um usuário.
- **Campos:** `id`, `livro_id` (FK), `exemplar_id` (FK), `usuario_id` (FK), `data_aluguel`, `data_prevista_devolucao` (14 dias), `data_devolucao` (nullable), `status` (ENUM: 'ativo', 'devolvido'), `estado_devolucao` (ENUM: 'bom', 'danificado', 'perdido'), `renovacoes` (max 2), `created_at`.

### 5. `multas`
Geradas quando há atraso na devolução ou perda permanente.
- **Campos:** `id`, `aluguel_id` (FK), `usuario_id` (FK), `tipo` (ENUM: 'atraso', 'perda'), `valor`, `dias_atraso`, `status` (ENUM: 'pendente', 'paga'), `pago_em`, `created_at`.

## Principais Índices
Para melhoria de desempenho, há índices definidos nas tabelas para buscas constantes, tais como:
- `idx_livros_status`, `idx_livros_titulo`, `idx_livros_autor`, `idx_exemplares_livro_disp`, `idx_alugueis_prazo`, `idx_multas_usuario_status`.
