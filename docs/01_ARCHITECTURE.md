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
O "Cérebro" do sistema. É responsável por **toda a lógica de negócio**, cálculos matemáticos, totalizações de relatórios, processamento de multas e validações de segurança. Nenhuma lógica de decisão ou cálculo complexo deve residir fora deste componente.

### 2.2 Aplicação Web (Frontend Premium)
A interface de usuário web. Além de capturar entradas e renderizar dados, o frontend gerencia uma experiência enriquecida com suporte a temas dinâmicos (Dark/Light) e **visualização de acervo digital (Streaming de PDF)** através de cartões interativos.

### 2.3 Acervo Digital & PDF Hub
Módulo especializado que gerencia arquivos digitais recebidos. Bibliotecários atuam como curadores, aprovando ou rejeitando submissões de usuários. O sistema armazena referências e thumbnails (capas) em Base64 para garantir que o acervo seja visualmente rico sem depender de storage externo complexo na fase inicial.

### 2.4 Interface de Linha de Comando (CLI)
A interface de terminal. Assim como a versão Web, é um cliente **"burro"** que consome os mesmos endpoints da API e apenas formata a saída para o console. Permite operações administrativas rápidas e manutenção de sistema.

## 3. Princípio do Frontend Burro (Dumb Frontend)

Para garantir consistência absoluta entre a interface **Web** e o **CLI**, o projeto segue rigorosamente o modelo de **Frontend Burro**:

1.  **Cálculos no Backend**: Médias, porcentagens, somas de faturamento e filtros complexos são realizados via SQL ou lógica em TypeScript no servidor.
2.  **Dados Prontos para Exibição**: A API deve retornar objetos com os valores já formatados ou calculados (ex: `kpis: [{ label: "Taxa", valor: "15%" }]`).
3.  **Sincronia Total**: Como a lógica está centralizada no Backend, qualquer alteração em uma regra de negócio reflete instantaneamente e de forma idêntica tanto no navegador quanto no terminal.

## 4. Diretórios
...

- `/src`: Código-fonte do Backend (TypeScript)
    - `/src/controllers`: Lógica de rotas e processamento de requests e regras de negócio base.
    - `/src/routes`: Definição de endpoints.
    - `/src/middlewares`: Autenticação e Rate Limiting.
- `/public`: Frontend Web estático (HTML, `/css`, `/js`)
- `/docs`: Documentação organizada do projeto.

---
*Esta arquitetura permite que clientes diferentes (Web e CLI) compartilhem completamente as mesmas regras de negócio.*
