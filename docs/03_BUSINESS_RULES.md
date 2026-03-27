# 📋 Regras de Negócio Core

Este documento sumariza as regras essenciais operacionais do Sistema LuizaTeca.

## 1. Tipos de Contas e Permissões

- **Usuários (Leitores):** Podem visualizar o acervo de livros, verificar seus próprios empréstimos atuais e históricos, editar o próprio perfil e pagar suas próprias multas.
- **Bibliotecários (Administradores):** Possuem todos os privilégios dos usuários padrão *mais*: a capacidade de gerenciar o catálogo de livros e exemplares, registrar empréstimos e devoluções para todos os usuários, aplicar ou abonar multas, gerenciar (editar/bloquear/cadastrar) outros usuários e acessar estatísticas detalhadas do sistema.

## 2. Empréstimos e Devoluções

- **Empréstimo (Aluguel):**
  - O sistema vincula um aluguel a um **Exemplar Físico Específico** de um livro.
  - Para realizar o empréstimo, a `condicao` e a `disponibilidade` do exemplar precisam ser aptas (não-perdido, disponível).
  - O usuário não pode realizar novos empréstimos se estiver **bloqueado** ou se possuir **multas pendentes**.
  - O prazo de devolução padrão é de **14 dias corridos**.
  - É permitido realizar até **2 renovações** por empréstimo, cada uma estendendo o prazo em mais 14 dias.

- **Devoluções:**
  - Ao registrar a devolução, o bibliotecário deve informar o estado físico do exemplar (`bom`, `danificado` ou `perdido`).
  - Se o estado for `perdido`, o exemplar é removido do inventário disponível e uma multa fixa de **R$ 100,00** é gerada.
  - Se o estado for `danificado`, a condição do exemplar é atualizada, mas ele permanece no acervo.

## 3. Sistema Financeiro / Multas

- **Multas por Atraso:** Calculadas automaticamente na devolução se passar da `data_prevista_devolucao`. O valor é de **R$ 1,00 por dia de atraso**.
- **Multas por Perda:** Valor fixo de **R$ 100,00** aplicado quando um exemplar é marcado como perdido na devolução.
- **Bloqueio Automático:** Qualquer multa pendente impede o usuário de realizar novos empréstimos até a quitação total do débito.

## 4. Exemplares e Multiplicidade
- O `livro` atua como um agrupador (título, autor, etc.), enquanto a tabela `exemplares` representa os itens físicos reais.
- Cada exemplar possui um código individual, permitindo o controle preciso de qual cópia está com qual usuário e em que estado ela se encontra.
