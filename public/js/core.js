// ── ESTADO GLOBAL ─────────────────────────────────────────────────────────────
const API_URL = 'http://127.0.0.1:3000/api';
let token = null;
let currentUser = null;

// ── SISTEMA DE ORDENAÇÃO ───────────────────────────────────────────
const sortState = {
    livros: { col: 'titulo', dir: 'asc' },
    usuarios: { col: 'nome', dir: 'asc' },
    alugueis: { col: 'data_aluguel', dir: 'desc' },
    historico: { col: 'data_devolucao', dir: 'desc' }
};

function sortTable(table, col) {
    const state = sortState[table];
    if (!state) return;
    
    state.dir = state.col === col && state.dir === 'asc' ? 'desc' : 'asc';
    state.col = col;
    
    // Atualiza classes visuais
    document.querySelectorAll(`#${table}Screen .sortable`).forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    const th = document.querySelector(`[onclick="sortTable('${table}','${col}')"]`);
    if (th) th.classList.add(state.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    
    // Recarrega os dados da tabela específica
    switch(table) {
        case 'livros': loadLivros(document.getElementById('buscaLivros')?.value || '', 1); break;
        case 'usuarios': loadUsuarios(1, document.getElementById('buscaUsuarios')?.value || ''); break;
        case 'alugueis': loadAlugueis(1); break;
        case 'historico': loadHistorico(1, document.getElementById('buscaHistorico')?.value || ''); break;
    }
}

// ── TEMA ──────────────────────────────────────────────────────────────────────
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('btnThemeIcon').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('luizateca_theme', isDark ? 'light' : 'dark');
}
function restoreTheme() {
    const saved = localStorage.getItem('luizateca_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('btnThemeIcon').textContent = saved === 'dark' ? '🌙' : '☀️';
}

// ── SESSION ───────────────────────────────────────────────────────────────────
function saveSession() {
    sessionStorage.setItem('luizateca_token', token);
    sessionStorage.setItem('luizateca_user', JSON.stringify(currentUser));
}
function restoreSession() {
    const t = sessionStorage.getItem('luizateca_token');
    const u = sessionStorage.getItem('luizateca_user');
    if (t && u) {
        token = t; currentUser = JSON.parse(u);
        updateNavbar(); loadMenu(); showScreen('menuScreen');
    }
}
function clearSession() {
    sessionStorage.clear(); token = null; currentUser = null;
}

// ── NAVEGAÇÃO ─────────────────────────────────────────────────────────────────
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Dispara animação GSAP da página caso a função via animations.js esteja disponível
    if (typeof animateScreenTransition === 'function') {
        animateScreenTransition(id);
    }
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// ── CONFIRM ───────────────────────────────────────────────────────────────────
function showConfirm({ icon = '⚠️', title = 'Confirmar', msg = '', okLabel = 'Confirmar', onOk }) {
    document.getElementById('confirmIcon').textContent = icon;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    document.getElementById('confirmOkBtn').textContent = okLabel;
    document.getElementById('confirmOkBtn').onclick = () => { closeConfirm(); onOk(); };
    document.getElementById('confirmDialog').classList.add('active');
}
function closeConfirm() {
    document.getElementById('confirmDialog').classList.remove('active');
}

// ── ALERTS ────────────────────────────────────────────────────────────────────
function showAlert(message, type = 'success') {
    const icons = { success: '✓', danger: '✕', warning: '⚠' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] ?? '•'}</span><span class="toast-msg">${message}</span>`;
    document.getElementById('alertContainer').appendChild(el);
    setTimeout(() => {
        el.style.cssText += 'opacity:0;transform:translateX(36px);transition:0.32s ease';
        setTimeout(() => el.remove(), 340);
    }, 3400);
}

// ── API ───────────────────────────────────────────────────────────────────────
// Função central que fará todas as requisições HTTP cruzando do Frontend para o Backend.
// Ela já injeta automaticamente o token de segurança para não repetirmos código por todo o site.
async function api(endpoint, options = {}) {
    // Definimos que estamos conversando através de texto no formato JSON
    const headers = { 'Content-Type': 'application/json' };
    
    // Se o usuário já fez login (e tem um token na memória), adicionamos no cabeçalho criptografado
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Dispara a requisição HTTP para o servidor local (ou nuvem) e espera a resposta
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    // Transforma a resposta de texto do servidor em um objeto Javascript manipulável
    const data = await res.json();
    
    // Se o status HTTP da resposta apontar um erro (ex: 400 Bad Request, 500 Internal Error)
    if (!res.ok) {
        // Encerramos a execução disparando um Alerta formatado para a tela do usuário
        throw new Error(data.error || data.message || 'Erro inesperado na requisição');
    }
    
    return data;
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}
function setLoading(tbodyId, cols) {
    document.getElementById(tbodyId).innerHTML =
        `<tr class="loading-row"><td colspan="${cols}"><span class="spinner"></span>Carregando…</td></tr>`;
}
function setEmpty(tbodyId, cols, msg = 'Nenhum registro encontrado.') {
    document.getElementById(tbodyId).innerHTML =
        `<tr><td colspan="${cols}" class="table-empty">${msg}</td></tr>`;
}
function debounce(fn, delay = 350) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ── BADGES ────────────────────────────────────────────────────────────────────
function badgeStatus(status) {
    const map = {
        disponivel: `<span class="badge badge-success"><span class="badge-dot"></span>Disponível</span>`,
        alugado: `<span class="badge badge-danger"><span class="badge-dot"></span>Indisponível</span>`,
        ativo: `<span class="badge badge-warning"><span class="badge-dot"></span>Ativo</span>`,
        atrasado: `<span class="badge badge-danger"><span class="badge-dot"></span>Atrasado</span>`,
        devolvido: `<span class="badge badge-success"><span class="badge-dot"></span>Devolvido</span>`,
    };
    return map[status] ?? `<span class="badge">${esc(status)}</span>`;
}

function badgeTipo(tipo) {
    const map = {
        bibliotecario: `<span class="badge badge-gold">Bibliotecário</span>`,
        usuario: `<span class="badge" style="background:rgba(100,100,100,.10);color:var(--text-dim);border-color:var(--border-s)">Usuário</span>`,
    };
    return map[tipo] ?? `<span class="badge">${esc(tipo)}</span>`;
}

function badgeExemplar(status) {
    const map = {
        disponivel: `<span class="badge badge-success"><span class="badge-dot"></span>Disponível</span>`,
        indisponivel: `<span class="badge badge-danger"><span class="badge-dot"></span>Indisponível</span>`,
        emprestado: `<span class="badge badge-info"><span class="badge-dot"></span>Emprestado</span>`,
        perdido: `<span class="badge" style="background:rgba(118,131,144,.12);color:var(--text-faint);border-color:var(--border-m)"><span class="badge-dot" style="background:var(--text-faint)"></span>Perdido</span>`,
    };
    return map[status] ?? `<span class="badge">${esc(status)}</span>`;
}

// Condição resumida de um livro (mapa de contagens por condição)
function badgeCondicao(condicao = {}) {
    if (!condicao || !Object.keys(condicao).length) return '<span style="color:var(--text-faint)">—</span>';
    const parts = [];
    if (condicao.danificado > 0)
        parts.push(`<span class="badge badge-danger" title="${condicao.danificado} danificado(s)">${condicao.danificado} danif.</span>`);
    if (condicao.perdido > 0)
        parts.push(`<span class="badge" style="background:rgba(118,131,144,.12);color:var(--text-faint);border-color:var(--border-m)" title="${condicao.perdido} perdido(s)">${condicao.perdido} perd.</span>`);
    if (!parts.length)
        return `<span class="badge badge-success">Bom estado</span>`;
    return parts.join(' ');
}

// Badge de condição de um exemplar individual
function badgeCondicaoExemplar(condicao) {
    const map = {
        bom: `<span class="badge badge-success"><span class="badge-dot"></span>Bom</span>`,
        danificado: `<span class="badge badge-danger"><span class="badge-dot"></span>Danificado</span>`,
        perdido: `<span class="badge" style="background:rgba(118,131,144,.12);color:var(--text-faint);border-color:var(--border-m)"><span class="badge-dot" style="background:var(--text-faint)"></span>Perdido</span>`,
    };
    return map[condicao] ?? `<span class="badge">${esc(condicao)}</span>`;
}

// ── PAGINAÇÃO ─────────────────────────────────────────────────────────────────
function renderPagination(containerId, page, pages, onPage) {
    const el = document.getElementById(containerId);
    if (!el || pages <= 1) { if (el) el.innerHTML = ''; return; }
    let html = `<button class="pg-btn" ${page <= 1 ? 'disabled' : ''} onclick="(${onPage})(${page - 1})">‹</button>`;
    const start = Math.max(1, page - 2), end = Math.min(pages, page + 2);
    if (start > 1) html += `<button class="pg-btn" onclick="(${onPage})(1)">1</button>${start > 2 ? '<span class="pg-info">…</span>' : ''}`;
    for (let i = start; i <= end; i++) html += `<button class="pg-btn ${i === page ? 'active' : ''}" onclick="(${onPage})(${i})">${i}</button>`;
    if (end < pages) html += `${end < pages - 1 ? '<span class="pg-info">…</span>' : ''}<button class="pg-btn" onclick="(${onPage})(${pages})">${pages}</button>`;
    html += `<button class="pg-btn" ${page >= pages ? 'disabled' : ''} onclick="(${onPage})(${page + 1})">›</button>`;
    html += `<span class="pg-info">Pág. ${page} de ${pages}</span>`;
    el.innerHTML = html;
}

// ── TECLADO ───────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
    closeConfirm();
});

// ── INIT ──────────────────────────────────────────────────────────────────────
restoreTheme();