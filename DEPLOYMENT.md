# Deployment no Render

Este guia explica como fazer o deploy do Biblio Verso no Render.

## Pré-requisitos

- Conta no Render (https://render.com)
- Repositório no GitHub com o código do projeto
- Git instalado na máquina local

## Passo a Passo

### 1. Commitar o código no GitHub

```bash
git add .
git commit -m "Preparando para deployment no Render"
git push
```

### 2. Criar novo projeto no Render

1. Acesse https://dashboard.render.com
2. Clique em "New +" → "New Web Service"
3. Conecte seu repositório do GitHub
4. Render detectará automaticamente o arquivo `render.yaml`

### 3. Configuração automática via render.yaml

O arquivo `render.yaml` já configura automaticamente:

- **Backend API**: Serviço Node.js com Express
- **Banco de Dados**: MySQL (plano gratuito)
- **Frontend**: Site estático com arquivos da pasta `public/`

### 4. Variáveis de ambiente

As variáveis de ambiente são configuradas automaticamente pelo `render.yaml`:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Conexão com MySQL
- `JWT_SECRET`: Chave secreta para autenticação (gerada automaticamente)
- `CORS_ORIGIN`: URL do frontend para CORS
- `NODE_ENV`: Ambiente de produção
- `PORT`: Porta do servidor (3000)

### 5. Setup automático do banco de dados

O setup do banco de dados é executado **automaticamente** quando o servidor inicia pela primeira vez. Não é necessário acesso ao shell.

O sistema irá:
- Criar o banco de dados se não existir
- Criar todas as tabelas necessárias
- Criar usuários padrão (admin@admin e user@user)
- Verificar se as tabelas já existem antes de criar (modo seguro para produção)

**Usuários padrão criados automaticamente:**
- **Admin**: admin@admin | senha: admin123
- **User**: user@user | senha: user123

⚠️ **Importante**: Após o primeiro login, altere as senhas dos usuários padrão por segurança.

### 6. Acessar a aplicação

Após o deploy completo, você poderá acessar:

- **Backend**: `https://biblio-verso-api.onrender.com`
- **Frontend**: `https://biblio-verso.onrender.com`

## URLs após deployment

Substitua as URLs nos arquivos JavaScript do frontend:

No arquivo `public/js/core.js` e outros arquivos JS, substitua:
```javascript
const API_URL = 'http://localhost:3000';
```
por:
```javascript
const API_URL = 'https://biblio-verso-api.onrender.com';
```

## Troubleshooting

### Erro de conexão com banco de dados

Verifique se:
- O serviço MySQL está rodando
- As variáveis de ambiente estão corretas
- O setup do banco foi executado

### Erro de CORS

Verifique se:
- A variável `CORS_ORIGIN` está configurada com a URL correta do frontend
- O frontend está acessando a URL correta da API

### Logs

Para ver os logs do backend:
1. Vá para o serviço do backend no Render
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
