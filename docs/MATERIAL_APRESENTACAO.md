# 🎤 Guia para Apresentação: O "Por que" do LuizaTeca

Este documento é o seu manual de respostas rápidas para a apresentação. Ele foca no **porque escolhemos cada caminho** – que é o que os professores mais perguntam.

---

## 🎨 1. Design & Experiência (Slides de Visual)

**Por que Glassmorphism (Efeito Vidro)?**
- **O que é**: O desfoque atrás dos cartões e tabelas.
- **Por que**: Traz uma sensação de **modernidade e leveza** que sites antigos de biblioteca não têm. Faz o aluno se sentir em uma plataforma "Premium" (tipo Netflix/Apple).
- **Como dizer**: *"Utilizamos o padrão de design Glassmorphism para criar uma interface visualmente rica, mas que não distrai o usuário do conteúdo principal."*

**Por que Dark Mode por Padrão?**
- **Por que**: Reduz a fadiga ocular e economiza energia em telas modernas. Além disso, as cores vibrantes (Dourado e Azul) ganham muito mais destaque em fundos escuros.

---

## 🏗️ 2. A Arquitetura do Sistema (Slides Técnicos)

**Por que o site é "Modular"?**
- **O que é**: As telas não estão todas no mesmo arquivo. Elas são carregadas conforme você navega.
- **Por que**: Torna o site muito mais rápido para carregar a primeira página, pois ele não baixa o que você ainda não clicou.
- **Como dizer**: *"Nosso sistema de Fragment Loading carrega apenas o necessário sob demanda, otimizando o tráfego de dados e facilitando a manutenção futura."*

**Por que o Backend é o "Cérebro"?**
- **Por que**: Para que o terminal (CLI) e o site (Web) tenham exatamente as mesmas regras. Se mudarmos o valor da multa no Backend hoje, amanhã o site e o CLI já estarão com o valor novo automaticamente.

---

## 🛡️ 3. Segurança & Transparência (Slides de Confiança)

**Por que não deletamos nada (Soft Delete)?**
- **Por que**: Se um livro sumir da estante, precisamos do histórico dele. Se um aluno se formar, precisamos do histórico de multas dele.
- **Como dizer**: *"No LuizaTeca, a integridade dos dados é sagrada. Usamos Soft Delete para que possamos arquivar livros e usuários sem perder o rastro estatístico e financeiro do passado."*

**Por que usar Token (JWT)?**
- **Por que**: É uma segurança de ponta. O servidor não precisa "vigiar" cada usuário; o usuário carrega sua própria credencial (o token) em cada ação que toma.

---

## 🔥 4. Perguntas "Matadoras" (Dicas de Resposta)

**1. "Como o sistema escala se tivermos 1000 alunos?"**
- **Resposta**: *"O sistema foi desenhado com o driver MySQL2 de alto desempenho, que utiliza um 'pool' de conexões. Isso significa que ele consegue processar centenas de pedidos ao mesmo tempo sem perder velocidade."*

**2. "Se o aluno não pagar a multa, ele pode burlar o sistema pelo terminal?"**
- **Resposta**: *"Não. O motor de regras está no Backend. Qualquer pedido, seja pelo site ou pelo terminal, passa pela mesma validação de dívida ativa. Se houver pendência, o Backend nega o empréstimo na hora."*

**3. "Qual a parte mais difícil do projeto?"**
- **Resposta**: *"Foi criar a sincronia entre a interface gráfica rica e o terminal de comando, garantindo que ambos consumissem os mesmos dados sem conflitos de informação."*

---

> [!TIP]
> **O "Pulo do Gato"**: Mostre um bibliotecário fazendo algo no CLI e a mudança acontecendo no site em tempo real nos slides. Isso prova que o sistema é **robusto e integrado**.
