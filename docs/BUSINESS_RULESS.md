# 📋 REGRAS DE NEGÓCIO - SISTEMA DE BIBLIOTECA

> **Como usar este documento:** Estas são as ideias organizadas da nossa reunião sobre como o sistema deve funcionar. Seguimos o fluxo natural de uso: criar conta → fazer login → cadastrar livros → emprestar → devolver → gerenciar.

---

## 🎯 O QUE ESTAMOS CONSTRUINDO?

**A ideia:** Um sistema de biblioteca onde pessoas podem consultar livros e bibliotecários gerenciam empréstimos.

**Quem usa:**
- 👤 **Leitor:** Consulta livros, vê seus empréstimos
- 👨‍💼 **Bibliotecário:** Faz tudo que o leitor faz + cadastra livros + registra empréstimos/devoluções + gerencia usuários

---

## 📝 PASSO 1: CRIAR CONTA

### Como funciona?

Na tela inicial, qualquer pessoa pode criar uma conta.

**Informações necessárias:**
- Nome completo
- Email (único, ninguém pode ter o mesmo)
- Senha (pelo menos 8 caracteres)
- Tipo de conta: Leitor OU Bibliotecário

### Regras importantes:

✅ **Nome:** Pelo menos 3 letras  
✅ **Email:** Tem que ser válido (exemplo@email.com) e único  
✅ **Senha:** Mínimo 8 caracteres, é criptografada antes de salvar  
✅ **Tipo:** Só pode ser "usuario" ou "bibliotecario"  

**O que acontece depois:**
- Sistema cria o usuário
- Já loga automaticamente
- Mostra mensagem: "Cadastro realizado com sucesso!"
- Vai direto pro menu

---

## 🔐 PASSO 2: FAZER LOGIN

### Como funciona?

Pessoa que já tem conta entra com email e senha.

**O que o sistema faz:**
1. Pega o email digitado
2. Procura no banco de dados
3. Compara a senha (ela está criptografada)
4. Se tudo certo: gera um "token" (tipo uma chave de acesso)
5. Mostra: "Login realizado com sucesso!"
6. Mostra qual tipo de usuário você é

### Menus diferentes por tipo:

**LEITOR vê:**
```
👤 João Silva - USUARIO

1. Consultar Livros
2. Meus Empréstimos
0. Sair
```

**BIBLIOTECÁRIO vê:**
```
👨‍💼 Maria Santos - BIBLIOTECARIO

1. Consultar Livros
2. Empréstimos Ativos
3. Registrar Novo Aluguel
4. Devolver Livro
5. Cadastrar Novo Livro
6. Gerenciar Usuários
0. Sair
```

**Diferença:** Bibliotecário tem mais poderes (opções 3, 4, 5, 6).

---

## 📚 PASSO 3: BIBLIOTECÁRIO CADASTRA LIVRO

### Quem faz: Só bibliotecário

**O que preenche:**
- Título do livro (obrigatório)
- Autor (obrigatório)
- Ano de lançamento (obrigatório)
- Gênero (opcional - ex: Ficção, Romance)
- ISBN (opcional - aquele código de barras)

### A mágica da localização automática:

**Ideia:** Quando cadastra o livro, o sistema já diz onde guardar!

Exemplo:
- Cadastrou "1984"
- Sistema fala: "Guarde no Corredor A, Prateleira 3"

**Como funciona por trás:**
- Sistema tem corredores (A, B, C, D...)
- Cada corredor tem prateleiras (1, 2, 3, 4, 5...)
- Sistema escolhe automaticamente (pode ser por ordem, por gênero, aleatório)

### Status inicial: DISPONÍVEL

Todo livro cadastrado começa **disponível** = está na biblioteca, pode emprestar.

**Mensagem de sucesso:**
```
✅ Livro cadastrado com sucesso!
📍 Localização automática: Corredor A - Prateleira 3
```

---

## 🔍 PASSO 4: VERIFICAR SE CADASTROU CERTO

### Quem faz: Qualquer um (leitor ou bibliotecário)

Menu: Opção 1 - Consultar Livros

**O que mostra:**

Tabela com TODOS os livros (disponíveis e alugados):

```
ID | Título       | Autor          | Gênero    | Local | Status
1  | 1984         | George Orwell  | Ficção    | A-3   | 🟢 DISPONÍVEL
2  | Dom Casmurro | Machado Assis  | Romance   | B-1   | 🔴 ALUGADO
3  | O Hobbit     | J.R.R Tolkien  | Fantasia  | A-5   | 🟢 DISPONÍVEL
```

### Entendendo os STATUS:

