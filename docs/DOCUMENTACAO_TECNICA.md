# 📘 Documentação Técnica Completa - Biblio Verso

Este documento fornece uma visão profunda da arquitetura, funcionalidades e decisões de design do **Biblio Verso**, servindo como guia para desenvolvedores e administradores do sistema.

---

## 1. Visão Geral do Sistema
O Biblio Verso é uma plataforma de gestão bibliotecária híbrida que une a administração de acervos físicos tradicionais com as demandas da era digital. O sistema foi projetado para ser intuitivo para leitores e robusto para bibliotecários.

### Diferenciais Principais:
- **Hibridismo Operacional**: Funciona 100% offline (SQLite) para desenvolvimento e online (Supabase) para produção.
- **Experiência Gamificada**: Área infantil com sistema de XP, níveis e recompensas para incentivar a leitura.
- **Gestão em Tempo Real**: Notificações automáticas de atrasos e pendências via WebSockets.
- **Design System Premium**: Interface moderna, responsiva e com suporte a temas (Modo Claro/Escuro).

---

## 2. Arquitetura Técnica

### 2.1 Stack Tecnológica
- **Servidor**: Node.js com framework Express.js.
- **Comunicação**: Socket.io para eventos bi-direcionais em tempo real.
- **Bancos de Dados**: 
  - **Local**: `better-sqlite3` (Desenvolvimento/Offline).
  - **Nuvem**: `Supabase` (Produção/Online).
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Semântico e CSS3 Moderno (Gradients, Glassmorphism).
- **Bibliotecas Visuais**: `GSAP` (Animações), `Three.js` (Efeitos 3D), `Chart.js` (Dashboards).

### 2.2 Estrutura de Pastas
- `src/`: Lógica do servidor (Controllers, Middlewares, Routes, Database).
- `public/`: Interface do usuário (Telas, Estilos, Lógica Client-side).
- `data/`: Armazenamento do banco de dados SQLite local.
- `docs/`: Documentação e materiais de suporte.

---

## 3. Banco de Dados e Modelagem

O sistema utiliza um modelo relacional robusto para garantir a integridade dos dados.

### 3.1 Modelagem e Tabelas
O sistema utiliza um modelo relacional robusto para garantir a integridade dos dados. Para a versão Online, o esquema completo está disponível em [supabase_schema.sql](supabase_schema.sql).

### Principais Tabelas:
1.  **`usuarios`**: Armazena credenciais, cargos (Leitor/Bibliotecário) e dados de gamificação (XP, Nível).
2.  **`livros`**: Catálogo central de títulos físicos.
3.  **`exemplares`**: Controla cada cópia física individualmente (Relacionamento 1:N com Livros).
4.  **`alugueis`**: Registra o ciclo de vida de um empréstimo (Ativo/Devolvido).
5.  **`multas`**: Gestão financeira de atrasos e danos ao acervo.
6.  **`acervo_digital`**: Catálogo de PDFs e documentos aprovados para download.

---

## 4. Lógica de Negócio (Controllers)

### 4.1 Empréstimos e Devoluções (`AluguelController`)
- **Operações Atômicas**: O sistema garante que um livro só seja marcado como alugado se o registro de empréstimo for criado com sucesso.
- **Bloqueio Automático**: Usuários com multas pendentes ou que atingiram o limite de livros são impedidos de realizar novos empréstimos.
- **Cálculo de Multas**: Calculado no momento da devolução com base em timestamps precisos.

### 4.2 Gamificação (`InfantilController`)
- **Segurança**: Toda a lógica de validação de respostas e entrega de XP acontece no backend. O frontend nunca recebe o gabarito das questões.
- **Progressão**: Sistema de níveis baseado em acúmulo de experiência, incentivando a recorrência do leitor.

### 4.3 Inteligência e Dados (`StatsController`)
- **Dashboards Dinâmicos**: Gera rankings de popularidade, tendências de gênero e indicadores de eficiência da biblioteca.
- **Visão Diferenciada**: Bibliotecários veem dados globais da instituição; leitores veem seu progresso pessoal.

---

## 5. Segurança e Autenticação

### 5.1 Fluxo de Autenticação
- **JWT (JSON Web Tokens)**: O servidor emite um token assinado após o login. Este "crachá digital" deve ser enviado em cada requisição protegida.
- **Bcryptjs**: Senhas são transformadas em hashes irreversíveis antes de serem salvas, garantindo que nem mesmo os administradores tenham acesso à senha real dos usuários.

### 5.2 Middlewares de Proteção
- **`verificarToken`**: Atua como porteiro, validando a identidade de quem acessa a API.
- **`verificarBibliotecario`**: Segurança de área restrita, bloqueando funções administrativas para usuários comuns.

---

## 6. Interface e Design (Frontend)

O Biblio Verso segue padrões de design modernos para proporcionar uma sensação "Premium":
- **GSAP**: Utilizado para transições de tela suaves e micro-interações que aumentam o engajamento.
- **Three.js**: Cria ambientes imersivos no Espaço Infantil, tornando o aprendizado divertido.
- **SPA (Single Page Application)**: A navegação entre seções é instantânea, sem recarregamento de página, simulando o comportamento de um aplicativo nativo.

---

## 7. Monitoramento (`monitor.js`)
O sistema possui um "vigilante" que roda em segundo plano:
- Verifica livros atrasados a cada 30 segundos.
- Alerta sobre novos materiais digitais aguardando aprovação.
- Notifica os bibliotecários instantaneamente via WebSockets.

---

## 8. Conclusão
O Biblio Verso não é apenas um software de inventário, mas uma ferramenta educacional e administrativa completa, construída com foco em escalabilidade, segurança e excelência visual.

---
*Documentação atualizada em Abril de 2026 por Luiz Enrique.*
