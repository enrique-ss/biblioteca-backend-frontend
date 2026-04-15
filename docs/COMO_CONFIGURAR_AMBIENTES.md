# Como Configurar Ambientes - Offline vs Online

## Para que serve cada arquivo?

### `.env.example`
- **Template**: Exemplo de como configurar as variáveis
- **Seguro**: Pode ser commitado no GitHub (não contém dados reais)
- **Referência**: Mostra quais variáveis são necessárias

### `.env`
- **Dados reais**: Contém suas credenciais e configurações reais
- **Seguro**: NUNCA commitar no GitHub (está no .gitignore)
- **Local**: Apenas para desenvolvimento offline na sua máquina

---

## Como Rodar OFFLINE (Desenvolvimento Local)

### Passos:
1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Configurar ambiente local**:
   - Copie `.env.example` para `.env`
   - Mantenha `APP_MODE=offline`
   - Configure `DEFAULT_ADMIN_EMAIL` e `DEFAULT_ADMIN_PASSWORD`

3. **Criar banco de dados**:
   ```bash
   npm run setup
   ```

4. **Iniciar servidor**:
   ```bash
   npm run dev
   ```

5. **Acessar**: http://localhost:3000

**Resultado**: Usa SQLite local, funciona 100% offline

---

## Como Rodar ONLINE (Produção no Render)

### Passos:
1. **Fazer deploy do código** no GitHub
2. **Configurar variáveis no Render**:
   - Acesse https://dashboard.render.com
   - Selecione o serviço
   - Vá em "Environment"
   - Adicione as variáveis (ver lista abaixo)

3. **Variáveis obrigatórias para ONLINE**:
   ```
   NODE_ENV=production
   PORT=10000
   APP_MODE=online
   SUPABASE_URL=https://SEU_PROJETO.supabase.co
   SUPABASE_ANON_KEY=SUA_CHAVE_ANON
   SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE
   CORS_ORIGIN=https://SEU_SERVICO.onrender.com
   JWT_SECRET=chave-secreta-producao
   ```

4. **Salvar e aguardar deploy automático**

**Resultado**: Usa Supabase, dados persistem na nuvem

---

## Tabela Comparativa

| Característica | Offline (Local) | Online (Render) |
|----------------|-----------------|-----------------|
| **Banco de dados** | SQLite local | Supabase nuvem |
| **Modo APP_MODE** | `offline` | `online` |
| **Configuração** | Arquivo `.env` local | Painel do Render |
| **Persistência** | Apenas na máquina | Na nuvem |
| **Acesso** | http://localhost:3000 | https://servico.onrender.com |
| **Desenvolvimento** | Sim | Não |
| **Produção** | Não | Sim |

---

## Regras Importantes

### Para Desenvolvedores:
- **JAMAIS** commitar o arquivo `.env`
- **SEMPRE** usar `.env.example` como referência
- **NUNCA** compartilhar credenciais reais

### Para Deploy:
- **SEMPRE** configurar variáveis no painel do serviço
- **NUNCA** depender de arquivo `.env` em produção
- **SEMPRE** usar `APP_MODE=online` para produção

---

## Troubleshooting

### "Erro UNIQUE constraint failed":
- **Causa**: Sistema em modo offline tentando usar SQLite
- **Solução**: Verifique se `APP_MODE=online` no Render

### "Usuario ja existe":
- **Causa**: Sistema ainda em modo offline
- **Solução**: Configure variáveis do Supabase corretamente

### "Conexão recusada":
- **Causa**: Variáveis do Supabase incorretas
- **Solução**: Verifique URL e chaves no painel do Render
