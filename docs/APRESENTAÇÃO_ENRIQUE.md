# **Biblio Verso** (Apresentação Enrique)

**Contexto**: Trabalho Final de Curso - Continuação Técnica
**Dinâmica**: Explicar os "como" - começa falando das tecnologias usadas e depois vai falando os como

---

## **SLIDES E FALA**

### **Slide 1: Stack Tecnológica**
- **Backend**: Node.js + Express.js + Socket.io
- **Bibliotecas Backend**: Supabase, bcryptjs, JWT, better-sqlite3, cors, dotenv
- **Frontend**: HTML + CSS + JavaScript
- **Bibliotecas Frontend**: GSAP, Three.js, Chart.js
- **Bancos de Dados**: SQLite e Supabase
- **Hospedagem**: Github e Render

**Fala:**
"Para o backend, escolhi Node.js com Express.js porque são tecnologias que aprendemos bastante no curso. Adicionei Socket.io para permitir atualizações em tempo real sem precisar recarregar a página. Como bibliotecas do backend, uso Supabase para conectar ao banco de dados em nuvem, bcryptjs para criptografar senhas, JWT para autenticação, better-sqlite3 para o banco de dados local, cors para permitir requisições de origens diferentes e dotenv para gerenciar variáveis de ambiente. O frontend é HTML, CSS e JavaScript puro, sem frameworks, porque é mais simples e pesa menos. Para as animações e gráficos, uso GSAP, Three.js e Chart.js. Para os bancos de dados, uso SQLite no servidor local porque funciona 100% offline, o que facilita o desenvolvimento e permite que qualquer um clone o projeto e rode localmente. Para o servidor online, uso Supabase porque é gratuito e fácil de configurar. Já o GitHub serve para fazer o versionamento, e o Render para fazer o deploy automaticamente."

---

### **Slide 2: Por Que Cada Tecnologia Foi Escolhida**
- **better-sqlite3**: SQLite local para desenvolvimento 100% offline
- **Supabase**: Banco em nuvem gratuito com autenticação e realtime
- **bcryptjs**: Criptografia de senhas
- **JWT**: Autenticação sem guardar sessão no servidor
- **cors**: Permite requisições de origens diferentes
- **dotenv**: Gerencia variáveis de ambiente para segurança
- **Socket.io**: Atualizações em tempo real sem recarregar página
- **GSAP**: Animações suaves
- **Three.js**: Efeitos 3D
- **Chart.js**: Gráficos interativos para estatísticas

**Fala:**
-- "Escolhi better-sqlite3 porque permite desenvolver 100% offline. Posso trabalhar de qualquer lugar sem internet, e qualquer um pode clonar o projeto e rodar localmente. Para produção, uso Supabase porque é gratuito, fácil de configurar e já vem com autenticação e realtime."
-- "bcryptjs é essencial para segurança. Criptografa as senhas de forma irreversível, então nem eu consigo ver a senha original. JWT permite autenticação stateless, o que significa que o servidor não guarda sessão. Isso torna o sistema mais escalável e permite adicionar mais servidores se precisar."
-- "cors permite que o frontend e backend estejam em origens diferentes, o que é útil em produção. dotenv gerencia variáveis de ambiente como chaves do Supabase, garantindo que credenciais sensíveis não fiquem hardcoded no código."
-- "Socket.io permite atualizações em tempo real sem recarregar a página, essencial para notificações e estatísticas. GSAP cria animações suaves e profissionais. Three.js adiciona efeitos 3D no espaço infantil. Chart.js cria gráficos interativos para visualizar estatísticas de forma clara e profissional."

---

