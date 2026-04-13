# Deployment no Render + Supabase

Este guia explica como fazer o deploy do Biblio Verso no Render com banco de dados PostgreSQL no Supabase.

## Pré-requisitos

- Conta no Render (https://render.com)
- Conta no Supabase (https://supabase.com) - plano gratuito
- Repositório no GitHub com o código do projeto
- Git instalado na máquina local

## Passo a Passo

### 1. Criar projeto no Supabase

1. Acesse https://supabase.com
2. Clique em "New Project"
3. Preencha:
   - **Name**: biblio-verso
   - **Database Password**: escolha uma senha forte (anote-a!)
   - **Region**: escolha a mais próxima (ex: South America East)
4. Clique em "Create new project"
5. Aguarde o projeto ser criado (pode levar alguns minutos)

### 2. Pegar credenciais do Supabase

1. No projeto criado, vá para "Settings" → "Database"
2. Copie as informações:
   - **Host**: algo como `db.xxx.supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: a senha que você definiu

### 3. Commitar o código no GitHub

```bash
git add .
git commit -m "Convertendo para PostgreSQL/Supabase"
git push
```

### 4. Criar serviço no Render

1. Acesse https://dashboard.render.com
2. Clique em "New +" → "New Web Service"
3. Conecte seu repositório do GitHub
4. Render detectará automaticamente o arquivo `render.yaml`
5. Clique em "Create Web Service"

### 5. Configurar variáveis de ambiente no Render

1. No serviço criado, vá para "Environment"
2. Adicione as seguintes variáveis:

```
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua-senha-do-supabase
DB_NAME=postgres
JWT_SECRET=qualquer-string-longa-e-segura
CORS_ORIGIN=https://biblioteca-backend-frontend.onrender.com
NODE_ENV=production
```

3. Clique em "Save Changes"
4. O serviço será re-deploy automaticamente

### 6. Setup automático do banco de dados

O setup do banco de dados é executado **automaticamente** quando o servidor inicia pela primeira vez.

O sistema irá:
- Criar as tabelas se não existirem (modo seguro para produção)
- Criar usuários padrão (admin@admin e user@user)

**Usuários padrão criados automaticamente:**
- **Admin**: admin@admin | senha: admin123
- **User**: user@user | senha: user123

⚠️ **Importante**: Após o primeiro login, altere as senhas dos usuários padrão por segurança.

### 7. Acessar a aplicação

Após o deploy completo, acesse:

- **Backend + Frontend**: `https://biblioteca-backend-frontend.onrender.com`

O frontend é servido pelo próprio backend Express.

## Troubleshooting

### Erro de conexão com banco de dados

Verifique se:
- As variáveis de ambiente estão configuradas corretamente no Render
- O projeto Supabase está "Active"
- As credenciais (host, senha) estão corretas

### Erro de CORS

Verifique se:
- A variável `CORS_ORIGIN` está configurada com a URL correta
- O frontend está acessando a URL correta da API

### Logs

Para ver os logs do backend:
1. Vá para o serviço no Render
2. Clique na aba "Logs"
3. Verifique se há erros ou avisos

## Atualizações

Para atualizar a aplicação após fazer mudanças:

```bash
git add .
git commit -m "Descrição das mudanças"
git push
```

O Render detectará automaticamente as mudanças e fará um novo deploy.
