# 🛠️ Manual Técnico Completo: LuizaTeca

Este documento é a especificação técnica definitiva do ecossistema LuizaTeca. Ele consolida arquitetura, banco de dados, regras de negócio e referências de API para desenvolvedores e mantenedores.

---

## 🏛️ 1. Arquitetura do Sistema

O LuizaTeca segue o padrão **Thin Client (Cliente Magro)** com uma separação rigorosa entre a interface e o processamento de dados.

### 1.1 Stack Tecnológica
- **Backend:** Node.js, Express, TypeScript.
- **Banco de Dados:** SQLite (com Query Builder Knex.js).
- **Autenticação:** JSON Web Tokens (JWT) com validade indefinida (sessão persistente) e bcryptjs para senhas.
- **Frontend Web:** HTML5, CSS3 nativo, JavaScript Vanilla (Modular).
- **Frontend CLI:** TypeScript/Node.js com Axios.

### 1.2 Fragment Loading & Modularização (Web)
Para evitar o crescimento de um "monolito HTML", o sistema utiliza o carregamento de fragmentos assíncronos:
1.  O `index.html` carrega como um shell vazio.
2.  O `core.js` busca `screens.html` e `modals.html` via `fetch`.
3.  O conteúdo é injetado no DOM dentro de `#mainApp`.
4.  Event listeners são vinculados via funções `setup...()` (ex: `setupLivrosForms`).

---

## 🗄️ 2. Estrutura de Banco de Dados (Schema)

O banco é relacional e robusto, com chaves estrangeiras que impedem a desordem dos dados.

### 2.1 Principais Tabelas:
- **`usuarios`**: `id`, `nome`, `email` (unique), `senha`, `tipo` (ENUM: 'usuario', 'bibliotecario'), `bloqueado` (boolean), `multa_pendente` (boolean).
- **`livros`**: `id`, `titulo`, `autor`, `genero`, `ano_lancamento`, `corredor`, `prateleira`, `exemplares` (total), `exemplares_disponiveis`, `capa_url` (LongText), `deleted_at`.
- **`exemplares`**: `id`, `livro_id` (FK), `codigo`, `disponibilidade` ('disponivel', 'emprestado', 'indisponivel', 'perdido'), `condicao` ('bom', 'danificado', 'perdido'), `observacao`.
- **`acervo_digital`**: `id`, `titulo`, `autor`, `categoria`, `url_arquivo` (Base64), `paginas`, `status` ('pendente', 'aprovado').
- **`alugueis`**: `id`, `livro_id` (FK), `exemplar_id` (FK), `usuario_id` (FK), `data_aluguel`, `data_prevista_devolucao` (D+14), `status` ('ativo', 'finalizado', 'atrasado').
- **`multas`**: `id`, `aluguel_id` (FK), `usuario_id` (FK), `valor`, `status` ('pendente', 'pago').

---

## 📋 3. Regras de Negócio Core

### 3.1 Empréstimos e Circulação
- **Prazos**: 14 dias para devolução.
- **Renovações**: Permitidas até 2 vezes, desde que o livro não esteja atrasado.
- **Condição no Recebimento**: O bibliotecário deve avaliar o exemplar na devolução.
    - `danificado` -> O exemplar ganha uma observação, mas continua circulando.
    - `perdido` -> Gera automaticamente uma multa de **R$ 100,00** e remove o exemplar do estoque.

### 3.2 Financeiro e Bloqueios
- **Multa por Atraso**: R$ 1,00 por dia.
- **Bloqueio Automático**: Usuários com QUALQUER multa em aberto estão proibidos de retirar novos livros (Físicos ou Digitais).
- **Abono**: Apenas usuários 'bibliotecário' podem zerar multas manualmente.

### 3.3 Política de Dados (Soft Delete)
- **Hard Delete Proibido**: Registros de aluguéis e multas nunca são apagados para evitar furos na auditoria.
- **Arquivamento**: Livros e usuários são removidos do catálogo via `deleted_at`.

---

## 🌐 4. Referência Completa da API

A API responde em JSON e exige cabeçalho `Authorization: Bearer <token>`.

| Rota | Método | Descrição | Acesso |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | Gera token de acesso | Público |
| `/api/livros` | GET | Lista acervo físico (paginado) | Público |
| `/api/livros` | POST | Cria livro e N exemplares | Bibliotecário |
| `/api/livros/:id/exemplares`| GET | Lista cópias físicas | Bibliotecário |
| `/api/alugueis` | POST | Registra novo empréstimo | Bibliotecário |
| `/api/alugueis/:id/devolver` | PUT | Finaliza aluguel e gera multas | Bibliotecário |
| `/api/acervo-digital` | GET | Lista PDFs (aprovados) | Público |
| `/api/acervo-digital` | POST | Usuário envia PDF p/ aprovação | Usuário |
| `/api/acervo-digital/:id/aprovar`| POST | Aprova/Rejeita documento | Bibliotecário |

---

## 🔍 5. Auditoria de Segurança e Desemepenho
- **Sincronia Total**: Web e CLI usam os mesmos cálculos no Backend (Frontends Burros).
- **Otimização**: Consultas SQL agregadas para retornar KPIs em uma única requisição.
- **Segurança**: Prevenção contra exclusão em cascata (Cascade Protection) através de Soft Deletes.
