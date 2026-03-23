# 🏛️ Arquitetura do Sistema

O **LuizaTeca** é um sistema de gerenciamento de biblioteca estruturado em múltiplos componentes, usando uma arquitetura baseada em APIs RESTful.

## 1. Stack Tecnológica

- **Backend:** Node.js, Express, TypeScript
- **Banco de Dados:** MySQL 8+ usando Query Builder Knex.js
- **Autenticação:** JSON Web Tokens (JWT) e bcryptjs para hash de senhas
- **Frontend (Web):** HTML5, CSS3, JavaScript Vanilla (Modularizado em múltiplos arquivos)
- **Frontend (CLI):** TypeScript e Axios interativo no terminal (CLI)

## 2. Componentes Principais

### 2.1 API Rest (Backend)
O servidor principal que expõe os endpoints para consumo. Responsável por aplicar as regras de negócio, persistir dados no MySQL e garantir a segurança através de middlewares de autenticação (JWT) e rate-limiting.

### 2.2 Aplicação Web (Frontend Vanilla)
A interface de usuário web, encontrada sob o diretório `public/`. Não necessita de frameworks pesados de compilação; utiliza chamadas JavaScript assíncronas simples (Fetch/Axios) e atualiza o DOM (Document Object Model) de forma dinâmica a partir da página principal `index.html`.

### 2.3 Interface de Linha de Comando (CLI)
Um sistema operado em terminal (`src/cli.ts`), fornecendo uma experiência rica em bash com tabelas formatadas e cores, desenhada para administradores ou usuários que preferem trabalhar via terminal de console. O CLI se comunica diretamente com a API Rest, tal como o Frontend Web.

## 3. Diretórios

- `/src`: Código-fonte do Backend (TypeScript)
    - `/src/controllers`: Lógica de rotas e processamento de requests e regras de negócio base.
    - `/src/routes`: Definição de endpoints.
    - `/src/middlewares`: Autenticação e Rate Limiting.
- `/public`: Frontend Web estático (HTML, `/css`, `/js`)
- `/docs`: Documentação organizada do projeto.

---
*Esta arquitetura permite que clientes diferentes (Web e CLI) compartilhem completamente as mesmas regras de negócio.*
