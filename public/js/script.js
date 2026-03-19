// ═══════════════════════════════════════════════════════
//  LuizaTeca — script.js
//  Frontend puro: chama API, renderiza resposta. Sem regras de negócio.
// ═══════════════════════════════════════════════════════

const API_URL = 'http://127.0.0.1:3000/api';
let token = null;
let currentUser = null;

// ─── Tema dark/light ─────────────────────────────────
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

// ─── Sessão ──────────────────────────────────────────
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
    token = null; currentUser = null;
}

// ─── Navegação ───────────────────────────────────────
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

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

// ─── Toast ───────────────────────────────────────────
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

// ─── API helper ──────────────────────────────────────
async function api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Erro na requisição');
    return data;
}

// ─── Helpers ─────────────────────────────────────────
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

// Debounce: evita chamadas excessivas à API enquanto o usuário digita
function debounce(fn, delay = 350) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
const loadLivrosDebounced = debounce((busca) => loadLivros(busca));

// ═══════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════

document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const data = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: document.getElementById('loginEmail').value,
                senha: document.getElementById('loginPassword').value
            })
        });
        token = data.token; currentUser = data.usuario;
        saveSession(); updateNavbar(); loadMenu();
        showScreen('menuScreen'); e.target.reset();
    } catch (err) { showAlert(err.message, 'danger'); }
});

document.getElementById('registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const data = await api('/auth/registrar', {
            method: 'POST',
            body: JSON.stringify({
                nome: document.getElementById('regNome').value,
                email: document.getElementById('regEmail').value,
                senha: document.getElementById('regSenha').value,
                tipo: 'usuario'
            })
        });
        token = data.token; currentUser = data.usuario;
        saveSession(); updateNavbar(); loadMenu();
        showScreen('menuScreen'); e.target.reset();
    } catch (err) { showAlert(err.message, 'danger'); }
});

function logout() {
    showConfirm({
        icon: '🚪', title: 'Encerrar sessão',
        msg: 'Deseja realmente sair?', okLabel: 'Sair',
        onOk() { clearSession(); updateNavbar(); showScreen('loginScreen'); }
    });
}

function updateNavbar() {
    const show = !!currentUser;
    const btn = document.getElementById('btnLogout');
    if (btn) btn.style.display = show ? 'inline-flex' : 'none';
}

// ═══════════════════════════════════════════════════════
//  MENU PRINCIPAL
// ═══════════════════════════════════════════════════════

function loadMenu() {
    document.getElementById('menuUserName').textContent = currentUser.nome;
    const isBib = currentUser.tipo === 'bibliotecario';
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';

    const items = [
        {
            icon: '📚', title: 'Acervo de Livros',
            action() { loadLivros(); showScreen('livrosScreen'); }
        }
    ];

    if (isBib) {
        items.push(
            {
                icon: '📋', title: 'Empréstimos',
                action() { loadAlugueis(); showScreen('alugueisScreen'); }
            },
            {
                icon: '👥', title: 'Usuários',
                action() { loadUsuarios(); showScreen('usuariosScreen'); }
            }
        );
    } else {
        items.push(
            {
                icon: '📖', title: 'Meus Empréstimos',
                action() { loadMeusAlugueis(); showScreen('alugueisScreen'); }
            }
        );
    }

    items.push(
        {
            icon: '🎓', title: 'Quiz Literário',
            action() { showScreen('quizScreen'); quizInit(); }
        },
        {
            icon: '✏️', title: 'Meu Perfil',
            action() { loadPerfil(); showScreen('perfilScreen'); }
        }
    );

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `
            <span class="menu-card-icon">${item.icon}</span>
            <div class="menu-card-title">${item.title}</div>`;
        card.addEventListener('click', item.action);
        grid.appendChild(card);
    });

    document.getElementById('btnAddLivro').style.display = isBib ? 'inline-flex' : 'none';
    document.getElementById('btnNovoAluguel').style.display = isBib ? 'inline-flex' : 'none';

    // Carrega dashboard em paralelo sem bloquear o menu
    loadDashboard();
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════

async function loadDashboard() {
    const container = document.getElementById('dashboardStats');
    if (!container) return;
    container.innerHTML = '<div class="dashboard-loading"><span class="spinner"></span></div>';
    try {
        const data = await api('/stats');
        container.innerHTML = '';
        data.stats.forEach(s => {
            const card = document.createElement('div');
            card.className = 'dash-card';
            card.innerHTML = `
                <div class="dash-label">${esc(s.label)}</div>
                <div class="dash-valor ${esc(s.cor)}">${esc(String(s.valor))}</div>`;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = '';
    }
}

// ═══════════════════════════════════════════════════════
//  2. LIVROS
// ═══════════════════════════════════════════════════════

let livrosAbortController = null;

async function loadLivros(busca = '') {
    // Cancela requisição anterior se ainda estiver pendente
    if (livrosAbortController) livrosAbortController.abort();
    livrosAbortController = new AbortController();
    setLoading('livrosTbody', 7);
    try {
        const endpoint = busca.trim() ? `/livros?busca=${encodeURIComponent(busca.trim())}` : '/livros';
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}${endpoint}`, { headers, signal: livrosAbortController.signal });
        if (!res.ok) throw new Error((await res.json()).error);
        const data = await res.json();
        const tbody = document.getElementById('livrosTbody');
        tbody.innerHTML = '';
        if (!data.length) { setEmpty('livrosTbody', 7, 'Nenhum livro encontrado.'); return; }
        data.forEach(livro => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--text-faint)">${esc(livro.id)}</td>
                <td><strong>${esc(livro.titulo)}</strong></td>
                <td>${esc(livro.autor)}</td>
                <td>${esc(livro.genero)}</td>
                <td style="color:var(--text-dim)">${esc(livro.corredor ?? '—')}-${esc(livro.prateleira ?? '—')}</td>
                <td style="text-align:center">${esc(livro.exemplares_disponiveis)}/${esc(livro.exemplares)}</td>
                <td>${badgeStatus(livro.status)}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        if (err.name === 'AbortError') return; // requisição cancelada, ignora
        setEmpty('livrosTbody', 7, err.message);
        showAlert(err.message, 'danger');
    }
}

document.getElementById('addLivroForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await api('/livros', {
            method: 'POST',
            body: JSON.stringify({
                titulo: document.getElementById('livroTitulo').value,
                autor: document.getElementById('livroAutor').value,
                ano_lancamento: parseInt(document.getElementById('livroAno').value),
                genero: document.getElementById('livroGenero').value,
                isbn: document.getElementById('livroIsbn').value || null,
                exemplares: parseInt(document.getElementById('livroExemplares').value) || 1
            })
        });
        showAlert('Livro cadastrado!');
        closeModal('addLivroModal'); e.target.reset(); loadLivros();
    } catch (err) { showAlert(err.message, 'danger'); }
});

// ═══════════════════════════════════════════════════════
//  3. EMPRÉSTIMOS
// ═══════════════════════════════════════════════════════

// Voltar: bibliotecário → sub-menu; usuário → menu principal
function voltarAlugueis() {
    showScreen('menuScreen');
}

function setHead(html) {
    const el = document.getElementById('alugueisHead');
    if (el) el.innerHTML = html;
}

async function loadAlugueis() {
    document.getElementById('alugueisTitle').innerHTML = `📋 <span>Empréstimos</span>`;
    setHead(`<tr><th>#</th><th>Usuário</th><th>Livro</th><th>Empréstimo</th><th>Prazo</th><th>Status</th><th>Ações</th></tr>`);
    setLoading('alugueisTbody', 7);
    try {
        const data = await api('/alugueis/todos');
        renderAlugueisCompleto(data);
    } catch (err) {
        setEmpty('alugueisTbody', 7, err.message);
        showAlert(err.message, 'danger');
    }
}

async function loadMeusAlugueis() {
    document.getElementById('alugueisTitle').innerHTML = `📖 <span>Meus Empréstimos</span>`;
    setHead(`<tr><th>#</th><th>Livro</th><th>Empréstimo</th><th>Prazo</th><th>Status</th></tr>`);
    setLoading('alugueisTbody', 5);
    try {
        const data = await api('/alugueis/meus');
        renderAlugueisMeus(data);
    } catch (err) {
        setEmpty('alugueisTbody', 5, err.message);
        showAlert(err.message, 'danger');
    }
}

// Bibliotecário — renderiza o que o backend mandou, incluindo pode_devolver
function renderAlugueisCompleto(data) {
    const tbody = document.getElementById('alugueisTbody');
    tbody.innerHTML = '';
    if (!data.length) { setEmpty('alugueisTbody', 7, 'Nenhum empréstimo encontrado.'); return; }
    data.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:var(--text-faint)">${esc(a.id)}</td>
            <td>${esc(a.usuario ?? '—')}</td>
            <td><strong>${esc(a.titulo ?? '—')}</strong></td>
            <td style="color:var(--text-dim)">${fmtDate(a.data_aluguel)}</td>
            <td style="color:var(--text-dim)">${fmtDate(a.prazo)}</td>
            <td>${badgeStatus(a.status)}</td>
            <td>${a.pode_devolver
                ? `<button class="btn btn-success btn-sm" onclick="devolverLivro(${a.id})">Devolver</button>`
                : `<span style="color:var(--text-faint)">—</span>`
            }</td>`;
        tbody.appendChild(tr);
    });
}

// Usuário — só visualiza, sem coluna de usuário nem ações
function renderAlugueisMeus(data) {
    const tbody = document.getElementById('alugueisTbody');
    tbody.innerHTML = '';
    if (!data.length) { setEmpty('alugueisTbody', 5, 'Nenhum empréstimo encontrado.'); return; }
    data.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:var(--text-faint)">${esc(a.id)}</td>
            <td><strong>${esc(a.titulo ?? '—')}</strong></td>
            <td style="color:var(--text-dim)">${fmtDate(a.data_aluguel)}</td>
            <td style="color:var(--text-dim)">${fmtDate(a.prazo)}</td>
            <td>${badgeStatus(a.status)}</td>`;
        tbody.appendChild(tr);
    });
}

