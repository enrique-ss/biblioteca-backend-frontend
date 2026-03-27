# Padrões de UI - Sistema LuizaTeca

## Estrutura Padrão das Telas

### 1. Layout Básico
```html
<section id="[nome]Screen" class="screen">
    <div class="page-header">
        <h2 class="page-title"><span>Primeirapalavra</span> Resto do Título</h2>
        <div class="page-actions">
            <!-- Botões de ação principais -->
            <button class="btn btn-success">Ação Principal</button>
            <button class="btn">Secundário</button>
        </div>
    </div>
    
    <!-- Barra de pesquisa (se aplicável) -->
    <div class="search-bar">
        <input type="text" id="busca[nome]" class="form-input" 
               placeholder="Buscar por..." oninput="load[nome]Debounced(this.value)">
    </div>
    
    <!-- Conteúdo principal -->
    <div class="table-wrap">
        <table class="data-table">
            <!-- Tabela -->
        </table>
    </div>
    
    <!-- Paginação -->
    <div class="pagination" id="[nome]Pagination"></div>
</section>
```

## Padrões Específicos por Tela

### 📚 Livros (livrosScreen)
- **Pesquisa**: Título, autor, gênero
- **Ordenação**: Título, autor, gênero, status
- **Ações**: + Novo Livro, Voltar

### 👥 Usuários (usuariosScreen)
- **Pesquisa**: Nome, email
- **Ações**: Voltar

### 📋 Empréstimos (alugueisScreen)
- **Pesquisa**: Usuário, livro, exemplar
- **Ações**: Histórico, + Novo Aluguel, Voltar

### 📊 Estatísticas (statsScreen)
- **Ações**: Exportar CSV, Voltar
- **Conteúdo**: Cards de KPI e gráficos

### 🔔 Alertas (notificacoesScreen)
- **Conteúdo**: Centro de mensagens e pendências personalizadas por tipo de usuário.
- **Estilo**: Centro de Alertas em wrap centralizado (`max-width: 900px`) com fundo `var(--surface)`.

### ✏️ Perfil (perfilScreen)
- **Conteúdo**: Formulário de edição de dados e troca de senha.

## Classes CSS Padrão

### Estrutura
- `.screen`: Container principal da tela
- `.page-header`: Cabeçalho com título e ações
- `.page-title`: Título da página (destaque em `<span>`)
- `.table-wrap`: Container da tabela com fundo glassmorphism

### Botões
- `.btn`: Botão base
- `.btn-success`: Botão principal (Verde)
- `.btn-danger`: Botão de ação perigosa (Carmesim/Vermelho)

## Cores e Tema (Tokens)
- **Accent**: `--accent` (Dourado no Dark / Azul no Light). Usado para destaques, ícones e botões primários.
- **Fundo**: `--bg` (fundo principal), `--surface` (cards e áreas de conteúdo).
- **Semânticas**: `--success` (Verde), `--danger` (Vermelho), `--warning` (Laranja).
- **Texto**: `--text` principal para leitura clara.

## Ícones e Emojis
- **Navegação no Sidebar**: 📚 (Livros), 👥 (Usuários), 📋 (Empréstimos), 📊 (Estatísticas), ✏️ (Perfil), 🚪 (Sair)
- **Alertas**: 🔔 (Nav/Badge)
- **Tema**: 🌙 (Dark) / ☀️ (Light)
