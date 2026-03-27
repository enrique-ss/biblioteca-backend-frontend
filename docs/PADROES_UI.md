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
            <button class="btn btn-ghost">← Voltar</button>
        </div>
    </div>
    
    <!-- Barra de pesquisa (se aplicável) -->
    <div class="search-bar">
        <input type="text" id="busca[nome]" class="form-input" 
               placeholder="Buscar por..." oninput="load[nome]Debounced(this.value)">
    </div>
    
    <!-- Banners informativos (se aplicável) -->
    <div id="[nome]Banner" style="display:none;" class="[nome]-banner"></div>
    
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
- **Ordenação**: título, autor, gênero, status
- **Ações**: + Novo Livro, Voltar
- **Posição**: Barra de pesquisa fora do page-header

### 👥 Usuários (usuariosScreen)
- **Pesquisa**: Nome, email
- **Ordenação**: nome, email, tipo
- **Ações**: Voltar
- **Posição**: Barra de pesquisa fora do page-header

### 📋 Empréstimos (alugueisScreen)
- **Pesquisa**: Usuário, livro, exemplar
- **Ordenação**: usuário, livro, empréstimo, prazo, atraso
- **Ações**: Histórico, + Novo Aluguel, Voltar
- **Posição**: Barra de pesquisa fora do page-header
- **Banner**: Avisos de atrasados

### 📚 Histórico (historicoScreen)
- **Pesquisa**: Usuário (ID)
- **Ordenação**: usuário, livro, estado, datas
- **Ações**: Exportar CSV, Voltar
- **Posição**: Barra de pesquisa fora do page-header

### 📊 Estatísticas (statsScreen)
- **Pesquisa**: Não aplicável
- **Ações**: Exportar CSV, Voltar
- **Conteúdo**: Cards de KPI e gráficos

### ✏️ Perfil (perfilScreen)
- **Pesquisa**: Não aplicável
- **Ações**: Voltar
- **Conteúdo**: Formulário de edição

## Classes CSS Padrão

### Estrutura
- `.screen`: Container principal da tela
- `.page-header`: Cabeçalho com título e ações
- `.page-title`: Título da página
- `.page-actions`: Container de botões de ação
- `.search-bar`: Barra de pesquisa
- `.table-wrap`: Container da tabela
- `.pagination`: Paginação

### Tabelas
- `.data-table`: Tabela padrão
- `.sortable`: Coluna ordenável
- `.sort-asc`: Indicador de ordenação ascendente
- `.sort-desc`: Indicador de ordenação descendente
- `.sort-indicator`: Container do indicador visual

### Botões
- `.btn`: Botão base
- `.btn-success`: Botão de ação principal
- `.btn-ghost`: Botão secundário
- `.btn-danger`: Botão de exclusão
- `.btn-sm`: Botão pequeno

## Padrões de Comportamento

### Ordenação
- Click no cabeçalho para alternar asc/desc
- Indicadores visuais (↑/↓)
- Estado mantido no `sortState`

### Pesquisa
- Debounce de 300ms
- Busca em tempo real
- Limpa resultados ao digitar

### Responsividade
- Layout adaptável para mobile
- Botões com tamanhos apropriados
- Tabelas com scroll horizontal se necessário

## Cores e Tema
- **Títulos**: `--text` principal para o título, envolvendo **apenas a primeira palavra** em um `<span>` com cor `--gold`.
- **Botões**: `--success` (verde), `--gold` (dourado), `--crimson` (vermelho)
- **Fundo**: `--bg` principal, `--surface-*` para cards
- **Texto**: `--text`, `--text-dim`, `--text-faint`

## Ícones e Emojis
- **Navegação**: 📚, 👥, 📋, 📊, ✏️
- **Botões**: Sem emojis (apenas texto)
- **Cards**: 🌱 (Acervo), 📖 (Empréstimos), 📈 (Estatísticas)
- **Tema**: 🌙/☀️ (alternar tema)
