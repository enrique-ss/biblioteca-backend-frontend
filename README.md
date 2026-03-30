# LuizaTeca — Sistema de Biblioteca Premium

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

## 🛠 Stack

- **Backend**: TypeScript, Node.js, Express, Knex.js e MySQL.
- **Frontend Web**: JavaScript Vanilla, CSS Moderno (Glassmorphism), GSAP e Three.js para fundos dinâmicos.
- **Frontend CLI**: TypeScript e Inquirer para navegação interativa.

---

Desenvolvido por **Luiz Enrique**.
