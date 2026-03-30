# Padrões de UI - LuizaTeca Premium

Este documento define as diretivas de design e componentes para manter a interface do LuizaTeca coerente, moderna e de alto desempenho.

## 🎨 Design System (Tokens)

O sistema utiliza um sistema de design baseado em variáveis CSS para suportar temas Dark/Light e Glassmorphism.

### Paleta de Cores & Contrastes
- **--accent**: Cor de destaque (Azul no Light / Dourado no Dark). Usada para ações primárias e links.
- **--bg**: Fundo principal de tela.
- **--surface**: Superfície de cartões com transparência e desfoque.
- **--text**: Cor principal de leitura (Alta fidelidade de contraste).
- **--danger / --success**: Cores semânticas vibrantes para feedbacks.

### Glassmorphism & Bordas
Todos os containers de conteúdo (tabelas, cards, modais) devem seguir:
- `backdrop-filter: var(--glass)` (Mínimo 20px de blur).
- `border: var(--glass-border)` (Borda sutil de 1px).
- `border-radius`: Uso de `--r-lg` (16px) para cards e `--r-pill` (500px) para botões.

## 🏗️ Estrutura de Componentes

### 1. Botões (`.btn`)
- **Primário**: `.btn-primary` ou `.btn-success`.
- **Ação Rápida**: `.btn-sm` (Pequeno, usado em tabelas).
- **Ghost**: `.btn-ghost` (Borda sutil, fundo transparente).
- **Transições**: Sempre usar `cubic-bezier(0.4, 0, 0.2, 1)` para efeitos de hover e escala.

### 2. Cartões de Acervo (`.digital-card`)
Design inspirado em streaming para livros físicos e digitais:
- **Aspect Ratio**: 2/3 para posters.
- **Hover**: Escala de 1.05 com elevação no eixo Y.
- **Overlay**: Gradiente escuro no rodapé para legibilidade do texto.

### 3. Tabelas de Dados (`.data-table`)
- **Fundo**: Sempre encapsulado em `.table-wrap`.
- **Interatividade**: Linhas com hover sutil e colunas ordenáveis (indicadas por `.sortable`).
- **Vazio**: Quando não há dados, retornar um `div` simples em itálico com `color: var(--text-dim)`.

## 🔔 Centro de Alertas (Unified Notifications)

As notificações devem ser renderizadas via `notifications.js` usando o componente `notification-card`.

- **Estrutura**: Ícone (badge colorida) + Título + Mensagem + (Opcional) Ação.
- **Tipos**: `info`, `warning`, `danger`.
- **Localização**: Wrap centralizado com `max-width: 800px` para foco total.

## 📱 Responsividade & Layout

- **Sidebar**: Mantém 80px retraída e 260px expandida.
- **Container**: Padding generoso (`60px 80px`) para evitar sensação de "aperto" em telas 1080p+.
- **Z-Index**: Sidebar (2000), Modais (3000), Toasts (4000).

## 🎞️ Animações
O sistema utiliza **GSAP** para:
- Mudança de telas (`opacity` e `scale`).
- Carregamento de cards em cascata.
- Transições de tema via `data-theme`.

---
*Manter a interface "Premium" significa evitar cores grey-tonned opacas e priorizar contrastes puros e efeitos de profundidade.*
