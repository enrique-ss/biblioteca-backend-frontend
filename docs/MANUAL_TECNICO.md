# 🛠️ Manual Técnico Definitivo: LuizaTeca (FAQ & Arquitetura)

Este documento foi desenhado para responder a qualquer pergunta sobre o projeto, focando no **"Por que?"** e no **"Como?"** de cada decisão técnica.

---

## 🏗️ 1. Arquitetura "Thin Client" (Frontend Burro)

**Por que?**
Evitar inconsistências. Se o cálculo de multas estivesse no JavaScript do site, um erro de arredondamento poderia dar um valor no Web e outro no terminal (CLI). Ao centralizar tudo no Backend, garantimos uma "única fonte da verdade".

**Como?**
O site e o terminal não "pensam", eles apenas perguntam ao servidor: `GET /api/alugueis/multas/minhas`. O servidor faz a conta no banco e responde o valor pronto.

---

## 📦 2. Guia de Dependências (O que e Por que?)

| Biblioteca | Por que usamos? | Como ela ajuda? |
| :--- | :--- | :--- |
| **Express** | O motor do servidor. | Gerencia as rotas e os pedidos que chegam do site e do CLI. |
| **CORS** | Segurança do Navegador. | Permite que o site (porta 8080) converse com o servidor (porta 3000). |
| **BcryptJS** | Segurança de Senhas. | Transforma senhas em códigos (hashes). Se o banco for invadido, as senhas estão seguras. |
| **JWT** | Prova de Identidade. | Gera um "token" (crachá digital). O site guarda isso para provar quem você é em cada clique. |
| **Knex.js** | Query Builder. | Traduz nosso código JS para SQL, tornando as buscas no banco mais rápidas de escrever e manter. |
| **MySQL2** | Driver do Banco. | É a "ponte" física entre o nosso código e o banco de dados MySQL. |
| **Axios** | Cliente HTTP (CLI). | Permite que o terminal faça os pedidos para o servidor, assim como o navegador faz. |

---

## 🗄️ 3. Banco de Dados e Soft Delete

**Por que usar "Soft Delete" (Não apagar nada)?**
Num sistema financeiro ou de biblioteca, apagar um registro é um erro grave. Se você apagar um livro, como saberá quem o alugou há um ano? O **Soft Delete** mantém a história viva para auditorias.

**Como?**
Usamos uma coluna chamada `deleted_at`. Quando você clica em "Excluir", o sistema preenche essa data. O livro "some" do site (porque só mostramos quem tem `deleted_at` vazio), mas continua no banco para relatórios passados.

---

## 🔄 4. Fragment Loading (Modularização Web)

**Por que não um index.html gigante?**
Um arquivo de 5 mil linhas é impossível de ler e manter. Modularizar permite que o desenvolvedor trabalhe em uma tela específica sem quebrar o resto do site.

**Como?**
O `index.html` é apenas um "esqueleto". O `core.js` usa a função `loadPartials()` para buscar o HTML de `screens.html` e `modals.html` via requisição assíncrona e "injetar" as telas dentro do site.

---

## 🛡️ 5. Segurança: JWT vs Sessão Comum

**Por que JWT?**
Sessões comuns pesam no servidor. O JWT é **Stateless** (sem estado). O servidor não precisa "lembrar" que você está logado; você mostra o seu token em cada pedido e o servidor apenas o valida matematicamente.

**Como?**
Ao logar, o backend gera uma string criptografada com seu ID e seu cargo (`bibliotecario` ou `usuario`). O frontend envia essa string no cabeçalho `Authorization: Bearer <token>`.

---

## 📋 6. Regras de Negócio (Lógica Interna)

**Por que o prazo de 14 dias?**
É o padrão acadêmico para rotatividade de estoque.
**Como o sistema bloqueia o usuário?**
Toda vez que o usuário tenta um empréstimo, o `RentController` verifica no banco: `count(multas) > 0`. Se for verdadeiro, o sistema trava o processo e retorna um erro 400.

---

## 🔍 7. Perguntas Frequentes de Apresentação (FAQ)

1.  **O sistema aguenta muitos usuários?** Sim, o uso de MySQL com Pool de Conexões (`mysql2`) permite gerenciar centenas de acessos simultâneos sem travar.
2.  **E se o servidor cair?** O Frontend acusará "Erro de Conexão", mas como os dados estão no banco MySQL, nada é perdido ao reiniciar o serviço.
3.  **Qual o ponto mais inovador?** A sincronia total entre Web e CLI. Você pode gerenciar a biblioteca de qualquer lugar, seja por uma interface visual rica ou por um terminal ágil.
