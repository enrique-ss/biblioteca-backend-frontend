# Biblio Verso — Sistema de Biblioteca Premium

Sistema completo para gestão de acervo físico e **digital**, com arquitetura moderna em Node.js, autenticação protegida e interfaces de alto desempenho (Web e CLI).

## 🚀 Como rodar

Configure o `.env` com base no `.env.example`, instale as dependências com `npm install` e inicialize o banco com `npm run setup`.

**Opções de execução:**
- `npm run dev` - Inicia apenas a API Backend (Porta 3000)
- `npm run web` - Inicia apenas o Frontend Web (Porta 8080)
- `npm run full` - **[Recomendado]** Inicia o ecossistema completo simultaneamente
- `npm run cli` - Interface interativa via Terminal

## ✨ O que o sistema faz

- **Acervo Híbrido**: Gestão de livros físicos (com controle de exemplares e localização) e livros digitais (streaming de PDFs com capas personalizadas).
- **Autoatendimento**: Leitores consultam acervo, renovam empréstimos online e quitam multas via interface web.
- **Gestão Administrativa**: Bibliotecários controlam estoque, processam devoluções com avaliação de estado físico e gerenciam bloqueios de usuários.
- **Ecossistema Inteligente**: Cálculo automático de multas (R$ 1,00/dia), prazos de 14 dias e centro de notificações unificado para pendências críticas.
- **Experiência Premium**: Interface Web com Glassmorphism, suporte nativo a Dark/Light mode e micro-animações GSAP.

## 🔑 Regras de acesso

- **Administrador**: Use a opção secreta "admin" na criação de conta via CLI para privilégios de Bibliotecário.
- **Segurança**: Autenticação via JWT com senhas criptografadas em Bcrypt.


## 🛠️ Arquitetura e Engenharia

O projeto foi construído utilizando práticas modernas de desenvolvimento:

- **Frontend Web**: SPA (Single Page Application), Vanilla JS, CSS3 (Mobile First), GSAP, Three.js, MutationObserver.
- **Backend API**: Node.js, Express, Knex.js, MySQL, RESTful (Headless), Stateless, Middlewares.
- **Segurança**: JWT (Authentication), Bcrypt (Hashing), RBAC (Access Control).
- **Consistência**: ACID, Transactions, Relational Modeling (1:N), Soft/Hard Deletes.
- **Lógica**: Async/Await, Promise.all(), Date Math, Regex, Gamificação via Server-side algorithms.

---

Desenvolvido por **Luiz Enrique**.
