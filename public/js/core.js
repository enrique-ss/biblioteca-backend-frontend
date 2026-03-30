/* 
 * --------------------------------------------------------------------------
 * LuizaTeca - Core Engine (Front-end)
 * --------------------------------------------------------------------------
 */

// Configurações Globais
const HOST_IP = window.location.hostname;
const API_URL = `http://${HOST_IP}:3000/api`;
let token = null;
let currentUser = null;

// Sistema de Ordenação de Tabelas
const sortState = {
    livros: { col: 'titulo', dir: 'asc' },
    usuarios: { col: 'nome', dir: 'asc' },
    alugueis: { col: 'data_aluguel', dir: 'desc' },
    historico: { col: 'data_devolucao', dir: 'desc' }
};

// Gerencia a ordenação de uma tabela
function sortTable(table, col) {
    const state = sortState[table];
    if (!state) {
        return;
    }
    
    // Inverte a direção se clicar na mesma coluna
    if (state.col === col && state.dir === 'asc') {
        state.dir = 'desc';
    } else {
        state.dir = 'asc';
    }
    state.col = col;
    
    // Atualiza visualmente os indicadores de ordenação no HTML
    const thsSelector = `#${table}Screen .sortable`;
    document.querySelectorAll(thsSelector).forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    const thCliqueado = document.querySelector(`[onclick="sortTable('${table}','${col}')"]`);
    if (thCliqueado) {
        const classe = state.dir === 'asc' ? 'sort-asc' : 'sort-desc';
        thCliqueado.classList.add(classe);
    }
    
    // Recarrega os dados da tabela específica com a nova ordenação
    if (table === 'livros') {
        const busca = document.getElementById('buscaLivros')?.value || '';
        loadLivros(busca, 1);
    } else if (table === 'usuarios') {
        const busca = document.getElementById('buscaUsuarios')?.value || '';
        loadUsuarios(1, busca);
    } else if (table === 'alugueis') {
        loadAlugueis(1);
    } else if (table === 'historico') {
        const busca = document.getElementById('buscaHistorico')?.value || '';
        loadHistorico(1, busca);
    }
}

// Gerenciamento de Tema (Claro/Escuro)
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const novoTema = isDark ? 'light' : 'dark';
    
    html.setAttribute('data-theme', novoTema);
    document.getElementById('btnThemeIcon').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('luizateca_theme', novoTema);
}