**🟢 DISPONÍVEL:**
- Livro está na biblioteca
- Pode ser emprestado
- Está fisicamente na prateleira (ex: Corredor A-3)

**🔴 ALUGADO:**
- Livro está com alguém
- NÃO pode emprestar (já foi emprestado)
- Não está na prateleira

**Como muda:**
- Cadastrou → DISPONÍVEL
- Emprestou → ALUGADO
- Devolveu → DISPONÍVEL de novo

---

## 🔄 PASSO 5: TROCAR DE USUÁRIO

### Por que fazer logout?

Para testar como leitor vê diferente do bibliotecário.

**Como funciona:**
1. No menu, escolhe "0. Sair"
2. Sistema limpa a sessão
3. Volta pra tela inicial
4. Pode logar com outro usuário

**Agora vamos logar como leitor...**

---

## 👤 PASSO 6: LEITOR CONSULTA LIVROS

### Quem faz: Leitor (ou qualquer um)

Menu: Opção 1 - Consultar Livros

**O que vê:**
- Mesma lista que bibliotecário viu
- Todos os livros
- Quais estão disponíveis (🟢)
- Onde estão (Corredor-Prateleira)

**Uso na vida real:**

João quer pegar "1984":
1. Consulta no sistema
2. Vê: "1984 - DISPONÍVEL - Corredor A, Prateleira 3"
3. Vai fisicamente até a biblioteca
4. Acha o livro usando a localização
5. Leva pro balcão
6. Bibliotecário registra o empréstimo

**Importante:** Leitor só CONSULTA, não pode cadastrar ou emprestar pelo sistema.

---

## 📋 PASSO 7: BIBLIOTECÁRIO REGISTRA EMPRÉSTIMO

### Quem faz: Só bibliotecário

Menu: Opção 3 - Registrar Novo Aluguel

**Cenário:** João está no balcão com o livro "1984".

### Como funciona:

**1. Sistema mostra livros disponíveis:**
```
ID | Título   | Autor         | Local
1  | 1984     | George Orwell | A-3
3  | O Hobbit | Tolkien       | A-5
```

**2. Bibliotecário escolhe:** ID do livro = 1

**3. Sistema mostra usuários cadastrados:**
```
ID | Nome         | Email           | Tipo
1  | João Silva   | joao@email.com  | 👤 Usuário
2  | Maria Santos | maria@email.com | 👨‍💼 Bibliotecário
```

**4. Bibliotecário escolhe:** ID do usuário = 1

**5. Sistema cria o empréstimo:**
- Registra data de hoje (15/01/2026)
- Calcula prazo: hoje + 14 dias = 29/01/2026
- Marca empréstimo como ATIVO
- Marca livro como ALUGADO

**6. Confirma:**
```
✅ Empréstimo registrado com sucesso!
📅 Prazo de devolução: 29/01/2026
```

### Validações antes de criar:

O sistema confere:
- ✅ Livro existe?
- ✅ Livro está disponível? (não pode emprestar livro já emprestado)
- ✅ Usuário existe?

Se algum der errado: ❌ Mostra erro e não cria.

### O que acontece com o livro:

**Antes:** 1984 - 🟢 DISPONÍVEL  
**Depois:** 1984 - 🔴 ALUGADO

### O prazo:

**Regra fixa:** 14 dias corridos pra devolver

Exemplo:
- Emprestou dia 15/01 → Devolve até 29/01

---

## 🟡 ENTENDENDO STATUS DE EMPRÉSTIMO

### ATIVO (🟡):
- Livro está com o leitor AGORA
- Ainda não devolveu
- Aparece na lista "Empréstimos Ativos"

### DEVOLVIDO (🟢):
- Livro já foi retornado
- Virou histórico
- Não aparece mais em "ativos", só no histórico

**Como muda:**
```
CRIAR EMPRÉSTIMO → ativo
DEVOLVER LIVRO → devolvido
```

---

## 📖 PASSO 8: LEITOR VÊ SEUS EMPRÉSTIMOS

### Quem faz: Leitor (vê só os dele)

Menu: Opção 2 - Meus Empréstimos

**O que João vê:**

```
Livro    | Autor         | Alugado  | Prazo | Status        | Local
1984     | George Orwell | 15/01/26 | 29/01 | 🟡 ATIVO      | A-3
O Hobbit | Tolkien       | 10/01/26 | 24/01 | 🟢 DEVOLVIDO  | A-5
```

**Mostra:**
- Empréstimos ATIVOS (ainda está com ele)
- Empréstimos DEVOLVIDOS (histórico - já devolveu)
- Prazo de cada um
- Onde devolver (localização)

**Importante:** João SÓ vê os empréstimos dele. Não vê de outras pessoas.

---

