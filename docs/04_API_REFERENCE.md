# 🌐 Referência da API (Endpoints)

A API REST do LuizaTeca obedece ao formato JSON para comunicação e respostas. A maioria das rotas requer um cabeçalho `Authorization: Bearer <TOKEN>` válido.

## 🔑 Autenticação (`/api/auth`)
- `POST /api/auth/registrar`: Inscreve um perfil de `usuario`.
- `POST /api/auth/login`: Ponto de entrada padrão emitindo o Token JWT.
- `GET /api/auth/perfil`: Retorna os dados do perfil do usuário autenticado.
- `PUT /api/auth/perfil`: Atualiza credenciais do próprio usuário.

## 📚 Livros (`/api/livros`)
- `GET /api/livros`: (Público) Lista todos os livros ou busca por termo.
- `POST /api/livros`: (Bibliotecário) Cadastra um novo livro e seus exemplares iniciais.
- `PUT /api/livros/:id`: (Bibliotecário) Edita informações de um título.
- `DELETE /api/livros/:id`: (Bibliotecário) Remove logicamente um livro (soft delete).
- `GET /api/livros/:id/exemplares`: (Bibliotecário) Lista as cópias físicas de um livro.
- `PATCH /api/livros/:id/exemplares/:exemplar_id`: (Bibliotecário) Atualiza o estado/disponibilidade de um exemplar.

## 👥 Usuários (`/api/usuarios`)
- `GET /api/usuarios`: (Bibliotecário) Lista todos os usuários.
- `GET /api/usuarios/:id`: (Bibliotecário) Detalhes de um usuário específico.
- `PUT /api/usuarios/:id`: (Bibliotecário) Atualiza dados ou bloqueia um usuário.
- `DELETE /api/usuarios/:id`: (Bibliotecário) Remove uma conta do sistema.

## 📋 Aluguéis / Empréstimos (`/api/alugueis`)
- `GET /api/alugueis/todos`: (Bibliotecário) Lista todos os empréstimos ativos.
- `GET /api/alugueis/meus`: Lista os empréstimos do usuário logado.
- `GET /api/alugueis/atrasados`: (Bibliotecário) Lista apenas empréstimos com prazo vencido. **Retorna `total_faturamento_pendente` pré-calculado.**
- `GET /api/alugueis/historico`: (Bibliotecário) Histórico completo de devoluções.
- `POST /api/alugueis`: (Bibliotecário) Registra um novo empréstimo.
- `PUT /api/alugueis/:id/devolver`: (Bibliotecário) Registra a devolução e processa multas.
- `PUT /api/alugueis/:id/renovar`: Estende o prazo em +14 dias (limite de 2 vezes).

## 💸 Multas (`/api/alugueis/multas`)
- `GET /api/alugueis/multas/minhas`: Lista multas do próprio usuário.
- `PUT /api/alugueis/multas/pagar/mim`: Permite o auto-pagamento das multas pendentes.
- `GET /api/alugueis/multas/:usuario_id`: (Bibliotecário) Consulta multas de um usuário específico.
- `PUT /api/alugueis/multas/:usuario_id/pagar`: (Bibliotecário) Registra o pagamento das multas de um usuário.

## 📊 Estatísticas (`/api/stats`)
- `GET /api/stats`: Resumo simplificado (KPIS rápidos) para a Dashboard inicial.
- `GET /api/stats/detalhado`: (Bibliotecário) Relatório completo. Retorna um objeto `kpis` contendo uma lista de objetos `{ label, valor }` já formatados (com %, dias, totais) para serem renderizados sem cálculos no frontend.