async function prepareAluguelModal() {
    try {
        const [livros, usuarios] = await Promise.all([
            api('/livros?status=disponivel'),
            api('/usuarios')
        ]);
        const selL = document.getElementById('aluguelLivro');
        const selU = document.getElementById('aluguelUsuario');
        selL.innerHTML = '<option value="">Selecione um livro…</option>';
        selU.innerHTML = '<option value="">Selecione um usuário…</option>';
        livros.forEach(l => selL.innerHTML += `<option value="${l.id}">${esc(l.titulo)} — ${esc(l.autor)}</option>`);
        usuarios.forEach(u => selU.innerHTML += `<option value="${u.id}">${esc(u.nome)} (${esc(u.email)})</option>`);
        openModal('addAluguelModal');
    } catch (err) { showAlert(err.message, 'danger'); }
}

document.getElementById('addAluguelForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await api('/alugueis', {
            method: 'POST',
            body: JSON.stringify({
                livro_id: parseInt(document.getElementById('aluguelLivro').value),
                usuario_id: parseInt(document.getElementById('aluguelUsuario').value)
            })
        });
        showAlert('Empréstimo registrado!');
        closeModal('addAluguelModal'); e.target.reset();
        loadAlugueis(); showScreen('alugueisScreen');
    } catch (err) { showAlert(err.message, 'danger'); }
});


function devolverLivro(id) {
    showConfirm({
        icon: '📖', title: 'Confirmar devolução',
        msg: 'Registrar a devolução deste livro?', okLabel: 'Devolver',
        async onOk() {
            try {
                await api(`/alugueis/${id}/devolver`, { method: 'PUT' });
                showAlert('Livro devolvido!'); loadAlugueis();
            } catch (err) { showAlert(err.message, 'danger'); }
        }
    });
}

// ═══════════════════════════════════════════════════════
//  4. USUÁRIOS
// ═══════════════════════════════════════════════════════

async function loadUsuarios() {
    setLoading('usuariosTbody', 5);
    try {
        const data = await api('/usuarios');
        const tbody = document.getElementById('usuariosTbody');
        tbody.innerHTML = '';
        if (!data.length) { setEmpty('usuariosTbody', 5, 'Nenhum usuário cadastrado.'); return; }
        data.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--text-faint)">${esc(u.id)}</td>
                <td><strong>${esc(u.nome)}</strong></td>
                <td style="color:var(--text-dim)">${esc(u.email)}</td>
                <td>${badgeTipo(u.tipo)}</td>
                <td>
                    <div class="td-actions">
                        <button class="btn btn-ghost btn-sm" onclick='editarUsuario(${JSON.stringify(u)})'>Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="excluirUsuario(${u.id}, '${esc(u.nome)}')">Excluir</button>
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        setEmpty('usuariosTbody', 5, err.message);
        showAlert(err.message, 'danger');
    }
}

function editarUsuario(u) {
    document.getElementById('editUsuarioId').value = u.id;
    document.getElementById('editUsuarioNome').value = u.nome;
    document.getElementById('editUsuarioEmail').value = u.email;
    document.getElementById('editUsuarioTipo').value = u.tipo;
    openModal('editUsuarioModal');
}

