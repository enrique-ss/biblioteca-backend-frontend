# Biblio Verso - Sistema de Biblioteca Premium

Sistema completo para gestão de acervo físico e digital, com backend Node.js, banco de dados Supabase, autenticação JWT e interface web moderna.

## **Projeto Online**

Acesse o sistema em produção: **[https://biblioteca-backend-frontend.onrender.com](https://biblioteca-backend-frontend.com)**

- **Email de acesso**: `admin@admin.com`
- **Senha**: `admin123`

## Autores

- **Enrique** - Desenvolvimento backend e frontend
- **Julia** - Design de interface e experiência do usuário

## Versão Local vs Online

O sistema possui duas versões de operação:

- **Versão Local**: Roda na sua máquina com banco SQLite local. Funciona 100% offline, ideal para desenvolvimento e testes.
- **Versão Online**: Hospedada no Render, conectada ao Supabase. Versão de produção acessível aos usuários.

## Como rodar localmente

1. Instale as dependências
   ```bash
   npm install
   ```

2. Configure o banco de dados local
   ```bash
   npm run setup
   ```

3. Inicie a aplicação
   ```bash
   npm run dev
   ```

4. Acesse
   - `http://localhost:3000`

A versão local usa SQLite e funciona 100% offline, não precisa de Supabase nem internet.

## Scripts

- `npm run setup`: configura o banco de dados SQLite local
- `npm run dev`: inicia o servidor local com SQLite
- `npm start`: inicia o servidor com Supabase (usado pelo Render em produção)

## Deploy no Render

Configure estas variáveis no serviço:

- `NODE_ENV=production`
- `PORT=10000`
- `SUPABASE_URL=<sua-url-do-supabase>`
- `SUPABASE_ANON_KEY=<sua-anon-key>`
- `SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>`
- `CORS_ORIGIN=https://<seu-servico>.onrender.com`

O frontend usa `window.location.origin`, então a mesma build funciona em local e no Render sem trocar URLs no código.

## Observações importantes

- A versão local usa SQLite para o banco de dados e funciona 100% offline.
- A versão online usa Supabase como banco de dados em nuvem.
- O sistema garante um admin padrão no startup usando variáveis de ambiente.
- Não deixe chaves reais no código ou no `.env.example`.
- O arquivo `.env` está no `.gitignore`, então ele pode ser usado apenas para o ambiente local.