### **Slide 3: Organização de Pastas e Arquivos**
- **src/**: Todo o código do servidor (index.js, rotas, middleware)
- **public/**: Frontend completo (html, css, js)
- **public/js/**: Arquivos JavaScript que fazem requests ao backend
- **Zero Lógica de Negócio no Front**: Nenhum cálculo de regras no navegador
- **Separação Clara**: Backend é o cérebro, frontend é apenas visual

**Fala:**
-- "Separei as pastas src e public porque backend e frontend têm responsabilidades diferentes. A pasta src contém todo o código do servidor: index.js, rotas, controllers e middleware. Toda a lógica de negócio fica aqui, no server-side."
-- "A pasta public tem apenas HTML, CSS e JavaScript. É só visual, nenhum cálculo de regras de negócio acontece aqui. Os arquivos JavaScript em public/js fazem requests ao backend, e o servidor processa e retorna a resposta. É o client-side"

---

### **Slide 4: Como o Acervo Físico é Organizado?**
- **Estrutura 1:N**: Um livro pode ter múltiplas cópias e essas múltiplas cópias são vinculadas a um único livro
- **Barra de Pesquisa**: Filtro por título, autor, categoria, ano e gênero
- **Relacionamentos**: Autor, gênero, exemplares vinculados
- **Concorrência**: Vários usuários alugam o mesmo livro sem conflitos

**Fala:**
-- "O banco usa relacionamento 1:N em tudo. Um livro na tabela livros pode ter múltiplos exemplares na tabela exemplares, e cada exemplar está vinculado ao seu livro, autor e gênero."
-- "A barra de pesquisa funciona como um filtro que permite buscar por título, autor, categoria, ano e gênero. O usuário pode combinar vários filtros para encontrar exatamente o que precisa. Além disso, vários usuários podem alugar ao mesmo tempo o mesmo livro sem conflitos, pois o banco faz o empréstimo a partir dos exemplares disponíveis, e não do livro em si."

---

### **Slide 5: Como os Empréstimos Funcionam?**
- **Transações Seguras**: Ou tudo funciona ou nada acontece
- **Regras Inteligentes**: Bloqueia multas e limites automaticamente
- **Validação Imediata**: Verifica regras antes de aprovar
- **Cálculo de Multas**: Data e hora exatas com timestamps

**Fala:**
"Antes de aprovar um empréstimo, o servidor valida se o usuário tem multa, se o livro tem algum exemplar disponível e se esse usuário respeita o limite de empréstimos. O cálculo de multas usa timestamps, que são registros de data e hora exatas do momento do empréstimo e da devolução. Assim, o sistema calcula precisamente quantos dias passaram e aplica a multa correta se precisar. Se alguma regra falhar, o empréstimo é bloqueado automaticamente."

---

### **Slide 6: Como o Acervo Digital Funciona?**
- **Upload Seguro**: Validação de tipo e tamanho
- **Processo de Aprovação**: Bibliotecário aprova na hora, Leitor espera aprovação
- **Download**: Apenas materiais aprovados disponíveis

**Fala:**
"O upload valida tipo e tamanho antes de aceitar. Só aceito PDFs até 10MB para evitar problemas de armazenamento. Se o upload for feito pelo bibliotecário, o material é aprovado na hora e fica disponível imediatamente. Se for feito pelo leitor, fica pendente até um bibliotecário aprovar ou rejeitar. Esse processo evita conteúdo inadequado no acervo. Usuários comuns não veem os pendentes, garantindo que só conteúdo aprovado circule no sistema."

---

### **Slide 7: Sistema de Notificações em Tempo Real**
- **WebSocket**: Conexão permanente para atualizações
- **Tipos de Notificações**: Livros atrasados, materiais para aprovar
- **Priorização**: Classificados por urgência
- **Monitoramento**: Verificações constantes a cada 30 segundos

**Fala:**
"O sistema de notificações usa WebSocket, que mantém uma conexão permanente com o servidor. Quando há uma notificação, ela aparece instantaneamente sem ter que recarregar a página. O sistema verifica constantemente a cada 30 segundos se há livros atrasados, comparando a data prevista de devolução com a data atual usando timestamps. Também verifica materiais pendentes de aprovação e usuários bloqueados. Se houver mudança, envia notificação automaticamente para os bibliotecários. As notificações são classificadas por urgência, então o bibliotecário vê primeiro o que precisa de atenção imediata."

---

### **Slide 8: Segurança do Sistema**
- **Modo Local**: Senhas criptografadas com bcrypt, JWT local
- **Modo Online**: Supabase Auth gerencia senhas e tokens
- **Controle de Acesso**: Leitor vs Bibliotecário
- **Validação no Servidor**: Tudo verificado antes de processar

**Fala:**
"A segurança funciona diferente em cada versão. No modo local, as senhas são criptografadas com bcrypt, que é um algoritmo que transforma a senha em um código irreversível. Para autenticação, usamos JWT, que é um token que funciona como um crachá digital. O usuário faz login, recebe o token e o usa em cada requisição, assim o sistema sabe exatamente quem ta fazendo o que, e o que tu pode ou não fazer. No modo online, o Supabase Auth gerencia as senhas e fornece os tokens JWT. O controle de acesso diferencia Leitor de Bibliotecário. Leitores só podem ver, enquanto bibliotecários podem gerenciar tudo. O servidor valida cada ação antes de processar em ambos os modos."

---

### **Slide 9: Gamificação à Prova de Trapaças**
- **Lógica no Servidor**: Cálculos no backend, não no navegador
- **Respostas Protegidas**: Gabarito nunca visível ao usuário
- **Progressão Automática**: Atualiza em tempo real
- **Impossível Hackear**: Validação acontece no servidor

**Fala:**
"Toda a lógica do quiz fica no servidor, não no navegador onde poderia ser manipulada. O navegador só mostra as perguntas, não sabe a resposta pois o gabarito nunca é enviado ao frontend. Só o servidor valida se a resposta está correta. A progressão é automática e atualiza em tempo real via WebSocket."

---

### **Slide 10: Menu de Estatísticas**
- **KPIs Principais**: Total de livros, empréstimos ativos, usuários cadastrados
- **Gráficos Visuais**: Gêneros mais emprestados, autores populares, tendências
- **Filtragem por Período**: Visualização diária, mensal ou anual
- **Dados em Tempo Real**: Atualizados automaticamente via WebSocket

**Fala:**
"O menu de estatísticas mostra KPIs principais como total de livros, empréstimos ativos e usuários cadastrados. Os gráficos visuais mostram gêneros mais emprestados, autores populares e tendências de leitura. É possível filtrar por período - diário, mensal ou anual. Os dados são atualizados em tempo real via WebSocket, então o bibliotecário sempre vê as informações mais recentes sem precisar recarregar a página."

---

### **Slide 11: Menu de Usuários**
- **Gerenciamento Completo**: Cadastro, edição e exclusão de usuários
- **Controle de Acesso**: Bloqueio e desbloqueio de contas
- **Gestão de Multas**: Visualização e quitação de débitos
- **Perfil Detalhado**: Histórico de empréstimos e atividades

**Fala:**
"O menu de usuários permite gerenciar cadastro, edição e exclusão de usuários. O bibliotecário pode bloquear ou desbloquear contas quando necessário. Também é possível visualizar e quitar multas diretamente neste menu. Cada usuário tem um perfil detalhado com histórico de empréstimos e atividades, facilitando o acompanhamento individual."

---

### **Slide 12: Estilizações e Bibliotecas do Frontend**
- **GSAP**: Animações suaves e transições profissionais
- **Three.js**: Efeitos 3D e visualizações avançadas
- **Chart.js**: Gráficos interativos para estatísticas
- **Modo Claro/Escuro**: Tema dinâmico com persistência
- **Design System**: Cores, tipografia e componentes consistentes

**Fala:**
"Para as animações, uso GSAP, uma biblioteca que permite criar transições suaves e profissionais. O Three.js é usado para efeitos 3D e visualizações avançadas no espaço infantil. Para os gráficos de estatísticas, uso Chart.js, que cria visualizações interativas de dados. O sistema tem modo claro e escuro, e o usuário pode alternar entre eles. A preferência é salva localmente, então quando o usuário volta, o tema escolhido permanece ativo. Todo o design system é consistente, com cores, tipografia e componentes padronizados para garantir uma experiência visual coesa."

---

## **GLOSSÁRIO**

### **Infraestrutura**
- **SQLite**: Banco de dados local, funciona 100% offline
- **Supabase**: Banco de dados em nuvem com autenticação e realtime
- **Render**: Plataforma de hospedagem para aplicações Node.js
- **WebSocket**: Conexão permanente para atualizações em tempo real
- **Deploy**: Processo de publicar a aplicação na internet

### **Arquitetura**
- **Backend Node.js**: Servidor com Express.js
- **Frontend Vanilla**: HTML, CSS, JavaScript puro
- **JSON**: Formato de texto para comunicação entre frontend e backend
- **Stateless**: Servidor sem estado de sessão

### **Segurança**
- **JWT**: Token usado para autenticação e controle de acesso
- **Bcrypt**: Algoritmo de criptografia de senhas
- **Validação**: Verificação de dados antes de processar
- **Controle de Acesso**: Leitor vs Bibliotecário

### **Conceitos**
- **Operações Atômicas**: Ou tudo funciona ou nada acontece
- **Relacionamento 1:N**: Um livro pode ter múltiplas cópias
- **Isolamento de Transações**: Operações independentes sem conflitos
- **Processamento Paralelo**: Várias tarefas simultâneas
