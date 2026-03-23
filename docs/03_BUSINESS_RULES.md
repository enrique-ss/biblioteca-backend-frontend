# 📋 Regras de Negócio Core

Este documento sumariza as regras essenciais operacionais do Sistema LuizaTeca.

## 1. Tipos de Contas e Permissões

- **Usuários (Leitores):** Podem visualizar o acervo de livros, verificar seus próprios empréstimos atuais e históricos, editar próprio perfil, acompanhar sistema de recompensas literárias (Quiz).
- **Bibliotecários (Administradores):** Possuem todos os privilégios dos usuários padrão *mais*: a capacidade de gerenciar o catálogo de livros, alugar e baixar livros para todos os usuários, aplicar ou abonar multas, gerenciar (editar/bloquear/cadastrar) outros usuários e acessar estatísticas globais do sistema.

## 2. Empréstimos e Devoluções

- **Empréstimo (Aluguel):**
  - O sistema vincula um aluguel a um **Exemplar Físico Específico** de um livro. Não se empresta o "título" de forma abstrata, empresta-se uma cópia exata do inventário.
  - Para realizar o empréstimo, a `condicao` e a `disponibilidade` do exemplar necessitam ser aptas (não-perdido, disponível).
  - O prazo de devolução por padrão é automático: **14 dias consecutivos**.
  - O limite de renovações suportadas por aluguel se dá baseada nas próprias lógicas dos controllers (se aplica um fator de 2 vezes, configurável).

- **Devoluções:**
  - O bibliotecário, ao registrar a devolução de um exemplar, obrigatoriamente relata o estado físico do livro no retorno.
  - Se o estado registrado for `perdido`, o sistema automaticamente remove o exemplar do pool da biblioteca e gera uma multa de **R$ 100,00** para a conta do usuário que extraviou o livro.
  - Se o estado registrado for `danificado`, a condição física atualiza com ressalvas, mas a cópia pode continuar transitando.

## 3. Sistema Financeiro / Multas

- **Multas por Atraso:** Se a devolução se der além da `data_prevista_devolucao` estabelecida, o sistema computa o custo excedente que o usuário assume como infração.
- **Multas por Perda:** São cobranças estáticas (fee fixo) quando se aplica devolução de tipo que declara a destruição/desaparecimento ou roubo de um exemplar da obra.
- Um usuário pode ser bloqueado pelo Bibliotecário em casos de grande nível de multas pendentes não pagas, impedindo novas tomadas emprestadas.

## 4. Exemplares e Multiplicidade
- Em vez de ter um item no banco que pode ser "Alugado/Disponível", agora nós seccionamos: um `livro` atua como metaclasse, enquanto a tabela `exemplares` representa de fato os objetos nas estantes.
- Com isso, a biblioteca suporta o armazenamento de "Vários Harry Potter simultâneos", cada qual com seu código identificador particular e condição (preservado ou capa torta).
