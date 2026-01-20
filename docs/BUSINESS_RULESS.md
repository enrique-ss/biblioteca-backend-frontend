# 📋 REGRAS DE NEGÓCIO - SISTEMA DE BIBLIOTECA

> **Como usar este documento:** Estas são as regras de negócio atualizadas do sistema, refletindo a implementação real da CLI. Seguimos o fluxo natural de uso: criar conta → fazer login → cadastrar livros → emprestar → devolver → gerenciar.

---

## 🎯 O QUE ESTAMOS CONSTRUINDO?

**A ideia:** Um sistema de biblioteca onde pessoas podem consultar livros e bibliotecários gerenciam empréstimos.

**Quem usa:**
- 👤 **Leitor (usuario):** Consulta livros, vê seus empréstimos
- 👨‍💼 **Bibliotecário:** Faz tudo que o leitor faz + cadastra livros + registra empréstimos/devoluções

---

## 📝 PASSO 1: CRIAR CONTA

### Como funciona?

Na tela inicial, há duas formas de criar conta:

**Opção 2 - Cadastro Normal:**
- Cria conta de **leitor (tipo: usuario)**
- Preenche: nome, email, senha

**Opção Secreta - "admin":**
- Cria conta de **bibliotecário**
- Preenche: nome, email, senha
- Sistema automaticamente define tipo como "bibliotecario"

### Informações necessárias:

- Nome completo
- Email (único, ninguém pode ter o mesmo)
- Senha (pelo menos 8 caracteres)
- Tipo de conta: automaticamente definido conforme opção escolhida

### Regras importantes:

✅ **Nome:** Campo obrigatório  
✅ **Email:** Tem que ser válido e único  
✅ **Senha:** Mínimo 8 caracteres, é criptografada antes de salvar  
✅ **Tipo:** "usuario" (opção 2) ou "bibliotecario" (opção admin)

**O que acontece depois:**
- Sistema cria o usuário
- Retorna token de autenticação
- Já loga automaticamente
- Vai direto pro menu principal

---

## 🔐 PASSO 2: FAZER LOGIN

### Como funciona?

**Opção 1 - Login:**
- Pessoa que já tem conta entra com email e senha

**O que o sistema faz:**
1. Pega o email e senha digitados
2. Procura no banco de dados
3. Compara a senha (ela está criptografada)
4. Se tudo certo: gera um "token" (tipo uma chave de acesso)
5. Carrega dados do usuário
6. Mostra menu personalizado

### Menus diferentes por tipo:

**LEITOR vê:**
```
👤 JOÃO SILVA (usuario)
─────────────────────────────────────────
1 📚  Consultar Acervo
2 📋  Meus Empréstimos
0 🚪  Sair
```

**BIBLIOTECÁRIO vê:**
```
👨‍💼 MARIA SANTOS (bibliotecario)
─────────────────────────────────────────
1 📚  Consultar Acervo
2 📋  Empréstimos Ativos
3 ➕  Novo Aluguel
4 ↩️  Devolver Livro
5 ➕  Cadastrar Livro
0 🚪  Sair
```

**Diferença:** Bibliotecário tem mais poderes (opções 3, 4, 5).

**Nota:** A opção de "Gerenciar Usuários" foi removida da versão atual.

---

## 📚 PASSO 3: BIBLIOTECÁRIO CADASTRA LIVRO

### Quem faz: Só bibliotecário

**Opção 5 - Cadastrar Livro**

**O que preenche:**
- Título do livro (obrigatório)
- Autor (obrigatório)
- Ano de lançamento (obrigatório)
- Gênero (obrigatório - ex: Ficção, Romance)

### Localização e status:

**Ideia original modificada:**
- Na versão atual, a localização automática (corredor/prateleira) **não está implementada**
- O livro é cadastrado com as informações básicas
- Status inicial: **disponível**

### O que acontece:

**Mensagem de sucesso:**
```
✅ Livro cadastrado com sucesso!
```

O sistema retorna ao menu principal após cadastro.

