# 🛠️ Manual Técnico Acadêmico: Ecossistema Cristalário

Este documento apresenta as especificações técnicas, arquiteturais e funcionais da plataforma Cristalário, fundamentada em princípios de engenharia de software moderna e escalabilidade de dados.

---

## 🏗️ 1. Arquitetura e Paradigmas (Frontend & Backend)
**Visão Geral:** O sistema é estruturado sobre o modelo **Thin Client (Cliente Magro)**. A inteligência de negócio é isolada no servidor (Backend), garantindo que múltiplos clientes (Interface Web e Interface de Linha de Comando - CLI) operem sob as mesmas regras sem conflitos lógicos.

- **Frontend (Web):** Desenvolvido em HTML5/Vanilla CSS/JavaScript, focando em performance nativa e baixa pegada de memória. Utilizamos o padrão de **Fragment Loading** (carregamento sob demanda) para otimizar o tempo de resposta inicial (FCP - First Contentful Paint).
- **Backend (API):** O núcleo do sistema é uma **API (Application Programming Interface)** desenvolvida em Node.js. Academicamente, uma API é um conjunto de rotas, protocolos e ferramentas que permitem a comunicação entre diferentes softwares. Ela atua como um tradutor universal: o Frontend solicita um dado (ex: "quem é o usuário X?"), e a API consulta o banco de dados, processa as regras de segurança e retorna a resposta pronta. O servidor é **Stateless**, utilizando JWT para manter a integridade das sessões sem sobrecarregar a memória do servidor.
- **Integração Multicliente:** Por ser baseado em uma API centralizada, o Cristalário suporta simultaneamente a Interface Web e a Interface de Linha de Comando (CLI), garantindo que ambas sigam rigorosamente as mesmas regras de negócio (como prazos e multas).

---

## 🗄️ 2. Camada de Dados e Integridade (SQL & ORM)
**Banco de Dados:** MySQL com o motor InnoDB para suporte a transações ACID.
**Query Builder:** Knex.js é utilizado como abstração, permitindo consultas otimizadas e o gerenciamento de migrações (`migrations`) para controle de versão do esquema.
**Conceito de Soft Delete:** Registros importantes (livros, usuários, empréstimos) nunca são fisicamente removidos. Uma coluna `deleted_at` marca a inatividade do registro, preservando o histórico estatístico e financeiro para auditorias futuras.

---

## 🛡️ 3. Segurança e Gestão de Sessões (JWT & Bcrypt)
**Autenticação:** O sistema implementa **JSON Web Tokens (JWT)**. Ao realizar o login, um token criptografado é emitido, contendo as permissões do usuário. Este token deve ser enviado no cabeçalho `Authorization` de cada requisição.
**Criptografia:** Senhas de usuários nunca são armazenadas em texto plano. Utilizamos o algoritmo de hashing **Bcrypt** com fator de custo adaptável, protegendo os dados mesmo em caso de vazamento da base de dados.

---

## 🔄 4. O Acervo: Estrutura Multicamada (Modelagem de Negócio)
A plataforma gerencia o acervo por quatro dimensões distintas:
1.  **Obra Literária (Mestre):** Contém os metadados bibliográficos únicos (ISBN, Título, Autor, Edição).
2.  **Exemplar Físico (Escravo):** Cada livro mestre pode ter "N" exemplares físicos, cada um com seu código de barras próprio e condição física monitorada.
3.  **Acervo Digital (Repositório):** Armazenamento de obras em formato PDF, com atributos de tamanho e número de páginas para facilitar o consumo online.
4.  **Sistema de Curadoria:** Fluxo de submissão onde o usuário atua como colaborador do acervo, sujeito à auditoria do bibliotecário.

---

## ⚖️ 5. Motor de Regras: Empréstimos e Multas
A lógica de negócio foi desenhada para espelhar cenários do mundo real:
- **Prazo de Retenção:** Definido em 14 dias para garantir a circulação do conhecimento.
- **Sistema de Bloqueio:** O servidor verifica o status financeiro do usuário antes de processar qualquer novo empréstimo. Se houver multas pendentes ou o perfil estiver marcado como 'Bloqueado', a API retorna Erro 400 (Bad Request).
- **Cálculo de Penalidades:** O sistema recalcula multas automaticamente com base em dias de atraso ou perda total do item, registrando o valor diretamente no módulo financeiro do perfil.

---

## 📊 6. Business Intelligence (BI) e Analytics
O módulo de estatísticas processa dados relacionais brutos em métricas de alto nível:
- **Demanda por Gênero:** Visualização circular da popularidade do acervo.
- **Engajamento de Usuários:** Ranking de leitura e atividade de empréstimos.
- **Histórico Temporal:** Gráficos de barra que mostram o crescimento da biblioteca mês a mês.
- **Análise de Inventário:** Segmentação do acervo por década de publicação, auxiliando na curadoria histórica.

---

## 🎨 7. Design System e UX Visual
Baseado no conceito de **Glassmorphism**, o sistema utiliza camadas de desfoque e transparência para criar profundidade visual.
- **Dark Mode Nativo:** Foco no conforto visual e legibilidade em longas sessões de consulta.
- **Animations (GSAP):** Micro-interações que fornecem feedback visual imediato às ações do usuário.
- **3D Background (Three.js):** Um plano de fundo dinâmico e matemático que reforça a identidade tecnológica da plataforma.

---

## 🚀 8. Roadmap de Desenvolvimento (Em andamento)
O Cristalário foi estruturado em uma base modular que permite a expansão contínua de suas funcionalidades. Diferente de sistemas legados de prateleira, este projeto encontra-se em fase ativa de evolução. Estão previstas para as próximas iterações a implementação de módulos de reserva antecipada, sugestões baseadas em trilhas de leitura e integração com sistemas de pagamento para automatização completa do fluxo de caixa bibliotecário.
