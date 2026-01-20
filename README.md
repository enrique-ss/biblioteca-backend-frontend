# 📚 Sistema de Biblioteca API (CLI & Web)

Sistema para gestão de acervo e empréstimos, com backend em Node.js, autenticação JWT e suporte a múltiplos perfis de acesso.

---

## 🎯 Funcionalidades Principais

* **🔒 Autenticação Segura:** Registro e login com senhas criptografadas (**bcrypt**) e sessões via JWT.
* **👥 Perfis de Acesso:**
    * **Leitor (usuario):** Consulta o acervo e visualiza seu histórico de empréstimos.
    * **Bibliotecário (admin):** Gestão total (cadastrar livros, registrar empréstimos e devoluções).
* **📖 Gestão de Acervo:** Cadastro de livros com status automático (**disponível/alugado**).
* **🔄 Ciclo de Empréstimo:** Registro de saídas com prazo de 14 dias e devoluções atômicas (atualiza livro e empréstimo simultaneamente).



---

## 🚀 Quick Start

### Pré-requisitos
* Node.js (v18 ou superior)
* MySQL Server em execução

### Instalação e Configuração
1.  **Ambiente:** Crie um arquivo `.env` na raiz do projeto seguindo o `.env.example`.
2.  **Dependências:** (Instala Express, Bcrypt, Prisma, etc.)
    ```bash
    npm install
    ```
3.  **Banco de Dados:** (Atenção: este comando recria as tabelas e apaga dados antigos)
    ```bash
    npm run setup
    ```

### Execução
1.  **Inicie a API (Servidor):**
    ```bash
    npm run dev
    ```
2.  **Escolha sua Interface:**
    * **Interface CLI:** `npm run cli`
    * **Interface Web:** `npm run web`

---

## 🛠️ Arquitetura do Projeto

* **routes/**: Definição dos endpoints HTTP (Auth, Livros, Aluguéis).
* **controllers/**: Lógica da aplicação e regras de negócio.
* **middlewares/**: Autenticação JWT e proteção de rotas por tipo de usuário.
* **database/**: Configuração e scripts de conexão via Knex/MySQL.
* **cli/**: Interface de linha de comando interativa.
* **web/**: Interface para navegadores.

---

## 📝 Regras de Negócio Implementadas

* **Cadastro Admin:** Para criar uma conta de bibliotecário na CLI, utilize a opção secreta digitando **"admin"**.
* **Validação de Status:** O sistema impede o empréstimo de livros que já estejam com status `alugado`.
* **Prazos Automáticos:** Todo empréstimo gera uma data de devolução prevista para **14 dias** corridos.
* **Operação Atômica:** A devolução garante que o histórico de aluguel e a disponibilidade do livro sejam atualizados em conjunto.
* **Privacidade:** Leitores visualizam apenas seus próprios empréstimos, enquanto bibliotecários têm visão geral do sistema.

---

## 🛠️ Stack Tecnológica

* **Backend:** Node.js, Express, TypeScript.
* **ORM/Query Builder:** Knex / MySQL2.
* **Segurança:** Bcrypt (Hashing de Senhas), JWT (Autenticação).
* **Interface:** Axios, Readline (CLI), ANSI Colors.

---

**Desenvolvido como um MVP para gestão eficiente de bibliotecas.**