---

## 🔍 PASSO 4: CONSULTAR ACERVO

### Quem faz: Qualquer um (leitor ou bibliotecário)

**Opção 1 - Consultar Acervo**

**O que mostra:**

Tabela com TODOS os livros cadastrados:

```javascript
console.table(livros) // Exibe tabela formatada
```

**Colunas visíveis:**
- ID
- Título
- Autor
- Ano de lançamento
- Gênero
- Status (disponível/alugado)

### Entendendo os STATUS:

**DISPONÍVEL:**
- Livro está na biblioteca
- Pode ser emprestado
- Livre para novo aluguel

**ALUGADO:**
- Livro está com alguém
- NÃO pode emprestar (já foi emprestado)
- Precisa ser devolvido antes

**Como muda:**
- Cadastrou → disponível
- Emprestou → alugado
- Devolveu → disponível de novo

---

## 🔄 PASSO 5: SAIR (LOGOUT)

### Como funciona:

**Opção 0 - Sair**

1. No menu, escolhe "0. Sair"
2. Sistema limpa token e dados do usuário
3. Volta pra tela inicial
4. Pode logar com outro usuário ou criar nova conta

**Importante:** Logout é limpo e seguro, remove autenticação completamente.

---

## 📋 PASSO 6: VER EMPRÉSTIMOS

### 👤 LEITOR - Meus Empréstimos

**Opção 2 - Meus Empréstimos**

Endpoint: `GET /alugueis/meus`

**O que mostra:**
- Apenas empréstimos do usuário logado
- Empréstimos ATIVOS e DEVOLVIDOS
- Dados completos de cada empréstimo

**Colunas da tabela:**
```javascript
console.table(emprestimos)
```

### 👨‍💼 BIBLIOTECÁRIO - Empréstimos Ativos

**Opção 2 - Empréstimos Ativos**

Endpoint: `GET /alugueis/todos`

**O que mostra:**
- Empréstimos de TODOS os usuários
- Apenas empréstimos ATIVOS (não mostra devolvidos)
- Útil para controle geral da biblioteca

**Diferença chave:**
- Leitor: vê só os dele (ativos + devolvidos)
- Bibliotecário: vê todos (só ativos)

---

## 📝 PASSO 7: BIBLIOTECÁRIO REGISTRA EMPRÉSTIMO

### Quem faz: Só bibliotecário

**Opção 3 - Novo Aluguel**

**Cenário:** João está no balcão querendo pegar um livro.

### Como funciona:

**1. Bibliotecário informa:**
- ID do livro
- ID do usuário

**2. Sistema valida:**
- ✅ Livro existe?
- ✅ Livro está disponível?
- ✅ Usuário existe?

**3. Se tudo OK, sistema cria:**
- Registra data de empréstimo (hoje)
- Calcula data prevista (hoje + 14 dias)
- Status: **ativo**
- Atualiza livro para: **alugado**

**4. Confirma:**
```
✅ Empréstimo registrado com sucesso!
```

### Dados do empréstimo:

```javascript
{
  livro_id: number,
  usuario_id: number,
  data_emprestimo: Date, // Automático
  data_prevista_devolucao: Date, // +14 dias
  status: 'ativo'
}
```

### Validações obrigatórias:

❌ **Não pode:**
- Emprestar livro que não existe
- Emprestar livro já alugado
- Emprestar para usuário que não existe
- Criar empréstimo duplicado

✅ **Pode:**
- Emprestar livro disponível
- Mesmo usuário pode ter múltiplos empréstimos (de livros diferentes)

---

## 🟡 ENTENDENDO STATUS DE EMPRÉSTIMO

### ATIVO (status: 'ativo'):
- Livro está com o leitor AGORA
- Ainda não devolveu
- Aparece na lista "Empréstimos Ativos" (bibliotecário)
- Aparece em "Meus Empréstimos" (leitor)

