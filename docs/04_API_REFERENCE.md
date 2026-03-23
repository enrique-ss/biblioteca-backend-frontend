# 🌐 Referência da API (Endpoints)

A API REST do LuizaTeca obedece ao formato JSON para comunicação e respostas. A maioria das rotas corporativas requer um cabeçalho `Authorization: Bearer <TOKEN>` válido para o consumo adequado.

## 🔑 Autenticação (`/api/auth`)
- `POST /api/auth/registrar`: Inscreve um perfil normativo de `usuario`. O campo _admin_ na linha de comando é uma flag oculta que habilita a geração de um perfil `bibliotecario`.
- `POST /api/auth/login`: Ponto de entrada padrão emitindo o Token JWT e um payload com o perfil respectivo do usuário.
- `PUT /api/auth/perfil`: Atualiza credenciais logadas próprias.

## 📚 Livros (`/api/livros`)
- `GET /api/livros`: (Público) Busca títulos e exemplares no acervo por string ou traz todos.
- `POST /api/livros`: (Bibliotecário) Adiciona um agrupador genérico `Livro`, exigindo obrigatoriamente um quantitativo de _exemplares_. 
- `PUT /api/livros/:id`: (Bibliotecário) Altera propriedades do título.
- `DELETE /api/livros/:id`: (Bibliotecário) Apaga o título do catálogo (e em cascata seus exemplares).

## 📖 Exemplares (`/api/livros/:livroId/exemplares`)
- `GET /api/livros/:livroId/exemplares`: Extrai informações exclusivas de cópias de um catálogo base (ID, Condição, Disponível, Status de Perda).
- `PATCH /api/livros/:livroId/exemplares/:exemplarId`: (Bibliotecário) Muda manualmente o estado ou nota de um exemplar (ex: rasgou-se de forma avulsa).

## 👥 Usuários (`/api/usuarios`)
- `GET /api/usuarios`: (Bibliotecário) Retorna a lista total do ecossistema de usuários.
- `PUT /api/usuarios/:id`: (Bibliotecário) Força alteração nos modais e tipo sistêmico de uma conta.
- `DELETE /api/usuarios/:id`: (Bibliotecário) Destrói registro de conta no sistema.

## 📋 Aluguéis / Empréstimos (`/api/alugueis`)
- `GET /api/alugueis/todos`: (Bibliotecário) Busca todos os em andamento na biblioteca inteira.
- `GET /api/alugueis/meus`: Lista comitivas de empréstimo pessoais vinculadas ao token atual.
- `GET /api/alugueis/atrasados`: (Bibliotecário) Listagem específica cruzando status com _data_prevista_devolucao_ estourada.
- `GET /api/alugueis/historico`: (Bibliotecário) Tabela consolidando operações velhas de devolução e perdas com filtro opcional.
- `POST /api/alugueis`: (Bibliotecário) Geração de termo em que um leitor arremenda um exemplar e deduz do acervo em `1`.
- `PUT /api/alugueis/:id/devolver`: (Bibliotecário) Ponto crasso que reintegra a cópia, reavalia sua `condicao` e caso "perdido", autua o usuário com uma propina (`multa`).
- `PUT /api/alugueis/:id/renovar`: Requer +14 dias de acréscimo de tempo ao relógio de entrega; capado num certo volume.

## 💸 Faturamento / Multas (`/api/alugueis/multas`)
- `GET /api/alugueis/multas/minhas`: Extrato visualizável de multas por infrações do proprietário autenticado.
- `GET /api/alugueis/multas/:usuario_id`: (Bibliotecário) Consulta minuciosa na carteira autuada daquele ID de cliente e mostra o painel.
- `PUT /api/alugueis/multas/:usuario_id/pagar`: (Bibliotecário) Operação que absolve (`paga`) uma soma penal consolidada do sistema pela base do usuário, o religando pro serviço.

## 📊 Estatísticas (`/api/stats`)
- `GET /api/stats`: Apura dashboards inteiros, métricas cruzadas, e quantitativo gráfico.

## 🎮 Quiz (`/api/quiz`)
- `GET /api/quiz/progresso`: Retira o perfil de Game do usador validado.
- (E outras rotas de atualização interna do Quiz literário).
