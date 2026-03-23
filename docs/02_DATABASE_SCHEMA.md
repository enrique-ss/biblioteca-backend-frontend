# 🗄️ Esquema de Banco de Dados

O banco de dados relacional (MySQL) está estruturado com as tabelas principais conectadas através de Foreign Keys, garantindo a integridade dos dados e transações.

## Tabelas e Relacionamentos

### 1. `usuarios`
Dedicada ao armazenamento de quem acessa o sistema.
- **Campos:** `id`, `nome`, `email` (único), `senha` (hash bcrypt), `tipo` (ENUM: 'usuario', 'bibliotecario'), `multa_pendente`, `bloqueado`, `motivo_bloqueio`, `created_at`.
- **Relacionamentos:** 1 Usuário para N Aluguéis / Multas / Quiz.

### 2. `livros`
Informação metadada de uma obra.
- **Campos:** `id`, `titulo`, `autor`, `ano_lancamento`, `genero`, `isbn`, `corredor`, `prateleira`, `exemplares` (total), `exemplares_disponiveis`, `status` (ENUM: 'disponivel', 'alugado').

### 3. `exemplares`
O objeto físico do livro, permitindo gerenciar múltiplas cópias do mesmo título.
- **Campos:** `id`, `livro_id` (FK), `codigo` , `disponibilidade` (ENUM: 'disponivel', 'emprestado', 'indisponivel', 'perdido'), `condicao` (ENUM: 'bom', 'danificado', 'perdido'), `observacao`.

### 4. `alugueis`
O registro de concessão de um exemplar a um usuário.
- **Campos:** `id`, `livro_id` (FK), `exemplar_id` (FK), `usuario_id` (FK), `data_aluguel`, `data_prevista_devolucao` (14 dias), `data_devolucao` (nullable), `status` (ENUM: 'ativo', 'devolvido'), `estado_devolucao`, `renovacoes`.

### 5. `multas`
Geradas quando há atraso na devolução ou perda/dano permanente.
- **Campos:** `id`, `aluguel_id` (FK), `usuario_id` (FK), `tipo` (ENUM: 'atraso', 'perda'), `valor`, `dias_atraso`, `status` (ENUM: 'pendente', 'paga'), `pago_em`.

### 6. `quiz_progresso`
Elementos de Gamificação ("Quiz Literário").
- **Campos:** `id`, `usuario_id` (FK exclusivo/único), `xp`, `level`, `hp`, `completed_lessons`.

## Principais Índices
Para melhoria de desempenho, há índices definidos nas tabelas para buscas constantes, tais como:
- `idx_livros_status`, `idx_livros_titulo`, `idx_exemplares_condicao`, `idx_alugueis_prazo`.