### DEVOLVIDO (status: 'devolvido'):
- Livro já foi retornado
- Possui data_devolucao preenchida
- Virou histórico
- Não aparece mais em "Empréstimos Ativos"
- Aparece em "Meus Empréstimos" como histórico

**Como muda:**
```
CRIAR EMPRÉSTIMO → ativo
DEVOLVER LIVRO → devolvido
```

---

## ↩️ PASSO 8: BIBLIOTECÁRIO REGISTRA DEVOLUÇÃO

### Quem faz: Só bibliotecário

**Opção 4 - Devolver Livro**

**Cenário:** João devolveu o livro no balcão.

### Como funciona:

**1. Bibliotecário informa:**
- ID do aluguel

**2. Sistema executa:**
- Valida se aluguel existe e está ativo
- Atualiza status do aluguel para: **devolvido**
- Registra data_devolucao (agora)
- Atualiza livro para: **disponível**

**3. Confirma:**
```
✅ Livro devolvido com sucesso!
```

### Operação atômica:

**SEMPRE faz as 2 coisas juntas:**
1. Atualiza empréstimo → devolvido
2. Atualiza livro → disponível

Se uma falhar, nenhuma acontece (rollback).

### Ciclo completo de um livro:

```
1. Cadastra livro → disponível
2. Empresta → livro: alugado | empréstimo: ativo
3. Devolve → livro: disponível | empréstimo: devolvido
4. Pode emprestar de novo (volta pro passo 2)
```

---

## 📊 ESTRUTURA DE DADOS

### USUÁRIOS

```typescript
interface Usuario {
  id: number;
  nome: string;
  email: string; // único
  senha: string; // criptografada (bcrypt)
  tipo: 'usuario' | 'bibliotecario';
  created_at: Date;
}
```

**Regras:**
- Email deve ser único
- Senha tem hash com bcrypt
- Tipo define permissões no sistema

---

### LIVROS

```typescript
interface Livro {
  id: number;
  titulo: string;
  autor: string;
  ano_lancamento: number;
  genero: string;
  status: 'disponivel' | 'alugado';
  created_at: Date;
}
```

**Notas:**
- Status é atualizado automaticamente pelos empréstimos
- Campos corredor/prateleira não estão implementados
- ISBN não está implementado

---

### EMPRÉSTIMOS (ALUGUEIS)

```typescript
interface Aluguel {
  id: number;
  livro_id: number;
  usuario_id: number;
  data_emprestimo: Date;
  data_prevista_devolucao: Date; // +14 dias
  data_devolucao: Date | null; // null se ativo
  status: 'ativo' | 'devolvido';
  created_at: Date;
}
```

**Regras:**
- data_emprestimo: gerada automaticamente (now)
- data_prevista_devolucao: automática (+14 dias)
- data_devolucao: null enquanto ativo, preenchida na devolução
- status: controla o ciclo de vida

---

## 🔒 REGRAS DE INTEGRIDADE

### 1. Sincronização Livro-Empréstimo

**A regra fundamental:**
```
Se livro.status = 'disponivel' → NÃO pode ter aluguel ativo
Se livro.status = 'alugado' → DEVE ter exatamente 1 aluguel ativo
```

**Implementação:**
- Ao criar empréstimo: livro vira "alugado"
- Ao devolver: livro volta "disponível"
- Validação antes de emprestar: livro DEVE estar disponível

### 2. Validação de Empréstimo

Antes de criar, verificar:
```javascript
✅ Livro existe (livro_id válido)
✅ Livro está disponível (status = 'disponivel')
✅ Usuário existe (usuario_id válido)
```

Se qualquer validação falhar → retorna erro, não cria.

### 3. Devolução Atômica

```javascript
// Transação: tudo ou nada
UPDATE alugueis SET status = 'devolvido', data_devolucao = NOW()
UPDATE livros SET status = 'disponivel'
```

Ambas operações acontecem juntas. Se uma falhar, rollback.

### 4. Email Único

```javascript
// Ao registrar
SELECT * FROM usuarios WHERE email = ?
IF exists → erro: "Email já cadastrado"
```

