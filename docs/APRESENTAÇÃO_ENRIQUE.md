# 🗺️ Biblio Verso (Apresentação Enrique)

Este documento é a "Caixa Preta" do Biblio Verso. O objetivo é demonstrar para a banca as métricas técnicas, regras de negócios estritas (if/elses lógicos de banco de dados), arquiteturas de servidor Node e modelagens 1:N que sustentam todo o site.

---

## 🚀 1. A Base: Smart Backend & Dumb Interfaces
*O que fundamenta a nossa escalabilidade?*
- A engenharia foi pensada como uma API RESTful Headless.
- Tanto o site colorido quanto a CLI técnica feita em Node.js são apenas "Viewers" (Visualizadores). Nenhuma das interfaces define multas ou calcula experiência do jogador. Ambas executam um simples `FETCH` e obedecem apenas aos JSONs que o `Node.js + Express` disparam. Isso protege a lógica central em um único ambiente.

---

## 🔐 2. Tela de Autenticação (Motor de Segurança)
- **Registro de Contas (`Bcrypt`)**: No cadastro, nós não salvamos a senha textual no banco MySQL. O servidor gera um array aleatório numérico (`Salt`) e aplica o processador matemático complexo do Bcrypt antes de comitar a linha na tabela `usuarios`.
- **Acesso do Sistema (`JSON Web Token`)**: A arquitetura do Backend opera em protocolo `Stateless`, exigindo menos RAM dos nossos servidores. Ao dar match no login, o Controller devolve um JWT. O Frontend salva esse JWT em Storage local e o injeta como um cabeçalho de controle na `Pipeline de Headers` para qualquer futuro `Fetch`.
- **RBAC**: Os middlewares lêem o payload base64 do JWT e gerenciam as rotas de administrador (`req.usuario.tipo === bibliotecario`), bloqueando acesso comum instantaneamente com erro 403.

---

## 🏗️ 3. O Chassi de Navegação WEB (SPA - DOM Engine)
Como um site com 11 módulos diferentes funciona sem reload visual?
- O Biblio Verso não recarrega páginas HTML avulsas. No arquivo de bootstrap central, lemos todas as tags HTML que declaram "Páginas `<section class='screen'>`" e as ocultamos no CSS nativo associado com opacidade e 'display:none'.
- Na função do fluxo `mostrarTela()`, instanciamos a biblioteca de alta-frequência visual `GSAP`, inserimos a classe `.active` somente na sessão em demanda e engatilhamos uma subida matemática temporal de Y e de Alpha (`stagger`). Tudo lido em cache renderizado.

---

## 📚 4. Catálogo: Acervo Físico (Topologia Relacional)
Construímos a tabela do sistema físico fugindo de redundâncias ou problemas de acoplamento de classes Cópia/Livro.
- **Modelagem 1:N no Knex.js**: Temos a tabela pai de `livros` e os filhos de `exemplares`. Um aluguel é linkado no ID de registro do Exemplar.
- **Ajustes de Localização por Script**: Temos inteligência em runtime local. Baseado no nome do autor, o backend lê via regex qual a string Unicode `charcodeAt` e indexa isso a uma lista de estantes dinâmicas A-Z, gerando mapeamento logístico automático (Corredor "L", Prateleira "3").
- **Constraint Física de Bloqueio (DELETE Lock)**: Um `Livro_pai` nunca sofre _Drop Cascade_ aleatórios. Se existe um join na tabela locação marcado em atraso (`status: 'atrasado'`), aplicamos lançamento imperativo de restrição (HTTP 400).

---

## 📱 5. Processamento do Acervo Digital (State Machine)
- Um aluno que der upload de link de e-book joga esse `insert` na tabela com o enumerador de controle `status` em estado forçado `'pendente'`.
- Ele é omitido globalmente das tags Web. Apenas painéis JWTs Admin o puxam.
- Se a gestão administrativa rejeitar o documento submetido, como esse arquivo inicial nunca possuiu um vínculo histórico lido, aplicamos exclusão radical local (Hard Delete `await db().delete()`), e não um Soft Delete, mitigando lixo nas alocações do servidor.

---

## 📋 6. Motor Transacional (Balcão de Alugueis e Cálculos)
Lógica monetária e locação de estoque é o ponto crítico sistêmico que exige consistência absoluta (ACID):
- **O Check-up Algorítmico do Aluguel**: Se os registros contiverem os flags `.bloqueado`, ou total de Count for `> 3`, é barrado precocemente.
- **Transactions do Knex.js (`db.transaction()`)**: Se eu crio um Aluguel, e o BD falha na frente por um timeout ao atualizar a tag disponibilidade do exemplar físico para `emprestado`, eu reverto a primeira operação. Total consistência SQL.
- **Date Math Server Side**: Cálculo Diário. Instanciamos a lib Date nativa de comparação do SO do backend onde roda, geramos as conversões Float e medimos o distanciamento da data prevista com o UTC agora, lançando valor em moedas reais no Insert final do `multas_controller`.

---

## 🎓 7. O RPG Educativo (Engenharia Segura de Gamificação)
Game engines client-side sempre sofrem hacks. Nosso motor infantil atua em _Backend Polling_.
- O front só processa perguntas estéticas. Nós emitimos o output da classe do teste comitando um `delete node.quiz.opcao_correta;` na RAM do servidor antes de empacotar o JSON. É impossível cheatar localmente.
- Somente no final o aluno realiza um POST com o índice de clique. O Backend, em sigilo, desoculta o JSON core, valida a sintaxe lida e executa operações matemáticas (`novoXP -= nivel_atual * 100`) aumentando o índice do level em loops de `while`. Atualizando "vidas" diretamente no cluster.

---

## 👥 8. Controlador de Cargos de Moderação (Bloqueio manual)
Os administradores controlam níveis em um canal de CRUD base. É operado pela injeção da variável `tipo: ['usuario', 'bibliotecario']`. Modificando permissões globais do payload central na hora, controlando quem pode modificar livros e rejeitando bad users injetando valor booleano manual.

---

## 🔔 9. Célula Aggregator de Alertas
Não temos telas isoladas inúteis, agrupamos operações do gestor em telas focais em tempo-real. A chamada Assincrona viaja para o Servidor e bate nos controladores de Aluguel e Acervos Simultaneamente usando processamentos paralelos de Promise em pool `Promise.all()`. O Array é mapeado renderizando Componentes modulares DOM no front do Alerta.

---

## 📊 10. Dashboard Estatístico (Business Logic Queries)
Painel interativo montando arrays matemáticos para a lib Graphic UI `Chart.js`.
Toda regra descrita em gráficos sai de um processador `COUNT()...GROUP BY` limpo processado direto na leitura de disco. Exibe sem nenhum forEach processual bruto, transformando agrupamentos complexos em tabelas formatadas ao invés de cálculos lentos usando RAM. Agrupa volumes massivos como _Gêneros mais Populares_ ou _Aluguéis em linha de Cronologia_.

---

## 🪐 11. Customização Fina do Perfil e Fundo Imersivo
Interface premium criada controlando polígonos estáticos WebGL em uma Scene Câmera no arquivo. Um observer JS complexo (`MutationObserver`) roda oculto detectando flags strings globais no DOM Root. Se um usuário trocar tema `data-theme` "Dark" no Perfil, em vez do navegador dar reload para ler novo estilo CSS, alteramos o buffer na placa gráfica re-pintando todas as esferas `Three.js` (Hex decimal) com fade natural em runtime na mesma fração de segundo. Performance e requinte absolutos.