function restoreTheme() {
    const saved = localStorage.getItem('luizateca_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('btnThemeIcon').textContent = saved === 'dark' ? '🌙' : '☀️';
}

// Gerenciamento de Sessão do Usuário
function salvarSessao() {
    sessionStorage.setItem('luizateca_token', token);
    sessionStorage.setItem('luizateca_user', JSON.stringify(currentUser));
}

function restaurarSessao() {
    const t = sessionStorage.getItem('luizateca_token');
    const u = sessionStorage.getItem('luizateca_user');
    if (t && u) {
        token = t; 
        currentUser = JSON.parse(u);
        atualizarNavbar(); 
        carregarMenu(); 
        mostrarTela('menuScreen');
    } else {
        atualizarNavbar(); 
        mostrarTela('loginScreen');
    }
}

function limparSessao() {
    sessionStorage.clear(); 
    token = null; 
    currentUser = null;
}

// =========================================================================
// 🧭 NAVEGAÇÃO E MODAIS
// =========================================================================

// Navegação entre Telas do Sistema
function mostrarTela(id) {
    // Esconde todas as telas
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // Mostra a tela desejada
    const elementoTela = document.getElementById(id);
    if (elementoTela) {
        elementoTela.classList.add('active');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Dispara animação de transição se disponível
    if (typeof animarTransicaoTela === 'function') {
        animarTransicaoTela(id);
    }
}

// Controle de Janelas Modais
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Diálogo de Confirmação Personalizado
function exibirConfirmacao({ icon = '⚠️', title = 'Confirmar', msg = '', okLabel = 'Confirmar', onOk }) {
    document.getElementById('confirmIcon').textContent = icon;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    document.getElementById('confirmOkBtn').textContent = okLabel;
    
    document.getElementById('confirmOkBtn').onclick = () => { 
        fecharConfirmacao(); 
        onOk(); 
    };
    
    document.getElementById('confirmDialog').classList.add('active');
}

function fecharConfirmacao() {
    document.getElementById('confirmDialog').classList.remove('active');
}

// Sistema de Notificações (Toasts)
function exibirAlerta(mensagem, tipo = 'success') {
    const icones = { success: '✓', danger: '✕', warning: '⚠' };
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    
    const icone = icones[tipo] || '•';
    el.innerHTML = `<span class="toast-icon">${icone}</span><span class="toast-msg">${mensagem}</span>`;
    
    document.getElementById('alertContainer').appendChild(el);
    
    // Remove o alerta após alguns segundos
    setTimeout(() => {
        el.style.cssText += 'opacity:0;transform:translateX(36px);transition:0.32s ease';
        setTimeout(() => el.remove(), 340);
    }, 3400);
}

// =========================================================================
// 📡 COMUNICAÇÃO COM O BACKEND (API)
// =========================================================================

// Função central para requisições na API
async function api(endpoint, options = {}) {
    // Configura cabeçalhos padrão
    const headers = { 'Content-Type': 'application/json' };
    
    // Adiciona token de autorização se o usuário estiver logado
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Realiza a chamada fetch
    const resposta = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    // Converte resposta para JSON
    const dados = await resposta.json();
    
    // Verifica se a resposta foi bem-sucedida
    if (!resposta.ok) {
        const mensagemErro = dados.error || dados.message || 'Erro inesperado na requisição';
        throw new Error(mensagemErro);
    }
    
    return dados;
}

// Utilitários de Formatação e Interface
function esc(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatarData(iso) {
    if (!iso) return '—';
    try { 
        return new Date(iso).toLocaleDateString('pt-BR'); 
    } catch { 
        return iso; 
    }
}

function definirCarregando(idTbody, colunas) {
    const tbody = document.getElementById(idTbody);
    if (tbody) {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="${colunas}"><span class="spinner"></span>Carregando…</td></tr>`;
    }
}

function definirVazio(idTbody, colunas, msg = 'Nenhum registro encontrado.') {
    const tbody = document.getElementById(idTbody);
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${colunas}" class="table-empty">${msg}</td></tr>`;
    }
}

function debounce(funcao, atraso = 350) {
    let cronometro;
    return (...argumentos) => { 
        clearTimeout(cronometro); 
        cronometro = setTimeout(() => funcao(...argumentos), atraso); 
    };
}

// Badges de Status e Tipos (Visual)
function badgeStatus(status) {
    const mapas = {
        disponivel: `<span class="badge badge-success"><span class="badge-dot"></span>Disponível</span>`,
        alugado: `<span class="badge badge-danger"><span class="badge-dot"></span>Indisponível</span>`,
        ativo: `<span class="badge badge-warning"><span class="badge-dot"></span>Ativo</span>`,
        atrasado: `<span class="badge badge-danger"><span class="badge-dot"></span>Atrasado</span>`,
        devolvido: `<span class="badge badge-success"><span class="badge-dot"></span>Devolvido</span>`,
    };
    return mapas[status] || `<span class="badge">${esc(status)}</span>`;
}

function badgeTipo(tipo) {
    const mapas = {
        bibliotecario: `<span class="badge badge-gold">Bibliotecário</span>`,
        usuario: `<span class="badge" style="background:var(--gold-bg-bold);color:var(--text);border-color:var(--gold)">Usuário</span>`,
    };
    return mapas[tipo] || `<span class="badge">${esc(tipo)}</span>`;
}

function badgeExemplar(status) {
    const mapas = {
        disponivel: `<span class="badge badge-success"><span class="badge-dot"></span>Disponível</span>`,
        indisponivel: `<span class="badge badge-danger"><span class="badge-dot"></span>Indisponível</span>`,
        emprestado: `<span class="badge badge-info"><span class="badge-dot"></span>Emprestado</span>`,
        perdido: `<span class="badge badge-danger" style="background:var(--crimson);color:white;border-color:white"><span class="badge-dot" style="background:white"></span>Perdido</span>`,
    };
    return mapas[status] || `<span class="badge">${esc(status)}</span>`;
}

function badgeCondicao(condicao = {}) {
    if (!condicao || !Object.keys(condicao).length) {
        return '<span style="color:var(--text)">—</span>';
    }
    
    const partes = [];
    if (condicao.danificado > 0) {
        partes.push(`<span class="badge badge-danger" title="${condicao.danificado} danificado(s)">${condicao.danificado} danif.</span>`);
    }
    if (condicao.perdido > 0) {
        partes.push(`<span class="badge badge-danger" style="background:var(--crimson);color:white;border-color:white" title="${condicao.perdido} perdido(s)">${condicao.perdido} perd.</span>`);
    }
    
    if (partes.length === 0) {
        return `<span class="badge badge-success">Bom estado</span>`;
    }
    return partes.join(' ');
}

function badgeCondicaoExemplar(condicao) {
    const mapas = {
        bom: `<span class="badge badge-success"><span class="badge-dot"></span>Bom</span>`,
        danificado: `<span class="badge badge-danger"><span class="badge-dot"></span>Danificado</span>`,
        perdido: `<span class="badge badge-danger" style="background:var(--crimson);color:white;border-color:white"><span class="badge-dot" style="background:white"></span>Perdido</span>`,
    };
    return mapas[condicao] || `<span class="badge">${esc(condicao)}</span>`;
}

function badgeTipoMulta(tipo) {
    const mapas = {
        atraso: `<span class="badge badge-warning">Atraso</span>`,
        perda: `<span class="badge badge-danger">Perda</span>`,
    };
    return mapas[tipo] || `<span class="badge">${esc(tipo)}</span>`;
}

// Renderização de Paginação Dinâmica
function renderizarPaginacao(idContainer, paginaAtual, totalPaginas, aoMudarPagina) {
    const el = document.getElementById(idContainer);
    if (!el || totalPaginas <= 1) { 
        if (el) el.innerHTML = ''; 
        return; 
    }
    
    let html = `<button class="pg-btn" ${paginaAtual <= 1 ? 'disabled' : ''} onclick="(${aoMudarPagina})(${paginaAtual - 1})">‹</button>`;
    
    const inicio = Math.max(1, paginaAtual - 2);
    const fim = Math.min(totalPaginas, paginaAtual + 2);
    
    if (inicio > 1) {
        html += `<button class="pg-btn" onclick="(${aoMudarPagina})(1)">1</button>`;
        if (inicio > 2) {
            html += `<span class="pg-info">…</span>`;
        }
    }
    
    for (let i = inicio; i <= fim; i++) {
        const classeAtiva = i === paginaAtual ? 'active' : '';
        html += `<button class="pg-btn ${classeAtiva}" onclick="(${aoMudarPagina})(${i})">${i}</button>`;
    }
    
    if (fim < totalPaginas) {
        if (fim < totalPaginas - 1) {
            html += `<span class="pg-info">…</span>`;
        }
        html += `<button class="pg-btn" onclick="(${aoMudarPagina})(${totalPaginas})">${totalPaginas}</button>`;
    }
    
    html += `<button class="pg-btn" ${paginaAtual >= totalPaginas ? 'disabled' : ''} onclick="(${aoMudarPagina})(${paginaAtual + 1})">›</button>`;
    html += `<span class="pg-info">Pág. ${paginaAtual} de ${totalPaginas}</span>`;
    el.innerHTML = html;
}

// Atatalhos de Teclado (Esc para fechar modais)
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => fecharModal(m.id));
        fecharConfirmacao();
    }
});

// Inicialização Inicial
restoreTheme();