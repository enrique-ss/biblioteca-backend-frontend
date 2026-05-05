# 📘 Documentação Técnica Completa - Biblio Verso

Este documento fornece uma visão profunda da arquitetura, funcionalidades e decisões de design do **Biblio Verso**, servindo como guia para desenvolvedores e administradores do sistema.

---

## 1. Visão Geral do Sistema
O Biblio Verso é uma plataforma de gestão bibliotecária híbrida que une a administração de acervos físicos tradicionais com as demandas da era digital e a interatividade das redes sociais. O sistema foi projetado para ser intuitivo para leitores e robusto para bibliotecários.

### Diferenciais Principais:
- **Hibridismo Operacional**: Funciona 100% offline (SQLite) para desenvolvimento e online (Supabase) para produção.
- **Ecossistema Social**: Perfis personalizados, sistema de amizades e feed de atividades em tempo real.
- **Experiência Gamificada**: Área infantil (Espaço Literário) com sistema de XP, níveis, corações e recompensas.
- **Gestão de Acesso Granular**: Controle preciso de restrições (Empréstimos, Social, Digital, Infantil) para cada usuário.
- **Design System Premium**: Interface ultra-fina com bordas de 0.5px, botões minimalistas e suporte total a temas.

---

## 2. Arquitetura Técnica

### 2.1 Stack Tecnológica
- **Servidor**: Node.js com framework Express.js.
- **Comunicação**: Socket.io para eventos bi-direcionais em tempo real (Notificações, Atualizações).
- **Bancos de Dados**: 
  - **Local**: `better-sqlite3` (Desenvolvimento/Offline).
  - **Nuvem**: `Supabase` (Produção/Online).
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Semântico e CSS3 Moderno.
- **Bibliotecas Visuais**: `GSAP` (Animações), `Three.js` (Efeitos 3D), `Chart.js` (Dashboards).

### 2.2 Estrutura de Pastas
- `src/`: Lógica do servidor (Controllers, Middlewares, Routes, Database).
- `public/`: Interface do usuário (Telas, Estilos, Lógica Client-side).
- `data/`: Armazenamento do banco de dados SQLite local.
- `docs/`: Documentação e materiais de suporte.

---

## 3. Banco de Dados e Modelagem

O sistema utiliza um modelo relacional robusto para garantir a integridade dos dados.

### 3.1 Tabelas e Relacionamentos
1.  **`usuarios`**: Contém credenciais, cargo, dados de gamificação e o campo `bloqueios` (JSON) para restrições granulares.
2.  **`livros` e `exemplares`**: Gerencia o acervo físico e o estado individual de cada cópia cópia.
3.  **`alugueis` e `multas`**: Ciclo de vida de empréstimos e controle financeiro.
4.  **`acervo_digital`**: Repositório de PDFs com fluxo de curadoria (Aprovação/Rejeição).
5.  **`amizades`**: Registra conexões entre usuários (Pendentes, Aceitas).
6.  **`atividades`**: Log de ações relevantes (Aluguéis, Conquistas, Novas Amizades) para o feed social.

---

## 4. Funcionalidades Principais

### 4.1 Gestão de Acervo e Circulação
- **Controle de Exemplares**: Cada livro pode ter múltiplos exemplares com estados distintos (Bom, Danificado, Manutenção).
- **Devolução Inteligente**: Cálculo automático de multas por atraso ou perda, com registro de observações.
- **Renovação**: Leitores podem renovar empréstimos online se não houver atrasos pendentes.

### 4.2 Espaço Literário (Gamificação)
- **Aprendizado Adaptativo**: Conteúdo filtrado por faixa etária (3-5, 6-8, 9-12 anos).
- **Sistema de Quiz**: Validação de respostas via backend para evitar trapaças, com ganho de XP e perda de "corações".
- **Avatar Dinâmico**: Integração com a foto de perfil real do usuário ou emojis temáticos.

### 4.3 Sistema Social e Perfis
- **Perfis "Instagram-style"**: Banner personalizável, biografia, gêneros favoritos e estatísticas de leitura.
- **Feed de Atividades**: Ações do usuário e de seus amigos são exibidas cronologicamente em um log visual.
- **Interação**: Envio e aceitação de pedidos de amizade com notificações instantâneas.

### 4.5 Biblio Chat (Sistema de Mensageria Unificado)
O sistema de comunicação foi evoluído para um modelo de **Inbox**, centralizando todas as interações:
- **Navegação em Dois Níveis**: O widget inicia em modo Inbox (Lista de Conversas) e transiciona para o modo Conversa ao selecionar um contato ou clube.
- **Categorização Automática**: Divisão clara entre "Pessoas" (DMs) e "Clubes" (Chats de Grupo).
- **Lógica de Contatos**: O sistema identifica automaticamente amigos e participantes de conversas recentes para popular a caixa de entrada.
- **Sincronização Híbrida**: Combina Socket.io para mensagens instantâneas com um sistema de *polling* inteligente de 5 segundos para garantir que o Inbox esteja sempre atualizado, mesmo em conexões instáveis.

---

## 5. Design System e UX

O Biblio Verso adota uma identidade visual de alta precisão:
- **Bordas Ultra-finas**: Padronização de todas as bordas do sistema em **0.5px solid var(--accent)**.
- **Botões Minimalistas**: Uso de rótulos curtos e ícones (Ex: "‹" para voltar) para uma interface limpa e profissional.
- **Visual Excellence**: Uso extensivo de Glassmorphism, gradientes harmônicos e micro-animações GSAP que dão vida à interface.

---

## 6. Segurança e Monitoramento

### 6.1 Autenticação e Autorização
- **JWT + Bcrypt**: Tokens seguros para sessões e hashing de senhas.
- **Middlewares**: Proteção de rotas por cargo (Bibliotecário vs. Leitor) e verificação de integridade do token.

### 6.2 Notificações em Tempo Real (`monitor.js`)
- **WebSockets**: Notificações instantâneas para devoluções atrasadas, novos pedidos de amizade e submissões digitais pendentes.
- **Badge de Alerta**: Contador dinâmico na sidebar que reflete pendências em tempo real.

---

## 7. Conclusão
O Biblio Verso evoluiu de um simples sistema de inventário para um ecossistema digital completo que prioriza a experiência do usuário, a segurança dos dados e a excelência estética.

---
*Documentação atualizada em Maio de 2026 por Antigravity AI.*