### 5. Prazo Automático

```javascript
data_prevista_devolucao = data_emprestimo + 14 dias
```

Sempre 14 dias corridos a partir da data do empréstimo.

---

## 🎨 INTERFACE E EXPERIÊNCIA

### Sistema de Cores (CLI)

```typescript
const cores = {
  vermelho: '\x1b[31m',  // Erros
  verde: '\x1b[32m',     // Sucessos
  amarelo: '\x1b[33m',   // Opções/avisos
  azul: '\x1b[34m',      // Informações
  magenta: '\x1b[35m',   // Bibliotecário
  ciano: '\x1b[36m',     // Leitor/títulos
};
```

### Emojis Utilizados:

- 📚 Livros/acervo
- 👤 Usuário/leitor
- 👨‍💼 Bibliotecário/admin
- 📋 Empréstimos/aluguéis
- ✅ Sucesso
- ❌ Erro
- ➕ Adicionar/novo
- ↩️ Voltar/devolver
- 🚪 Sair
- 📅 Calendário/datas
- 🔐 Login
- ✍️ Cadastro
- 📧 Email
- 🔒 Senha

### Formatação de Dados:

```javascript
console.table(dados) // Tabelas formatadas
console.clear()      // Limpar tela entre menus
```

**Princípios:**
- Interface limpa e organizada
- Feedback visual claro (cores + emojis)
- Validação de opções antes de processar
- Mensagens de erro descritivas

---

## 🔐 AUTENTICAÇÃO E AUTORIZAÇÃO

### JWT (JSON Web Token)

**Como funciona:**
1. Login/Registro → API gera token
2. Token armazenado na variável `token`
3. Todas requisições subsequentes incluem token no header
4. API valida token em cada requisição

