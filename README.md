# Biblioteca API

Sistema para gestão de acervo e empréstimos com backend em Node.js, autenticação JWT e duas interfaces: CLI e Web.

## Como rodar

Configure o `.env` com base no `.env.example`, instale as dependências com `npm install` e inicialize o banco com `npm run setup`. Depois inicie a API com `npm run dev` e escolha a interface com `npm run cli` ou `npm run web`.

## O que o sistema faz

Leitores consultam o acervo e visualizam seu histórico de empréstimos. Bibliotecários têm acesso total: cadastram livros, registram empréstimos e devoluções. Todo empréstimo gera prazo automático de 14 dias. A devolução atualiza o histórico e a disponibilidade do livro em uma operação só. O sistema impede empréstimo de livros já alugados.

## Regras de acesso

Para criar uma conta de bibliotecário pela CLI, use a opção secreta digitando "admin". Leitores só visualizam seus próprios empréstimos. Bibliotecários têm visão geral do sistema.

## Stack

TypeScript, Node.js, Express, Knex e MySQL. Bcrypt para senhas e JWT para autenticação. Readline e ANSI Colors para a interface CLI.

---

Desenvolvido por Luiz Enrique.
