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
            icon: '🪪', title: 'Meu Perfil',
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
}

// ═══════════════════════════════════════════════════════
//  2. LIVROS
// ═══════════════════════════════════════════════════════

async function loadLivros() {
    setLoading('livrosTbody', 6);
    try {
        const data = await api('/livros');
        const tbody = document.getElementById('livrosTbody');
        tbody.innerHTML = '';
        if (!data.length) { setEmpty('livrosTbody', 6, 'Nenhum livro cadastrado.'); return; }
        data.forEach(livro => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--text-faint)">${esc(livro.id)}</td>
                <td><strong>${esc(livro.titulo)}</strong></td>
                <td>${esc(livro.autor)}</td>
                <td>${esc(livro.genero)}</td>
                <td style="color:var(--text-dim)">${esc(livro.corredor ?? '—')}-${esc(livro.prateleira ?? '—')}</td>
                <td>${badgeStatus(livro.status)}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        setEmpty('livrosTbody', 6, err.message);
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
                isbn: document.getElementById('livroIsbn').value || null
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
                : `<span style="color:var(--text-faint);font-size:.8rem">—</span>`
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