```javascript
api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Permissões por Tipo:

**Usuario (leitor):**
- ✅ Consultar acervo
- ✅ Ver próprios empréstimos
- ❌ Cadastrar livros
- ❌ Registrar empréstimos
- ❌ Devolver livros

**Bibliotecario:**
- ✅ Tudo que usuário pode
- ✅ Cadastrar livros
- ✅ Registrar empréstimos
- ✅ Devolver livros
- ✅ Ver todos empréstimos ativos

**Validação:** Backend valida permissões em cada endpoint protegido.

---

## 🎯 FLUXO COMPLETO RESUMIDO

### Setup Inicial:
1. Criar conta bibliotecário (opção "admin")
2. Criar conta leitor (opção "2")
3. Login como bibliotecário
4. Cadastrar livros (opção "5")

### Operação Normal:
5. Logout (opção "0")
6. Login como leitor (opção "1")
7. Consultar acervo (opção "1") - ver livros disponíveis
8. Logout
9. Login como bibliotecário
10. Registrar empréstimo (opção "3") - informar ID livro + ID usuário
11. Sistema atualiza status automaticamente
12. Consultar empréstimos ativos (opção "2") - ver quem está com o quê
13. Quando livro retornar: devolver (opção "4") - informar ID aluguel
14. Sistema libera livro (volta disponível)
15. Livro pode ser emprestado novamente

### Validações em cada passo:
- ✅ Autenticação válida
- ✅ Permissões adequadas
- ✅ Dados corretos
- ✅ Estados consistentes

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### Autenticação:
- ✅ Cadastrar usuário (tipo usuario ou bibliotecario)
- ✅ Login com email e senha
- ✅ Senhas criptografadas (bcrypt)
- ✅ JWT para sessões
- ✅ Logout limpo
- ✅ Interceptor automático para incluir token

### Livros:
- ✅ Cadastrar livro (só bibliotecário)
- ✅ Consultar acervo completo (todos)
- ✅ Status automático (disponível/alugado)
- ❌ Localização automática (não implementado)
- ❌ ISBN (não implementado)

### Empréstimos:
- ✅ Registrar empréstimo (só bibliotecário)
- ✅ Ver empréstimos ativos de todos (só bibliotecário)
- ✅ Ver meus empréstimos - ativos e histórico (leitor)
- ✅ Registrar devolução (só bibliotecário)
- ✅ Histórico permanente
- ✅ Cálculo automático de prazo (14 dias)
- ✅ Status (ativo/devolvido)
- ✅ Sincronização status livro-empréstimo

### Interface:
- ✅ Banner ASCII art
- ✅ Menus diferentes por tipo de usuário
- ✅ Cores e emojis consistentes
- ✅ Tabelas formatadas (console.table)
- ✅ Validação de opções
- ✅ Mensagens claras de sucesso/erro
- ✅ Limpeza de tela entre ações

---

## ❌ FUNCIONALIDADES REMOVIDAS/NÃO IMPLEMENTADAS

### Removido da versão atual:
- ❌ Gerenciar usuários (listar, editar, excluir)
- ❌ Localização automática (corredor/prateleira)
- ❌ Campo ISBN

### Planejado para futuro:
- ⏳ Notificação de atraso
- ⏳ Multa por atraso
- ⏳ Renovar empréstimo
- ⏳ Reservar livro
- ⏳ Busca avançada
- ⏳ Dashboard com métricas
- ⏳ Relatórios
- ⏳ QR Code

---

## 🔄 DIFERENÇAS: PLANEJADO vs IMPLEMENTADO

### O que mudou:

| Funcionalidade     | Planejado          | Implementado |
| Gerenciar usuários | ✅ Sim             | ❌ Não |
| Localização livros | ✅ Automática      | ❌ Não |
| ISBN               | ✅ Sim             | ❌ Não |
| Gênero             | ✅ Opcional        | ✅ Obrigatório |
| Cadastro admin     | Via menu           | Via código "admin" |
| Ver empréstimos (leitor) | Só ativos    | Ativos + histórico |
| Ver empréstimos (biblio) | Todos        | Só ativos |

### Por que mudou:

- **Gerenciar usuários:** Complexidade removida para MVP
- **Localização:** Feature adiada para v2
- **ISBN:** Campo não essencial removido
- **Gênero obrigatório:** Simplificação do cadastro
- **Código "admin":** Atalho para facilitar testes

---

## 🚀 PRÓXIMOS PASSOS (v2.0)

### Prioridade Alta:
1. Reativar gerenciamento de usuários
2. Implementar localização automática
3. Adicionar busca por filtros
4. Sistema de notificações de atraso

### Prioridade Média:
5. Renovação de empréstimos
6. Reserva de livros
7. Relatórios básicos
8. Dashboard

### Prioridade Baixa:
9. Multas automáticas
10. Recomendações
11. QR Code
12. Upload de capas

---

## 📝 NOTAS TÉCNICAS

### Endpoints da API:

```
POST   /api/auth/registrar
POST   /api/auth/login

GET    /api/livros
POST   /api/livros

GET    /api/alugueis/todos      (só bibliotecário)
GET    /api/alugueis/meus       (usuário autenticado)
POST   /api/alugueis
PUT    /api/alugueis/:id/devolver
```

### Variáveis de Ambiente:

```env
DATABASE_URL=
JWT_SECRET=
PORT=3000
```

### Stack Tecnológica:

- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Auth:** JWT + bcrypt
- **CLI:** readline + axios
- **Interface:** ANSI colors + emojis

---

**🎉 FIM DO DOCUMENTO ATUALIZADO**

> Este documento reflete a **implementação real** do sistema. Última atualização: baseado no código CLI fornecido.

**Changelog:**
- ✅ Adicionadas seções sobre fluxo de autenticação
- ✅ Documentado código "admin" para criar bibliotecário
- ✅ Atualizado comportamento de consulta de empréstimos
- ✅ Removidas referências a funcionalidades não implementadas
- ✅ Adicionada seção "Diferenças: Planejado vs Implementado"
- ✅ Detalhado sistema de cores e emojis
- ✅ Documentados endpoints reais da API