## 👨‍💼 BIBLIOTECÁRIO VÊ TODOS OS EMPRÉSTIMOS

### Quem faz: Só bibliotecário

Menu: Opção 2 - Empréstimos Ativos

**Diferença:** Bibliotecário vê de TODO MUNDO, não só dele.

**O que mostra:**

```
ID | Usuário    | Livro    | Alugado  | Prazo    | Local
1  | João Silva | 1984     | 15/01/26 | 29/01/26 | A-3
3  | Ana Costa  | O Hobbit | 12/01/26 | 26/01/26 | A-5
```

**Só mostra ATIVOS** (não mostra os já devolvidos).

**Útil para:**
- Saber quem está com quais livros
- Ver quem está perto do prazo
- Controlar empréstimos

---

## ↩️ PASSO 9: BIBLIOTECÁRIO REGISTRA DEVOLUÇÃO

### Quem faz: Só bibliotecário

Menu: Opção 4 - Devolver Livro

**Cenário:** João devolveu o "1984" no balcão.

### Como funciona:

**1. Sistema mostra empréstimos ativos:**
```
ID | Usuário    | Livro    | Prazo | Local
1  | João Silva | 1984     | 29/01 | A-3
3  | Ana Costa  | O Hobbit | 26/01 | A-5
```

**2. Bibliotecário escolhe:** ID = 1

**3. Sistema registra a devolução:**
- Marca empréstimo como DEVOLVIDO
- Registra data/hora da devolução
- Marca livro como DISPONÍVEL

**4. Confirma:**
```
✅ Livro devolvido com sucesso!
```

### O que acontece:

**Empréstimo:**
- Status: ativo → devolvido
- Sai da lista de "ativos"
- Vira histórico

**Livro:**
- Status: alugado → disponível
- Volta pra lista de disponíveis
- Pode ser emprestado de novo

### Ciclo completo:

```
1. Cadastra livro → DISPONÍVEL
2. Empresta → Livro: ALUGADO | Empréstimo: ATIVO
3. Devolve → Livro: DISPONÍVEL | Empréstimo: DEVOLVIDO
4. Pode emprestar de novo (volta pro passo 2)
```

---

## 👥 PASSO 10: GERENCIAR USUÁRIOS

### Quem faz: Só bibliotecário

Menu: Opção 6 - Gerenciar Usuários

### O que pode fazer:

**1. Ver todos os usuários:**
```
ID | Nome         | Email           | Tipo
1  | João Silva   | joao@email.com  | 👤 Usuário
2  | Maria Santos | maria@email.com | 👨‍💼 Bibliotecário
```

**2. Editar usuário:**
- Mudar nome
- Mudar email
- Mudar tipo (promover leitor → bibliotecário)

**Como funciona:**
- Sistema mostra dados atuais
- Pergunta o que quer mudar
- Se deixar em branco = mantém o antigo
- Salva as mudanças

**Exemplo - Promover João:**
```
Dados atuais:
Nome: João Silva
Email: joao@email.com
Tipo: usuario

Novo tipo: 1. Usuário | 2. Bibliotecário
Escolha: 2

✅ Usuário atualizado com sucesso!
```

**3. Excluir usuário:**
- Sistema pede confirmação
- "⚠️ Tem certeza? Esta ação não pode ser desfeita! (s/N)"
- Se confirmar: deleta permanentemente
- Não tem volta

**Atenção:** Esta é uma exclusão real (hard delete), o usuário é removido completamente do banco.

---

## 📊 RESUMO DOS DADOS

### USUÁRIOS

O que guardamos:
- ID (número único)
- Nome
- Email (único)
- Senha (criptografada)
- Tipo (usuario ou bibliotecario)
- Data de criação

---

### LIVROS

O que guardamos:
- ID (número único)
- Título
- Autor
- Ano de lançamento
- Gênero (pode ser vazio)
- ISBN (pode ser vazio)
- Corredor (atribuído automaticamente)
- Prateleira (atribuído automaticamente)
- Status (disponivel ou alugado)
- Data de criação

---

### EMPRÉSTIMOS (ALUGUEIS)

O que guardamos:
- ID (número único)
- ID do livro
- ID do usuário
- Data do empréstimo (quando pegou)
- Data prevista de devolução (prazo)
- Data da devolução (quando devolveu - vazio se ainda ativo)
- Status (ativo ou devolvido)
- Data de criação

---

## 🔒 REGRAS IMPORTANTES

### 1. Integridade Livro-Empréstimo

**A regra:**
- Se livro está DISPONÍVEL → NÃO pode ter empréstimo ativo
- Se livro está ALUGADO → DEVE ter 1 empréstimo ativo

