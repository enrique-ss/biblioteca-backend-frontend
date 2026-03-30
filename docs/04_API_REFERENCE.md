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

## 🎥 Acervo Digital (`/api/acervo-digital`)
- **GET /api/acervo-digital**: Lista PDFs aprovados com filtros de busca e paginação.
- **POST /api/acervo-digital**: Envia um novo PDF (Base64) e metadados.
- **GET /api/acervo-digital/pendentes**: (Bibliotecário) Lista submissões aguardando curadoria.
- **POST /api/acervo-digital/:id/aprovar**: (Bibliotecário) Aprova ou rejeita um documento (via body {acao: 'aprovar'|'rejeitar'}).
- **DELETE /api/acervo-digital/:id**: (Bibliotecário) Remove logicamente um documento do acervo.

## 👥 Usuários (`/api/usuarios`)
- `GET /api/usuarios`: (Bibliotecário) Lista todos os usuários.
- `PUT /api/usuarios/:id`: (Bibliotecário) Atualiza dados básicos do usuário.
- `POST /api/usuarios/:id/bloquear`: (Bibliotecário) Bloqueia acesso do usuário por infração.
- `POST /api/usuarios/:id/desbloquear`: (Bibliotecário) Reabilita acesso do usuário.
- `DELETE /api/usuarios/:id`: (Bibliotecário) Arquiva uma conta do sistema (Soft Delete).

## 📋 Aluguéis / Empréstimos (`/api/alugueis`)
- `GET /api/alugueis/todos`: (Bibliotecário) Lista todos os empréstimos ativos.
- `GET /api/alugueis/meus`: Lista os empréstimos do usuário logado.
- `GET /api/alugueis/atrasados`: (Bibliotecário) Lista apenas empréstimos com prazo vencido.
- `GET /api/alugueis/historico`: (Bibliotecário) Histórico completo de devoluções.
- `POST /api/alugueis`: (Bibliotecário) Registra um novo empréstimo.
- `PUT /api/alugueis/:id/devolver`: (Bibliotecário) Registra a devolução e processa multas.
- `PUT /api/alugueis/:id/renovar`: Estende o prazo em +14 dias.

## 📊 Estatísticas (`/api/stats`)
- `GET /api/stats`: Resumo simplificado de KPIS.
- `GET /api/stats/detalhado`: (Bibliotecário) Relatório completo com arrays de objetos formatados (ex: `{ label, valor }`) prontos para renderização.
