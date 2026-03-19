// ── ESTADO GLOBAL ─────────────────────────────────────────────────────────────
const API_URL = 'http://127.0.0.1:3000/api';
let token = null;
let currentUser = null;

// ── TEMA ──────────────────────────────────────────────────────────────────────
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('btnTheme').textContent = isDark ? '🌙' : '☀️';
    localStorage.setItem('luizateca_theme', isDark ? 'light' : 'dark');
}

function restoreTheme() {
    const saved = localStorage.getItem('luizateca_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('btnTheme').textContent = saved === 'dark' ? '🌙' : '☀️';
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
        token = t;
        currentUser = JSON.parse(u);
        updateNavbar();
        loadMenu();
        showScreen('menuScreen');
    }
}

function clearSession() {
    sessionStorage.clear();
    token = null;
    currentUser = null;
}

// ── NAVEGAÇÃO ─────────────────────────────────────────────────────────────────
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

// ── ALERTS (TOASTS) ───────────────────────────────────────────────────────────
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
async function api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Erro na requisição');
    return data;
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
        alugado:    `<span class="badge badge-danger"><span class="badge-dot"></span>Alugado</span>`,
        ativo:      `<span class="badge badge-warning"><span class="badge-dot"></span>Ativo</span>`,
        atrasado:   `<span class="badge badge-danger"><span class="badge-dot"></span>Atrasado</span>`,
        devolvido:  `<span class="badge badge-success"><span class="badge-dot"></span>Devolvido</span>`,
    };
    return map[status] ?? `<span class="badge">${esc(status)}</span>`;
}

function badgeTipo(tipo) {
    const map = {
        bibliotecario: `<span class="badge badge-gold">Bibliotecário</span>`,
        usuario: `<span class="badge" style="background:rgba(100,100,100,0.10);color:var(--text-dim);border-color:var(--border-s)">Usuário</span>`,
    };
    return map[tipo] ?? `<span class="badge">${esc(tipo)}</span>`;
}

function badgeExemplar(status) {
    const map = {
        disponivel: `<span class="badge badge-success"><span class="badge-dot"></span>Disponível</span>`,
        emprestado: `<span class="badge badge-warning"><span class="badge-dot"></span>Emprestado</span>`,
        danificado: `<span class="badge badge-danger"><span class="badge-dot"></span>Danificado</span>`,
        perdido:    `<span class="badge" style="background:rgba(118,131,144,.12);color:var(--text-faint);border-color:var(--border-m)"><span class="badge-dot" style="background:var(--text-faint)"></span>Perdido</span>`,
    };
    return map[status] ?? `<span class="badge">${esc(status)}</span>`;
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
