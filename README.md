# Biblio Verso - Sistema de Biblioteca Premium

Sistema completo para gestao de acervo fisico e digital, com backend Node.js, autenticacao Supabase e interface web unica.

## Como rodar localmente

1. Configure as variaveis de ambiente
   - Copie `.env.example` para `.env`
   - Preencha `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
   - Em local, use `CORS_ORIGIN=http://localhost:3000`

2. Configure o banco no Supabase
   - Execute o SQL do arquivo `setup.sql` no SQL Editor
   - Crie os usuarios necessarios no Supabase Auth
   - Garanta que o usuario administrador tenha `tipo=bibliotecario`

3. Instale as dependencias
   ```bash
   npm install
   ```

4. Inicie a aplicacao
   ```bash
   npm run dev
   ```

   Ou, se preferir manter o comando antigo:
   ```bash
   npm run full
   ```

5. Acesse
   - App completa: `http://localhost:3000`

## Scripts

- `npm run dev`: inicia o servidor local
- `npm run full`: mesmo comportamento do `dev`, mantido por compatibilidade
- `npm run setup`: checa se o ambiente local esta pronto

## Deploy no Render

Configure estas variaveis no servico:

- `NODE_ENV=production`
- `PORT=10000`
- `SUPABASE_URL=<sua-url-do-supabase>`
- `SUPABASE_ANON_KEY=<sua-anon-key>`
- `SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>`
- `CORS_ORIGIN=https://<seu-servico>.onrender.com`

O frontend usa `window.location.origin`, entao a mesma build funciona em local e no Render sem trocar URLs no codigo.

## Observacoes importantes

- O backend agora exige configuracao explicita do Supabase.
- O sistema garante um admin padrao no startup usando `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD` e `DEFAULT_ADMIN_NAME`.
- Se o admin padrao nao existir no Supabase Auth, ele sera criado automaticamente e sincronizado com a tabela `usuarios`.
- Nao deixe chaves reais no codigo ou no `.env.example`.
- O arquivo `.env` esta no `.gitignore`, entao ele pode ser usado apenas para o ambiente local.