**Por quê?** Evita bagunça:
- ❌ Livro disponível mas com empréstimo ativo
- ❌ Livro alugado mas sem empréstimo ativo
- ❌ Livro com 2 empréstimos ao mesmo tempo

### 2. Validação de Empréstimo

Antes de criar, verificar:
- ✅ Livro existe
- ✅ Livro está disponível
- ✅ Usuário existe
- ✅ Livro não tem empréstimo ativo já

### 3. Devolução Atômica

Quando devolve, SEMPRE faz as 2 coisas juntas:
1. Atualiza empréstimo (devolvido)
2. Atualiza livro (disponível)

Tudo ou nada. Se uma falhar, cancela tudo.

### 4. Email Único

Ao cadastrar/editar:
- Verifica se email já existe
- Se existe E não é do próprio usuário → rejeita

### 5. Prazo Automático

Ao criar empréstimo:
- Pega data de hoje
- Adiciona 14 dias
- Essa é a data prevista de devolução

---

## 🎨 CORES E VISUAL (CLI)

### Status de Livro:
- 🟢 Verde = DISPONÍVEL
- 🔴 Vermelho = ALUGADO

### Status de Empréstimo:
- 🟡 Amarelo = ATIVO
- 🟢 Verde = DEVOLVIDO

### Tipos de Usuário:
- 👤 Ciano = Leitor
- 👨‍💼 Magenta = Bibliotecário

### Mensagens:
- ✅ Verde = Sucesso
- ❌ Vermelho = Erro
- ℹ️ Azul = Informação
- ⚠️ Amarelo = Atenção/Confirmação

---

## 🎯 FLUXO COMPLETO RESUMIDO

**Preparação:**
1. Criar conta de bibliotecário
2. Criar conta de leitor
3. Login como bibliotecário
4. Cadastrar livros

**Operação Normal:**
5. Leitor vai na biblioteca
6. Consulta livros no sistema
7. Acha livro que quer
8. Leva pro balcão
9. Bibliotecário registra empréstimo
10. Sistema atualiza status
11. Leitor leva livro pra casa
12. Leitor consulta "Meus Empréstimos" pra ver prazo
13. Leitor devolve livro no prazo
14. Bibliotecário registra devolução
15. Sistema libera livro
16. Livro fica disponível de novo

**Gestão:**
17. Bibliotecário vê todos empréstimos ativos
18. Bibliotecário gerencia usuários (editar, excluir, promover)

---

## ✅ CHECKLIST DE FUNCIONALIDADES

### O que o sistema FAZ:

**Autenticação:**
- ✅ Cadastrar usuário (leitor ou bibliotecário)
- ✅ Login com email e senha
- ✅ Senhas criptografadas
- ✅ Logout

**Livros:**
- ✅ Cadastrar livro (só bibliotecário)
- ✅ Consultar acervo (todos)
- ✅ Localização automática
- ✅ Status (disponível/alugado)

**Empréstimos:**
- ✅ Registrar empréstimo (só bibliotecário)
- ✅ Ver empréstimos ativos de todos (só bibliotecário)
- ✅ Ver meus empréstimos (leitor vê só os dele)
- ✅ Registrar devolução (só bibliotecário)
- ✅ Histórico permanente
- ✅ Cálculo automático de prazo (14 dias)
- ✅ Status (ativo/devolvido)

**Usuários:**
- ✅ Listar todos usuários (só bibliotecário)
- ✅ Editar usuário (só bibliotecário)
- ✅ Excluir usuário (só bibliotecário)
- ✅ Promover leitor → bibliotecário

**Interface:**
- ✅ Menus diferentes por tipo
- ✅ Cores e emojis
- ✅ Tabelas formatadas
- ✅ Mensagens claras

---

## 🚀 IDEIAS FUTURAS (VERSÃO 2)

Coisas que ficaram pra depois:

- ⏳ Notificação de atraso (se passou do prazo)
- ⏳ Multa por atraso
- ⏳ Renovar empréstimo (prorrogar prazo)
- ⏳ Reservar livro (se estiver alugado)
- ⏳ Busca avançada (por autor, gênero, ano)
- ⏳ Dashboard com gráficos
- ⏳ Relatório: livros mais emprestados
- ⏳ Relatório: leitores mais ativos
- ⏳ Foto da capa do livro
- ⏳ QR Code pra localizar livro
- ⏳ Sistema de favoritos
- ⏳ Recomendações personalizadas
- ⏳ Histórico de leitura do usuário

---

**🎉 FIM DO DOCUMENTO DE REGRAS DE NEGÓCIO**

> Este documento reflete as decisões da nossa reunião de planejamento. Serve como guia para desenvolvimento e referência para toda equipe.