document.getElementById('editUsuarioForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('editUsuarioId').value;
    try {
        await api(`/usuarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                nome: document.getElementById('editUsuarioNome').value,
                email: document.getElementById('editUsuarioEmail').value,
                tipo: document.getElementById('editUsuarioTipo').value
            })
        });
        showAlert('Usuário atualizado!');
        closeModal('editUsuarioModal'); loadUsuarios();
    } catch (err) { showAlert(err.message, 'danger'); }
});

function excluirUsuario(id, nome) {
    showConfirm({
        icon: '🗑️', title: 'Excluir usuário',
        msg: `Excluir "${nome}"? Esta ação é irreversível.`, okLabel: 'Excluir',
        async onOk() {
            try {
                await api(`/usuarios/${id}`, { method: 'DELETE' });
                showAlert('Usuário excluído!'); loadUsuarios();
            } catch (err) { showAlert(err.message, 'danger'); }
        }
    });
}

// ═══════════════════════════════════════════════════════
//  5. MEU PERFIL
// ═══════════════════════════════════════════════════════

function loadPerfil() {
    document.getElementById('perfilNome').value = currentUser.nome;
    document.getElementById('perfilEmail').value = currentUser.email;
    document.getElementById('perfilSenha').value = '';

    document.getElementById('perfilInfo').innerHTML = `
        <div class="perfil-field">
            <div class="perfil-field-label">Nome</div>
            <div class="perfil-field-value">${esc(currentUser.nome)}</div>
        </div>
        <div class="perfil-field">
            <div class="perfil-field-label">Email</div>
            <div class="perfil-field-value" style="color:var(--text-dim)">${esc(currentUser.email)}</div>
        </div>
        <div class="perfil-field">
            <div class="perfil-field-label">Tipo</div>
            <div class="perfil-field-value" style="margin-top:4px">${badgeTipo(currentUser.tipo)}</div>
        </div>`;
}

document.getElementById('editPerfilForm').addEventListener('submit', async e => {
    e.preventDefault();
    const nome = document.getElementById('perfilNome').value;
    const email = document.getElementById('perfilEmail').value;
    const senha = document.getElementById('perfilSenha').value;
    const body = { nome, email };
    if (senha) body.senha = senha;
    try {
        const data = await api('/auth/perfil', { method: 'PUT', body: JSON.stringify(body) });
        currentUser.nome = data.usuario.nome;
        currentUser.email = data.usuario.email;
        saveSession(); updateNavbar(); loadPerfil();
        showAlert(data.message || 'Perfil atualizado!');
    } catch (err) { showAlert(err.message, 'danger'); }
});

// ─── Badges ──────────────────────────────────────────
function badgeStatus(status) {
    const map = {
        disponivel: `<span class="badge badge-success"><span class="badge-dot"></span>Disponível</span>`,
        alugado: `<span class="badge badge-danger"><span class="badge-dot"></span>Alugado</span>`,
        ativo: `<span class="badge badge-warning"><span class="badge-dot"></span>Ativo</span>`,
        atrasado: `<span class="badge badge-danger"><span class="badge-dot"></span>Atrasado</span>`,
        devolvido: `<span class="badge badge-success"><span class="badge-dot"></span>Devolvido</span>`,
        '🟡 PENDENTE': `<span class="badge badge-warning"><span class="badge-dot"></span>Pendente</span>`,
        '🟢 ENTREGUE': `<span class="badge badge-success"><span class="badge-dot"></span>Entregue</span>`,
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

// ─── ESC fecha modais ─────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
    closeConfirm();
});

// ─── Init ─────────────────────────────────────────────
restoreTheme();
restoreSession();

// ═══════════════════════════════════════════════════════
//  QUIZ — motor completo integrado ao LuizaTeca
// ═══════════════════════════════════════════════════════

const QUIZ_XP_PER_LEVEL = [0, 100, 250, 450, 700, 1000, 1400, 1850, 2350, 2900, 3500];

let quizState = {
    ageGroup: null,
    xp: 0, level: 1, hp: 5,
    currentCat: null,
    currentLesson: null,
    quizStep: 0,
    correctCount: 0,
    completedLessons: [],
};

let quizData = null;

// Dados das lições (conteúdo completo do Outro Nível)
const QUIZ_DATA = {
    infantil: {
        greeting: 'Infantil (6–8 anos)',
        categories: [
            { id: 'contos', name: 'Contos e Fábulas', icon: '🐺', feminist: false },
            { id: 'poesia', name: 'Poesia', icon: '🎵', feminist: false },
            { id: 'classicos', name: 'Clássicos Infantis', icon: '📖', feminist: false },
            { id: 'escritoras', name: 'Escritoras do Brasil', icon: '✍️', feminist: true },
        ],
        lessons: {
            contos: [
                {
                    id: 'inf_c1', title: 'O que são Contos?', icon: '📜', req: 1,
                    content: `<h1>📜</h1><h2>Contos: Histórias Curtas e Mágicas!</h2><p>Um conto é uma história curta com começo, meio e fim.</p><h3>Partes de um conto</h3><ul><li>🌅 Início: apresenta os personagens e o lugar</li><li>😮 Conflito: algo acontece e cria um problema</li><li>🎉 Desfecho: o problema é resolvido (ou não!)</li></ul><h3>Tipos de conto</h3><ul><li>🐺 Contos de fadas: com magia e encantamento</li><li>🦊 Fábulas: com animais que ensinam uma lição</li><li>👻 Contos de assombração: cheios de mistério</li></ul>`,
                    quiz: [{ q: "O que é um conto?", opts: ["Um livro enorme", "Uma história curta com começo, meio e fim", "Uma música", "Um poema longo"], a: 1 }, { q: "O que é uma fábula?", opts: ["Uma história sem fim", "Um conto com animais que ensinam uma lição", "Um poema de amor", "Um livro de receitas"], a: 1 }, { q: "Qual é a parte onde o problema é resolvido?", opts: ["O início", "O conflito", "O desfecho", "O título"], a: 2 }]
                },
                {
                    id: 'inf_c2', title: 'Fábulas de Esopo', icon: '🦊', req: 2,
                    content: `<h1>🦊</h1><h2>Esopo: O Pai das Fábulas</h2><div class="quiz-author-box"><span class="quiz-author-name">Esopo (séc. VI a.C. — Grécia Antiga)</span></div><p>Esopo foi um escravo grego que criou histórias com animais para ensinar lições de vida.</p><h3>Fábulas famosas</h3><ul><li>🐢 A Lebre e a Tartaruga: devagar se vai longe</li><li>🍇 A Raposa e as Uvas: quem não pode, diz que não quer</li><li>🐺 O Pastorzinho Mentiroso: quem mente perde a confiança</li><li>🐜 A Cigarra e a Formiga: trabalhe hoje para amanhã</li></ul>`,
                    quiz: [{ q: "Quem foi Esopo?", opts: ["Um rei grego", "Um escravo grego que criou fábulas", "Um guerreiro romano", "Um deus grego"], a: 1 }, { q: "Qual é a lição da 'A Lebre e a Tartaruga'?", opts: ["Que lebres são melhores", "Devagar se vai longe", "Que tartarugas são rápidas", "Que corridas são divertidas"], a: 1 }, { q: "O que é a moral de uma fábula?", opts: ["O nome dos personagens", "A lição de vida que a história ensina", "O lugar onde passa", "O título do livro"], a: 1 }]
                },
                {
                    id: 'inf_c3', title: 'Monteiro Lobato', icon: '🌳', req: 3,
                    content: `<h1>🌳</h1><h2>Monteiro Lobato: O Criador do Sítio do Picapau Amarelo</h2><div class="quiz-author-box"><span class="quiz-author-name">Monteiro Lobato (1882–1948) — Brasil</span></div><p>Monteiro Lobato foi o maior escritor infantil do Brasil.</p><h3>Personagens do Sítio</h3><ul><li>🌟 Narizinho e Pedrinho: as crianças curiosas</li><li>🪆 Emília: a boneca de pano falante</li><li>🦒 Visconde de Sabugosa: cheio de conhecimento</li><li>👵 Dona Benta: a avó sábia que conta histórias</li></ul>`,
                    quiz: [{ q: "Quem criou o Sítio do Picapau Amarelo?", opts: ["Machado de Assis", "Monteiro Lobato", "Carlos Drummond", "Clarice Lispector"], a: 1 }, { q: "Quem é Emília?", opts: ["Uma menina", "A avó", "Uma boneca de pano falante", "Uma fada"], a: 2 }, { q: "Monteiro Lobato foi importante porque:", opts: ["Escrevia só para adultos", "Criou a maior obra da literatura infantil brasileira", "Não gostava de crianças", "Só escrevia poesia"], a: 1 }]
                },
            ],
            poesia: [
                {
                    id: 'inf_p1', title: 'O que é Poesia?', icon: '🎵', req: 1,
                    content: `<h1>🎵</h1><h2>Poesia: Palavras que Cantam!</h2><p>A poesia usa palavras com ritmo e rima!</p><h3>Elementos da poesia</h3><ul><li>🎶 Ritmo: o "balanço" das palavras</li><li>🔤 Rima: quando palavras terminam com o mesmo som</li><li>📝 Verso: cada linha do poema</li><li>📖 Estrofe: um grupo de versos</li></ul>`,
                    quiz: [{ q: "O que é uma rima?", opts: ["Um erro de escrita", "Quando palavras terminam com o mesmo som", "Um tipo de pontuação", "Uma cor"], a: 1 }, { q: "O que chamamos de 'verso'?", opts: ["O título", "Cada linha do poema", "O autor", "A moral"], a: 1 }, { q: "O ritmo na poesia é parecido com:", opts: ["Uma receita", "Uma música", "Um mapa", "Uma equação"], a: 1 }]
                },
                {
                    id: 'inf_p2', title: 'Vinícius de Moraes', icon: '🌹', req: 2,
                    content: `<h1>🌹</h1><h2>Vinícius de Moraes: O Poetinha</h2><div class="quiz-author-box"><span class="quiz-author-name">Vinícius de Moraes (1913–1980) — Brasil</span></div><p>Poeta e compositor, carinhosamente chamado de "O Poetinha".</p><h3>Obras famosas</h3><ul><li>🐛 "A Arca de Noé": poemas para crianças</li><li>🌺 "A Rosa de Hiroshima": poema sobre a paz</li><li>🎸 "Garota de Ipanema": uma das músicas mais tocadas do mundo</li></ul>`,
                    quiz: [{ q: "Como Vinícius era chamado?", opts: ["O Grandão", "O Poetinha", "O Escritor", "O Cantor"], a: 1 }, { q: "Qual livro infantil Vinícius escreveu?", opts: ["Iracema", "A Arca de Noé", "Dom Casmurro", "Sagarana"], a: 1 }, { q: "Além de poeta, Vinícius também era:", opts: ["Pintor", "Compositor musical", "Escultor", "Ator"], a: 1 }]
                },
            ],
            classicos: [
                {
                    id: 'inf_cl1', title: 'Hans Christian Andersen', icon: '❄️', req: 1,
                    content: `<h1>❄️</h1><h2>Andersen: O Contador de Histórias Mágicas</h2><div class="quiz-author-box"><span class="quiz-author-name">Hans Christian Andersen (1805–1875) — Dinamarca</span></div><p>Criou contos mágicos lidos no mundo todo!</p><h3>Contos famosos</h3><ul><li>❄️ A Rainha da Neve</li><li>🌊 A Pequena Sereia</li><li>🎭 O Patinho Feio</li></ul>`,
                    quiz: [{ q: "De que país era Andersen?", opts: ["Brasil", "França", "Dinamarca", "Inglaterra"], a: 2 }, { q: "Lição do 'O Patinho Feio'?", opts: ["Que patos são maus", "Quem parece diferente pode ser especial", "Que cisnes são feios", "A aparência não muda"], a: 1 }, { q: "Qual personagem vive no fundo do mar?", opts: ["A Rainha da Neve", "O Patinho", "A Pequena Sereia", "Cinderela"], a: 2 }]
                },
                {
                    id: 'inf_cl2', title: 'Irmãos Grimm', icon: '🏰', req: 2,
                    content: `<h1>🏰</h1><h2>Irmãos Grimm: Coletores de Contos de Fadas</h2><div class="quiz-author-box"><span class="quiz-author-name">Jacob e Wilhelm Grimm (séc. XIX) — Alemanha</span></div><p>Viajaram pela Alemanha coletando histórias antigas do povo.</p><h3>Contos coletados</h3><ul><li>👠 Cinderela</li><li>🍎 Branca de Neve</li><li>🐺 Chapeuzinho Vermelho</li><li>🏠 João e Maria</li></ul>`,
                    quiz: [{ q: "O que os Irmãos Grimm fizeram?", opts: ["Inventaram os contos", "Coletaram histórias antigas e escreveram", "Pintaram ilustrações", "Criaram o cinema"], a: 1 }, { q: "Qual conto foi coletado por eles?", opts: ["A Pequena Sereia", "Chapeuzinho Vermelho", "Pinóquio", "O Pequeno Príncipe"], a: 1 }, { q: "Por que preservar histórias antigas?", opts: ["Não é importante", "Para que não se percam", "Para ganhar dinheiro", "Para enganar crianças"], a: 1 }]
                },
                {
                    id: 'inf_cl3', title: 'Machado de Assis', icon: '🎩', req: 3,
                    content: `<h1>🎩</h1><h2>Machado de Assis: O Maior Escritor do Brasil</h2><div class="quiz-author-box"><span class="quiz-author-name">Machado de Assis (1839–1908) — Rio de Janeiro, Brasil</span></div><p>O maior escritor da literatura brasileira. Nasceu pobre e se tornou um gênio das letras!</p><h3>Curiosidades</h3><ul><li>Fundou a Academia Brasileira de Letras em 1897</li><li>Escreveu romances, contos e poesias</li><li>Estilo cheio de ironia e inteligência</li></ul>`,
                    quiz: [{ q: "Machado de Assis é considerado:", opts: ["Um escritor português", "O maior escritor da literatura brasileira", "Um músico", "Um pintor"], a: 1 }, { q: "O que ele fundou em 1897?", opts: ["O Museu Nacional", "A Academia Brasileira de Letras", "O Jornal do Brasil", "A Biblioteca Nacional"], a: 1 }, { q: "Característica do estilo de Machado:", opts: ["Só histórias de amor", "Ironia e inteligência", "Só poesia rimada", "Aventuras medievais"], a: 1 }]
                },
            ],
            escritoras: [
                {
                    id: 'inf_e1', title: 'Cora Coralina', icon: '🌸', req: 1,
                    content: `<h1>🌸</h1><h2>Cora Coralina: A Poetisa dos Becos</h2><div class="quiz-author-box"><span class="quiz-author-name">Cora Coralina (1889–1985) — Goiás, Brasil</span></div><p>Escrevia desde jovem, mas só publicou seu primeiro livro aos 76 anos!</p><h3>O que ela nos ensina</h3><ul><li>Nunca é tarde para realizar seus sonhos</li><li>A vida simples tem muita poesia</li><li>Escrevia sobre mulheres, crianças e o cotidiano</li></ul>`,
                    quiz: [{ q: "Onde Cora Coralina nasceu?", opts: ["São Paulo", "Goiás", "Rio de Janeiro", "Bahia"], a: 1 }, { q: "Com quantos anos publicou seu primeiro livro?", opts: ["10 anos", "20 anos", "76 anos", "Nunca publicou"], a: 2 }, { q: "O que Cora nos ensina?", opts: ["Só jovens podem escrever", "Nunca é tarde para realizar sonhos", "Escrever é fácil", "Só ricos publicam"], a: 1 }]
                },
                {
                    id: 'inf_e2', title: 'Ruth Rocha', icon: '📚', req: 2,
                    content: `<h1>📚</h1><h2>Ruth Rocha: A Rainha da Literatura Infantil</h2><div class="quiz-author-box"><span class="quiz-author-name">Ruth Rocha (1931–) — São Paulo, Brasil</span></div><p>Uma das maiores escritoras infantis do Brasil!</p><h3>Livros famosos</h3><ul><li>🎪 "Marcelo, Marmelo, Martelo"</li><li>👑 "O Reizinho Mandão"</li><li>📖 "Quando a Escola é de Vidro"</li></ul>`,
                    quiz: [{ q: "Ruth Rocha escreve para:", opts: ["Só adultos", "Crianças", "Universitários", "Idosos"], a: 1 }, { q: "Qual livro ela escreveu?", opts: ["Dom Casmurro", "O Reizinho Mandão", "A Hora da Estrela", "Sagarana"], a: 1 }, { q: "Quais valores seus livros ensinam?", opts: ["Ganância", "Respeito, liberdade e amizade", "Egoísmo", "Competição"], a: 1 }]
                },
                {
                    id: 'inf_e3', title: 'Ana Maria Machado', icon: '🦋', req: 3,
                    content: `<h1>🦋</h1><h2>Ana Maria Machado: Uma Viagem pela Imaginação</h2><div class="quiz-author-box"><span class="quiz-author-name">Ana Maria Machado (1941–) — Rio de Janeiro, Brasil</span></div><p>Ganhou o prêmio mais importante da literatura infantil do mundo!</p><h3>Conquistas</h3><ul><li>🏆 Prêmio Hans Christian Andersen</li><li>📖 Mais de 100 livros publicados</li><li>Presidiu a Academia Brasileira de Letras</li></ul>`,
                    quiz: [{ q: "Qual prêmio ela ganhou?", opts: ["Oscar", "Prêmio Hans Christian Andersen", "Grammy", "Bola de Ouro"], a: 1 }, { q: "Esse prêmio é o 'Nobel' de:", opts: ["Ciências", "Literatura infantil", "Medicina", "Matemática"], a: 1 }, { q: "Quantos livros publicou?", opts: ["5", "20", "Mais de 100", "Apenas 2"], a: 2 }]
                },
            ],
        }
    },
    infantojuvenil: {
        greeting: 'Infanto-Juvenil (9–11 anos)',
        categories: [
            { id: 'generos', name: 'Gêneros Literários', icon: '📚', feminist: false },
            { id: 'autores', name: 'Grandes Autores', icon: '🖊️', feminist: false },
            { id: 'movimentos', name: 'Movimentos Literários', icon: '🏛️', feminist: false },
            { id: 'escritoras', name: 'Literatura Feminina', icon: '✍️', feminist: true },
        ],
        lessons: {
            generos: [
                {
                    id: 'ij_g1', title: 'Prosa e Poesia', icon: '📝', req: 1,
                    content: `<h1>📝</h1><h2>As Duas Grandes Formas da Literatura</h2><p>Toda literatura se divide em prosa e poesia.</p><h3>Prosa</h3><ul><li>Texto contínuo, como falamos</li><li>Inclui romances, contos e crônicas</li></ul><h3>Poesia</h3><ul><li>Organizada em versos e estrofes</li><li>Usa ritmo, rima e musicalidade</li></ul>`,
                    quiz: [{ q: "Diferença entre prosa e poesia?", opts: ["Nenhuma", "Prosa é contínua; poesia é em versos", "Prosa é mais curta", "Poesia é mais antiga"], a: 1 }, { q: "Qual é um gênero em prosa?", opts: ["Soneto", "Romance", "Haiku", "Ode"], a: 1 }, { q: "O que caracteriza a poesia?", opts: ["Rima obrigatória", "Ritmo, versos e emoção concentrada", "É sempre longa", "Só trata de amor"], a: 1 }]
                },
                {
                    id: 'ij_g2', title: 'Conto, Crônica e Romance', icon: '📖', req: 2,
                    content: `<h1>📖</h1><h2>Subgêneros da Prosa</h2><h3>Conto</h3><ul><li>História curta, um único conflito</li></ul><h3>Crônica</h3><ul><li>Texto curto sobre o cotidiano</li><li>Tom leve ou humorístico</li><li>Comum em jornais</li></ul><h3>Romance</h3><ul><li>Narrativa longa e complexa</li><li>Muitos personagens e subtramas</li></ul>`,
                    quiz: [{ q: "Característica principal do conto?", opts: ["É muito longo", "Curto, único conflito central", "Muitos personagens", "Sempre humorístico"], a: 1 }, { q: "Onde é comum encontrar crônicas?", opts: ["Enciclopédias", "Jornais e revistas", "Dicionários", "Bulas"], a: 1 }, { q: "O que diferencia o romance?", opts: ["É sempre bonito", "Longo, muitos personagens e subtramas", "Sempre sobre amor", "Menos de 10 páginas"], a: 1 }]
                },
                {
                    id: 'ij_g3', title: 'Literatura de Cordel', icon: '🪢', req: 3,
                    content: `<h1>🪢</h1><h2>Cordel: A Literatura do Povo Nordestino</h2><p>Tradição nordestina: histórias em versos rimados em folhetos pendurados em cordas!</p><h3>Características</h3><ul><li>Versos rimados com métrica definida</li><li>Temas: amor, política, heróis</li><li>Ilustrações em xilogravura</li></ul>`,
                    quiz: [{ q: "De onde vem o cordel?", opts: ["Sul do Brasil", "Nordeste brasileiro", "Portugal", "Europa medieval"], a: 1 }, { q: "Como eram expostos os folhetos?", opts: ["Em vitrines", "Pendurados em cordas nas feiras", "Em caixas", "Em bibliotecas"], a: 1 }, { q: "Ilustração típica do cordel?", opts: ["Fotografia", "Pintura a óleo", "Xilogravura", "Desenho digital"], a: 2 }]
                },
            ],
            autores: [
                {
                    id: 'ij_a1', title: 'Carlos Drummond de Andrade', icon: '💎', req: 1,
                    content: `<h1>💎</h1><h2>Drummond: O Poeta da Pedra no Caminho</h2><div class="quiz-author-box"><span class="quiz-author-name">Carlos Drummond de Andrade (1902–1987) — Minas Gerais</span></div><p>O maior poeta moderno do Brasil.</p><h3>Obras</h3><ul><li>🪨 "No meio do caminho tinha uma pedra": seu poema mais famoso</li><li>Modernismo Brasileiro (2ª fase)</li></ul>`,
                    quiz: [{ q: "De qual estado era Drummond?", opts: ["São Paulo", "Bahia", "Minas Gerais", "Rio Grande do Sul"], a: 2 }, { q: "Poema mais famoso de Drummond?", opts: ["A Rosa de Hiroshima", "No meio do caminho tinha uma pedra", "Canção do Exílio", "I-Juca Pirama"], a: 1 }, { q: "A qual movimento pertencia?", opts: ["Romantismo", "Barroco", "Modernismo", "Parnasianismo"], a: 2 }]
                },
                {
                    id: 'ij_a2', title: 'Guimarães Rosa', icon: '🌵', req: 2,
                    content: `<h1>🌵</h1><h2>Guimarães Rosa: O Criador do Sertão Literário</h2><div class="quiz-author-box"><span class="quiz-author-name">João Guimarães Rosa (1908–1967) — Minas Gerais</span></div><p>Transformou a língua portuguesa criando palavras novas.</p><h3>Obras</h3><ul><li>🌵 "Grande Sertão: Veredas": seu romance mais importante</li><li>Era médico antes de escritor</li></ul>`,
                    quiz: [{ q: "Romance mais famoso?", opts: ["Dom Casmurro", "Grande Sertão: Veredas", "O Cortiço", "Iracema"], a: 1 }, { q: "O que ele fazia com a língua?", opts: ["Simplificava", "Criava palavras novas e misturava o falar sertanejo", "Só usava estrangeirismos", "Escrevia sem pontuação"], a: 1 }, { q: "Profissão antes de escritor?", opts: ["Professor", "Advogado", "Médico", "Engenheiro"], a: 2 }]
                },
                {
                    id: 'ij_a3', title: 'Graciliano Ramos', icon: '🏜️', req: 3,
                    content: `<h1>🏜️</h1><h2>Graciliano Ramos: A Voz dos Oprimidos</h2><div class="quiz-author-box"><span class="quiz-author-name">Graciliano Ramos (1892–1953) — Alagoas</span></div><p>Denunciou a miséria e a seca do sertão.</p><h3>Obras</h3><ul><li>🐕 "Vidas Secas": família de retirantes</li><li>🔗 "Memórias do Cárcere"</li></ul>`,
                    quiz: [{ q: "Livro mais famoso?", opts: ["Grande Sertão", "Vidas Secas", "Macunaíma", "Capitães da Areia"], a: 1 }, { q: "Tema central de 'Vidas Secas'?", opts: ["Riqueza da elite", "Miséria e seca no sertão", "Aventuras no mar", "Vida na cidade"], a: 1 }, { q: "Por que foi preso?", opts: ["Por roubo", "Por ser opositor ao governo Vargas", "Por livro proibido", "Por dívidas"], a: 1 }]
                },
            ],
            movimentos: [
                {
                    id: 'ij_m1', title: 'Romantismo Brasileiro', icon: '🌺', req: 1,
                    content: `<h1>🌺</h1><h2>Romantismo: Sentimento e Pátria</h2><p>Chegou ao Brasil por volta de 1836.</p><h3>Características</h3><ul><li>Valorização da natureza e sentimentos</li><li>Indianismo: o índio como herói nacional</li><li>Amor à pátria recém-independente</li></ul><h3>Autores</h3><ul><li>José de Alencar: "O Guarani", "Iracema"</li><li>Gonçalves Dias: "Canção do Exílio"</li></ul>`,
                    quiz: [{ q: "Quando o Romantismo chegou ao Brasil?", opts: ["1500", "Por volta de 1836", "1922", "1964"], a: 1 }, { q: "O que é o Indianismo?", opts: ["Estudo dos índios da Índia", "O índio como herói nacional", "Um tipo de dança", "Uma religião"], a: 1 }, { q: "Quem escreveu 'Iracema'?", opts: ["Machado de Assis", "Drummond", "José de Alencar", "Guimarães Rosa"], a: 2 }]
                },
                {
                    id: 'ij_m2', title: 'Modernismo: Semana de 22', icon: '🎨', req: 2,
                    content: `<h1>🎨</h1><h2>A Semana de Arte Moderna de 1922</h2><p>Em fevereiro de 1922, em São Paulo, artistas fizeram uma revolução!</p><h3>O que mudou</h3><ul><li>Fim das regras rígidas</li><li>Liberdade criativa</li><li>Valorização do Brasil e da cultura popular</li></ul>`,
                    quiz: [{ q: "Em que ano foi a Semana de Arte Moderna?", opts: ["1500", "1888", "1922", "1964"], a: 2 }, { q: "O que o Modernismo trouxe?", opts: ["Mais regras", "Liberdade criativa", "Textos formais", "Fim da poesia"], a: 1 }, { q: "Quem escreveu 'Macunaíma'?", opts: ["Guimarães Rosa", "Graciliano", "Mário de Andrade", "Machado"], a: 2 }]
                },
                {
                    id: 'ij_m3', title: 'Realismo e Naturalismo', icon: '🔍', req: 3,
                    content: `<h1>🔍</h1><h2>Realismo: O Retrato da Sociedade</h2><p>Surgiu como reação ao exagero sentimental do Romantismo.</p><h3>Características</h3><ul><li>Personagens complexos com defeitos e virtudes</li><li>Crítica social</li><li>Análise psicológica profunda</li></ul>`,
                    quiz: [{ q: "Como o Realismo surgiu?", opts: ["Continuação do Romantismo", "Reação ao exagero sentimental", "Cópia francesa", "Por acidente"], a: 1 }, { q: "Maior realista brasileiro?", opts: ["Guimarães Rosa", "Drummond", "Machado de Assis", "Graciliano"], a: 2 }, { q: "Grande mistério de 'Dom Casmurro'?", opts: ["Quem é o autor", "Se Capitu traiu ou não", "Onde se passa", "Como termina"], a: 1 }]
                },
            ],
            escritoras: [
                {
                    id: 'ij_e1', title: 'Clarice Lispector', icon: '🌟', req: 1,
                    content: `<h1>🌟</h1><h2>Clarice Lispector: A Feiticeira das Palavras</h2><div class="quiz-author-box"><span class="quiz-author-name">Clarice Lispector (1920–1977) — nascida na Ucrânia</span></div><p>Uma das escritoras mais importantes do Brasil e do mundo.</p><h3>Obras</h3><ul><li>"A Hora da Estrela": romance mais famoso</li><li>Estilo intimista: mergulha na mente dos personagens</li></ul>`,
                    quiz: [{ q: "Onde Clarice nasceu?", opts: ["Brasil", "Portugal", "Ucrânia", "Argentina"], a: 2 }, { q: "Como é seu estilo literário?", opts: ["Romantismo puro", "Intimista: entra na mente dos personagens", "Cordel", "Naturalismo"], a: 1 }, { q: "Romance mais famoso?", opts: ["Dom Casmurro", "A Hora da Estrela", "O Cortiço", "Vidas Secas"], a: 1 }]
                },
                {
                    id: 'ij_e2', title: 'Carolina Maria de Jesus', icon: '✊', req: 2,
                    content: `<h1>✊</h1><h2>Carolina Maria de Jesus: A Voz da Favela</h2><div class="quiz-author-box"><span class="quiz-author-name">Carolina Maria de Jesus (1914–1977) — Minas Gerais</span></div><p>Catadora de papel que escrevia em cadernos encontrados no lixo.</p><h3>Legado</h3><ul><li>"Quarto de Despejo" (1960)</li><li>Traduzido para mais de 40 idiomas</li><li>Primeira escritora negra com grande reconhecimento</li></ul>`,
                    quiz: [{ q: "Onde ela vivia?", opts: ["Apartamento", "Favela do Canindé", "Fazenda", "Portugal"], a: 1 }, { q: "Onde escrevia?", opts: ["Computador", "Cadernos do lixo", "Papel de escritório", "Nas paredes"], a: 1 }, { q: "Importância de 'Quarto de Despejo'?", opts: ["Diário pessoal", "Revelou a vida invisível na pobreza", "Ficção científica", "Livro técnico"], a: 1 }]
                },
                {
                    id: 'ij_e3', title: 'Cecília Meireles', icon: '🎵', req: 3,
                    content: `<h1>🎵</h1><h2>Cecília Meireles: A Poetisa da Liberdade</h2><div class="quiz-author-box"><span class="quiz-author-name">Cecília Meireles (1901–1964) — Rio de Janeiro</span></div><p>Uma das maiores poetas do Brasil.</p><h3>Obras</h3><ul><li>"Romanceiro da Inconfidência"</li><li>Poemas sobre liberdade, tempo e saudade</li><li>Lutou pela educação pública</li></ul>`,
                    quiz: [{ q: "Grande obra histórica?", opts: ["Quarto de Despejo", "Romanceiro da Inconfidência", "A Hora da Estrela", "Grande Sertão"], a: 1 }, { q: "Temas dos poemas?", opts: ["Só futebol", "Liberdade, tempo e saudade", "Só amor", "Culinária"], a: 1 }, { q: "Pelo que lutou além de poetisa?", opts: ["Melhores salários", "Educação pública de qualidade", "Direitos dos ricos", "Fechamento de escolas"], a: 1 }]
                },
            ],
        }
    },
    preadolescente: {
        greeting: 'Pré-Adolescente (11–14 anos)',
        categories: [
            { id: 'teoria', name: 'Teoria Literária', icon: '🔬', feminist: false },
            { id: 'autores', name: 'Cânone Brasileiro', icon: '🏛️', feminist: false },
            { id: 'mundial', name: 'Literatura Mundial', icon: '🌎', feminist: false },
            { id: 'escritoras', name: 'Literatura Feminista', icon: '✊', feminist: true },
        ],
        lessons: {
            teoria: [
                {
                    id: 'pa_t1', title: 'Narrador e Ponto de Vista', icon: '👁️', req: 1,
                    content: `<h1>👁️</h1><h2>Quem Conta a História?</h2><p>O narrador é a voz que conta a história.</p><h3>Tipos de narrador</h3><ul><li>🙋 1ª pessoa: participa da história ("eu vi...")</li><li>👤 3ª pessoa onisciente: sabe tudo, inclusive pensamentos</li><li>👀 3ª pessoa observador: só descreve o que vê</li></ul><p>O narrador NÃO é o autor!</p>`,
                    quiz: [{ q: "Narrador em 1ª pessoa?", opts: ["Quem escreve o livro", "A voz que diz 'eu' e participa", "Personagem secundário", "O vilão"], a: 1 }, { q: "Narrador onisciente?", opts: ["Só vê de fora", "Sabe tudo, inclusive pensamentos", "Está dentro da história", "Não sabe o futuro"], a: 1 }, { q: "Narrador e autor são a mesma pessoa?", opts: ["Sim, sempre", "Não: o autor cria o narrador como personagem", "Às vezes", "Só em poesia"], a: 1 }]
                },
                {
                    id: 'pa_t2', title: 'Intertextualidade', icon: '🕸️', req: 2,
                    content: `<h1>🕸️</h1><h2>Quando Textos Conversam Entre Si</h2><p>Intertextualidade é quando um texto referencia outro.</p><h3>Tipos</h3><ul><li>📌 Citação: reproduz trecho de outra obra</li><li>🎭 Paródia: imita para criticar ou fazer humor</li><li>🌿 Alusão: referência indireta</li><li>🔄 Paráfrase: reescreve com outras palavras</li></ul>`,
                    quiz: [{ q: "O que é intertextualidade?", opts: ["Erro de escrita", "Quando um texto dialoga com outro", "Tipo de pontuação", "Índice do livro"], a: 1 }, { q: "O que é paródia?", opts: ["Cópia idêntica", "Imitação para criticar ou fazer humor", "Tradução", "Resumo"], a: 1 }, { q: "Por que a intertextualidade é importante?", opts: ["Não é", "Mostra que a literatura é uma conversa entre autores", "Serve para plagiar", "Para enganar leitores"], a: 1 }]
                },
                {
                    id: 'pa_t3', title: 'Herói e Anti-Herói', icon: '⚔️', req: 3,
                    content: `<h1>⚔️</h1><h2>O Protagonista e Suas Contradições</h2><p>Na literatura moderna, o herói perfeito quase desapareceu.</p><h3>Herói clássico</h3><ul><li>Corajoso, honesto, defende os fracos</li></ul><h3>Anti-herói</h3><ul><li>Protagonista com defeitos morais</li><li>Nos faz questionar o certo e o errado</li><li>Exemplos: Bentinho (Dom Casmurro), Riobaldo (Grande Sertão)</li></ul>`,
                    quiz: [{ q: "O que é um anti-herói?", opts: ["O vilão", "Protagonista com defeitos morais", "Personagem secundário", "O narrador"], a: 1 }, { q: "Por que o anti-herói é importante?", opts: ["Não é", "Nos faz questionar certo e errado", "Facilita a leitura", "Substitui o narrador"], a: 1 }, { q: "Anti-herói de Machado de Assis?", opts: ["Iracema", "Bentinho (Dom Casmurro)", "Macunaíma", "Riobaldo"], a: 1 }]
                },
            ],
            autores: [
                {
                    id: 'pa_a1', title: 'Euclides da Cunha', icon: '🌵', req: 1,
                    content: `<h1>🌵</h1><h2>Euclides da Cunha: O Repórter da Guerra</h2><div class="quiz-author-box"><span class="quiz-author-name">Euclides da Cunha (1866–1909) — Rio de Janeiro</span></div><p>Cobriu a Guerra de Canudos e escreveu um dos livros mais importantes do Brasil.</p><h3>Os Sertões (1902)</h3><ul><li>Mistura jornalismo, literatura e ciência</li><li>Denuncia o abandono do sertanejo pelo Estado</li><li>"O sertanejo é, antes de tudo, um forte"</li></ul>`,
                    quiz: [{ q: "O que ele cobriu como jornalista?", opts: ["A abolição", "A Guerra de Canudos", "A Semana de 22", "A Independência"], a: 1 }, { q: "Livro mais famoso?", opts: ["Vidas Secas", "Os Sertões", "Dom Casmurro", "Macunaíma"], a: 1 }, { q: "O que 'Os Sertões' denuncia?", opts: ["Corrupção política", "Abandono do sertanejo pelo Estado", "Problemas das cidades", "Pobreza em Portugal"], a: 1 }]
                },
                {
                    id: 'pa_a2', title: 'Lima Barreto', icon: '📰', req: 2,
                    content: `<h1>📰</h1><h2>Lima Barreto: O Maldito Genial</h2><div class="quiz-author-box"><span class="quiz-author-name">Lima Barreto (1881–1922) — Rio de Janeiro</span></div><p>Escritor negro que denunciou racismo e exclusão social.</p><h3>Obras</h3><ul><li>"Triste Fim de Policarpo Quaresma"</li><li>"Clara dos Anjos": racismo e assédio a mulheres negras</li><li>Nunca aceito na Academia Brasileira de Letras</li></ul>`,
                    quiz: [{ q: "O que ele denunciava?", opts: ["Riqueza do Brasil", "Racismo, exclusão e preconceito de classe", "Aventuras medievais", "Vida no campo"], a: 1 }, { q: "Por que não entrou na Academia?", opts: ["Nunca quis", "Era rejeitado por ser negro e pobre", "Obra ruim", "Morava no exterior"], a: 1 }, { q: "Tema de 'Clara dos Anjos'?", opts: ["Vida da nobreza", "Racismo e assédio a mulheres negras", "Aventuras no sertão", "Guerra de Canudos"], a: 1 }]
                },
                {
                    id: 'pa_a3', title: 'Jorge Amado', icon: '🌴', req: 3,
                    content: `<h1>🌴</h1><h2>Jorge Amado: O Cantor da Bahia</h2><div class="quiz-author-box"><span class="quiz-author-name">Jorge Amado (1912–2001) — Bahia</span></div><p>Um dos escritores brasileiros mais lidos no mundo.</p><h3>Obras</h3><ul><li>"Gabriela, Cravo e Canela"</li><li>"Capitães da Areia"</li><li>"Dona Flor e seus Dois Maridos"</li><li>Traduzido para mais de 49 idiomas</li></ul>`,
                    quiz: [{ q: "De qual estado era?", opts: ["São Paulo", "Minas Gerais", "Bahia", "Rio de Janeiro"], a: 2 }, { q: "Temas de sua obra?", opts: ["Só ficção científica", "Bahia, povo mestiço e resistência dos pobres", "Só a elite", "Histórias medievais"], a: 1 }, { q: "Livro sobre meninos de rua em Salvador?", opts: ["Gabriela", "Tieta", "Capitães da Areia", "Dona Flor"], a: 2 }]
                },
            ],
            mundial: [
                {
                    id: 'pa_m1', title: 'Shakespeare e o Teatro', icon: '🎭', req: 1,
                    content: `<h1>🎭</h1><h2>Shakespeare: O Gênio do Teatro Universal</h2><div class="quiz-author-box"><span class="quiz-author-name">William Shakespeare (1564–1616) — Inglaterra</span></div><p>O maior dramaturgo de todos os tempos.</p><h3>Obras</h3><ul><li>💀 Hamlet: "Ser ou não ser, eis a questão"</li><li>🗡️ Romeu e Julieta</li><li>👑 Macbeth</li><li>🌩️ Rei Lear</li></ul>`,
                    quiz: [{ q: "Por que Shakespeare é o maior dramaturgo?", opts: ["Primeiro a escrever peças", "Obras exploram emoções universais que ainda nos tocam", "Escreveu mais peças", "Era inglês"], a: 1 }, { q: "O que é uma tragédia?", opts: ["Peça cômica", "Peça em que personagens sofrem ou morrem", "Peça infantil", "Peça muito longa"], a: 1 }, { q: "'Ser ou não ser' é de qual peça?", opts: ["Macbeth", "Romeu e Julieta", "Hamlet", "Rei Lear"], a: 2 }]
                },
                {
                    id: 'pa_m2', title: 'Realismo Mágico', icon: '✨', req: 2,
                    content: `<h1>✨</h1><h2>Realismo Mágico: Quando o Impossível é Normal</h2><p>Estilo em que elementos mágicos aparecem no real sem causar espanto.</p><h3>Características</h3><ul><li>O impossível é tratado como cotidiano</li><li>Ligado à América Latina</li><li>Crítica social disfarçada na fantasia</li></ul><h3>Autores</h3><ul><li>Gabriel García Márquez: "Cem Anos de Solidão"</li><li>Jorge Luis Borges</li></ul>`,
                    quiz: [{ q: "O que é o Realismo Mágico?", opts: ["Filme de magia", "Mágico coexiste com o real sem causar espanto", "Tipo de poesia", "Teatro"], a: 1 }, { q: "Quem escreveu 'Cem Anos de Solidão'?", opts: ["Guimarães Rosa", "Gabriel García Márquez", "Jorge Amado", "Graciliano"], a: 1 }, { q: "Por que é ligado à América Latina?", opts: ["Surgiu no Brasil", "Reflete cultura e contradições latino-americanas", "Só em espanhol", "Sobre piratas"], a: 1 }]
                },
                {
                    id: 'pa_m3', title: 'Distopia na Literatura', icon: '🌑', req: 3,
                    content: `<h1>🌑</h1><h2>Distopia: O Futuro que Não Queremos</h2><p>Imagina sociedades futuras onde o mundo deu errado.</p><h3>Características</h3><ul><li>Estado totalitário</li><li>Supressão da liberdade</li><li>Personagem que questiona o sistema</li></ul><h3>Obras clássicas</h3><ul><li>"1984" de George Orwell</li><li>"Admirável Mundo Novo" de Aldous Huxley</li><li>"O Conto da Aia" de Margaret Atwood</li></ul>`,
                    quiz: [{ q: "O que é uma distopia?", opts: ["Sociedade perfeita", "Sociedade futura onde tudo deu errado", "Tipo de poesia", "História de amor futurista"], a: 1 }, { q: "Quem escreveu '1984'?", opts: ["Aldous Huxley", "Margaret Atwood", "George Orwell", "García Márquez"], a: 2 }, { q: "Qual distopia é considerada feminista?", opts: ["1984", "Admirável Mundo Novo", "O Conto da Aia", "Fahrenheit 451"], a: 2 }]
                },
            ],
            escritoras: [
                {
                    id: 'pa_e1', title: 'Conceição Evaristo', icon: '✊', req: 1,
                    content: `<h1>✊</h1><h2>Conceição Evaristo: A Escrevivência</h2><div class="quiz-author-box"><span class="quiz-author-name">Conceição Evaristo (1946–) — Minas Gerais</span></div><p>Criou o conceito de "escrevivência": escrever a partir da própria vivência de mulheres negras.</p><h3>Importância</h3><ul><li>"Ponciá Vicêncio" (2003)</li><li>Dá voz a mulheres negras invisibilizadas</li></ul>`,
                    quiz: [{ q: "O que é 'escrevivência'?", opts: ["Ficção científica", "Escrever da própria vivência de mulheres negras", "Só poesia", "Política eleitoral"], a: 1 }, { q: "Foco central de sua obra?", opts: ["Nobreza europeia", "Mulheres negras e periféricas invisibilizadas", "Vida rural", "Aventuras marítimas"], a: 1 }, { q: "Livro mais importante?", opts: ["Dom Casmurro", "Ponciá Vicêncio", "Gabriela", "Grande Sertão"], a: 1 }]
                },
                {
                    id: 'pa_e2', title: 'Feminismo e Literatura', icon: '📚', req: 2,
                    content: `<h1>📚</h1><h2>Literatura e Feminismo</h2><p>A literatura feminista questiona as desigualdades de gênero.</p><h3>Marcos históricos</h3><ul><li>"O Segundo Sexo" (1949) — Simone de Beauvoir</li><li>Virginia Woolf: "Um Teto Todo Seu"</li><li>No Brasil: escritoras conquistaram espaço</li></ul>`,
                    quiz: [{ q: "O que a literatura feminista questiona?", opts: ["Culinária", "Desigualdades de gênero e falta de representação feminina", "Esporte", "Economia"], a: 1 }, { q: "Quem escreveu 'O Segundo Sexo'?", opts: ["Clarice Lispector", "Carolina de Jesus", "Simone de Beauvoir", "Virginia Woolf"], a: 2 }, { q: "Argumento de Virginia Woolf?", opts: ["Mulheres não devem escrever", "Mulheres precisam de independência para criar", "Homens escrevem melhor", "Poesia é superior"], a: 1 }]
                },
                {
                    id: 'pa_e3', title: 'Adélia Prado', icon: '🌻', req: 3,
                    content: `<h1>🌻</h1><h2>Adélia Prado: O Sagrado no Cotidiano Feminino</h2><div class="quiz-author-box"><span class="quiz-author-name">Adélia Prado (1935–) — Divinópolis, Minas Gerais</span></div><p>Fundiu o sagrado, feminino e cotidiano doméstico de forma revolucionária.</p><h3>Destaque</h3><ul><li>Celebra o corpo feminino com liberdade</li><li>Transforma tarefas domésticas em atos poéticos</li><li>Publicou o primeiro livro aos 40 anos</li></ul>`,
                    quiz: [{ q: "O que caracteriza sua poesia?", opts: ["Só crítica política", "Fusão do sagrado, feminino e cotidiano", "Só violência", "Ação e aventura"], a: 1 }, { q: "Como aborda o cotidiano doméstico?", opts: ["Como chato", "Como atos poéticos cheios de significado", "Com ironia negativa", "Como trabalho forçado"], a: 1 }, { q: "Quando publicou o primeiro livro?", opts: ["15 anos", "25 anos", "40 anos", "70 anos"], a: 2 }]
                },
            ],
        }
    }
};

// ── Funções do quiz ──────────────────────────────────

function quizInit() {
    // Se já tem faixa etária selecionada, vai direto pro menu
    if (quizState.ageGroup) {
        quizShowPanel('quizHome');
    } else {
        quizShowPanel('quizAgeSelect');
    }
}

function quizShowPanel(id) {
    ['quizAgeSelect', 'quizHome', 'quizLessons', 'quizContent', 'quizQuestions', 'quizResult']
        .forEach(p => { const el = document.getElementById(p); if (el) el.style.display = 'none'; });
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
}

async function quizSelectAge(group) {
    quizState.ageGroup = group;
    quizData = QUIZ_DATA[group];

    // Carrega progresso do backend
    try {
        const progress = await api('/quiz');
        quizState.xp = progress.xp ?? 0;
        quizState.level = progress.level ?? 1;
        quizState.hp = progress.hp ?? 5;
        quizState.completedLessons = progress.completedLessons ?? [];
    } catch { /* mantém padrão */ }

    document.getElementById('quizHomeTitle').innerHTML =
        `🎓 <span>Quiz</span> — ${esc(quizData.greeting)}`;

    quizRenderCategories();
    quizUpdateStatus();
    quizShowPanel('quizHome');
}

function quizChangeAge() {
    quizState.ageGroup = null;
    quizData = null;
    quizShowPanel('quizAgeSelect');
}

function quizUpdateStatus() {
    document.getElementById('quizLevelVal').textContent = quizState.level;
    document.getElementById('quizHpVal').textContent =
        '❤️'.repeat(quizState.hp) + '🖤'.repeat(Math.max(0, 5 - quizState.hp));

    const lvlIdx = quizState.level - 1;
    const xpStart = QUIZ_XP_PER_LEVEL[lvlIdx] ?? 0;
    const xpEnd = QUIZ_XP_PER_LEVEL[lvlIdx + 1] ?? 9999;
    const pct = Math.min(((quizState.xp - xpStart) / (xpEnd - xpStart)) * 100, 100);
    document.getElementById('quizXpFill').style.width = pct + '%';
    document.getElementById('quizXpText').textContent =
        `${quizState.xp - xpStart} / ${xpEnd - xpStart} XP`;
}

function quizRenderCategories() {
    const grid = document.getElementById('quizCatGrid');
    grid.innerHTML = quizData.categories.map(c => `
        <div class="quiz-cat-card ${c.feminist ? 'feminist' : ''}" onclick="quizOpenCategory('${c.id}')">
            <span class="quiz-cat-icon">${c.icon}</span>
            <div class="quiz-cat-title">${esc(c.name)}</div>
            ${c.feminist ? '<div style="font-size:var(--fs-xs);color:var(--crimson);margin-top:4px;">🌸 Especial Mês da Mulher</div>' : ''}
        </div>
    `).join('');
}

function quizOpenCategory(id) {
    quizState.currentCat = id;
    const cat = quizData.categories.find(c => c.id === id);
    const lessons = quizData.lessons[id] || [];

    document.getElementById('quizLessonCatTitle').innerHTML =
        `${cat.icon} <span>${esc(cat.name)}</span>`;

    document.getElementById('quizLessonList').innerHTML = lessons.map(l => {
        const locked = quizState.level < l.req;
        const done = quizState.completedLessons.includes(l.id);
        return `<div class="quiz-lesson-item ${locked ? 'locked' : ''} ${done ? 'done' : ''}"
            onclick="quizOpenLesson('${l.id}')">
            <span>${l.icon} ${esc(l.title)}${done ? ' ✓' : ''}</span>
            <span class="lesson-status">${locked ? '🔒 Nível ' + l.req : (done ? '🏆' : '→')}</span>
        </div>`;
    }).join('');

    quizShowPanel('quizLessons');
}

function quizOpenLesson(id) {
    const lesson = quizData.lessons[quizState.currentCat].find(l => l.id === id);
    if (quizState.level < lesson.req) {
        showAlert(`Esta lição requer Nível ${lesson.req}. Continue estudando! 📚`, 'warning');
        return;
    }
    quizState.currentLesson = lesson;
    document.getElementById('quizContentTitle').innerHTML =
        `${lesson.icon} <span>${esc(lesson.title)}</span>`;
    document.getElementById('quizContentBody').innerHTML = lesson.content;
    quizShowPanel('quizContent');
}

function quizStartQuiz() {
    quizState.quizStep = 0;
    quizState.correctCount = 0;
    quizShowPanel('quizQuestions');
    quizRenderQuestion();
}

function quizRenderQuestion() {
    const q = quizState.currentLesson.quiz[quizState.quizStep];
    const total = quizState.currentLesson.quiz.length;

    document.getElementById('quizStepText').textContent = `${quizState.quizStep + 1}/${total}`;
    document.getElementById('quizProgressFill').style.width = ((quizState.quizStep / total) * 100) + '%';
    document.getElementById('quizQuestion').textContent = q.q;
    document.getElementById('quizOptions').innerHTML = q.opts.map((o, i) =>
        `<button class="quiz-opt-btn" onclick="quizHandleAnswer(${i})">${esc(o)}</button>`
    ).join('');
}

function quizHandleAnswer(idx) {
    const q = quizState.currentLesson.quiz[quizState.quizStep];
    const correct = idx === q.a;
    document.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);

    if (correct) {
        document.querySelectorAll('.quiz-opt-btn')[idx].classList.add('correct');
        quizState.correctCount++;
    } else {
        document.querySelectorAll('.quiz-opt-btn')[idx].classList.add('wrong');
        document.querySelectorAll('.quiz-opt-btn')[q.a].classList.add('correct');
        quizState.hp = Math.max(0, quizState.hp - 1);
        quizUpdateStatus();
    }

    setTimeout(() => {
        quizState.quizStep++;
        if (quizState.quizStep < quizState.currentLesson.quiz.length) {
            quizRenderQuestion();
        } else {
            quizFinish();
        }
    }, 1200);
}

async function quizFinish() {
    const total = quizState.currentLesson.quiz.length;
    const minToPass = Math.ceil(total * 0.6);
    const win = quizState.correctCount >= minToPass;
    const firstTime = !quizState.completedLessons.includes(quizState.currentLesson.id);
    const oldLevel = quizState.level;

    let xpGained = 0, hpGained = 0;

    if (win && firstTime) {
        xpGained = quizState.correctCount * 50;
        quizState.xp += xpGained;
        hpGained = Math.min(quizState.correctCount, 5 - quizState.hp);
        quizState.hp = Math.min(5, quizState.hp + hpGained);
        quizState.completedLessons.push(quizState.currentLesson.id);
    }

    // Recalcula nível
    for (let i = QUIZ_XP_PER_LEVEL.length - 1; i >= 0; i--) {
        if (quizState.xp >= QUIZ_XP_PER_LEVEL[i]) { quizState.level = i + 1; break; }
    }
    const leveledUp = quizState.level > oldLevel;

    // Salva no backend
    try {
        await api('/quiz', {
            method: 'POST',
            body: JSON.stringify({
                xp: quizState.xp,
                level: quizState.level,
                hp: quizState.hp,
                completedLessons: quizState.completedLessons,
            })
        });
    } catch { /* falha silenciosa */ }

    document.getElementById('quizResultIcon').textContent = win ? '🏆' : '💪';
    document.getElementById('quizResultTitle').textContent = win ? 'Missão Cumprida!' : 'Continue Tentando!';

    let desc = `Você acertou ${quizState.correctCount} de ${total} perguntas.`;
    if (!win) desc += ` Acerte pelo menos ${minToPass} para passar!`;
    if (win && !firstTime) desc += ' (Já completada anteriormente)';
    document.getElementById('quizResultDesc').textContent = desc;

    document.getElementById('quizXpGain').textContent = xpGained;
    document.getElementById('quizHpGain').textContent = hpGained;

    const lvlBox = document.getElementById('quizLevelUpBox');
    if (leveledUp) {
        document.getElementById('quizNewLevel').textContent = `Nível ${quizState.level}`;
        lvlBox.style.display = 'block';
    } else {
        lvlBox.style.display = 'none';
    }

    quizUpdateStatus();
    quizShowPanel('quizResult');
}