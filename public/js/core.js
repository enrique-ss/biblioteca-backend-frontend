// Configuração automática
const BASE_URL = window.location.origin;
const API_URL = `${BASE_URL}/api`;
let token = null;
let currentUser = null;

// Conexão WebSocket para atualizações em tempo real
const socket = typeof io !== 'undefined'
    ? io({ withCredentials: true })
    : { on: () => {} };

socket.on('connect', () => console.log('Conectado ao servidor WebSocket!', socket.id));

// Atualização automática de dados em tempo real
socket.on('refreshData', (tipo) => {
    if (tipo === 'livros' && typeof carregarLivros === 'function') {
        carregarLivros(1);
    } else if (tipo === 'alugueis' && typeof carregarAlugueis === 'function') {
        carregarAlugueis(1);
    } else if (tipo === 'usuarios' && typeof carregarUsuarios === 'function') {
        carregarUsuarios(1);
    } else if (tipo === 'acervo-digital' && typeof carregarAcervoDigital === 'function') {
        carregarAcervoDigital(1);
    } else if (tipo === 'estatisticas' && typeof carregarEstatisticas === 'function') {
        carregarEstatisticas();
    }
});

// Atualização de estatísticas
socket.on('statsUpdate', (data) => {
    if (typeof carregarEstatisticas === 'function') {
        carregarEstatisticas();
    }
});

// Atualiza ícone do tema (sol/lua)
function atualizarIconeTema(tema) {
    const themeIcon = document.getElementById('btnThemeIcon');
    if (!themeIcon) {
        return;
    }

    themeIcon.textContent = tema === 'light' ? '☀️' : '🌙';
    themeIcon.setAttribute('aria-label', tema === 'light' ? 'Tema claro' : 'Tema escuro');
}

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const novoTema = isDark ? 'light' : 'dark';

    html.setAttribute('data-theme', novoTema);
    atualizarIconeTema(novoTema);
    localStorage.setItem('biblioverso_theme', novoTema);
}

// Restura tema salvo pelo usuário
function restoreTheme() {
    const saved = localStorage.getItem('biblioverso_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    atualizarIconeTema(saved);
}

// Salva sessão do usuário no sessionStorage
function salvarSessao() {
    sessionStorage.setItem('biblioverso_token', token || '');
    sessionStorage.setItem('biblioverso_user', JSON.stringify(currentUser));
}

// Restaura sessão do usuário ao carregar página
function restaurarSessao() {
    const t = sessionStorage.getItem('biblioverso_token');
    const u = sessionStorage.getItem('biblioverso_user');
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

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));

    const elementoTela = document.getElementById(id);
    if (elementoTela) {
        elementoTela.classList.add('active');
    }

    document.querySelectorAll('.side-btn').forEach((btn) => btn.classList.remove('active'));

    const botoes = document.querySelectorAll('.side-btn');
    botoes.forEach((btn) => {
        if (btn.onclick && btn.onclick.toString().includes(id)) {
            btn.classList.add('active');
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof animarTransicaoTela === 'function') {
        animarTransicaoTela(id);
    }
}

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

function exibirConfirmacao({ icon = 'Aviso', title = 'Confirmar', msg = '', okLabel = 'Confirmar', onOk }) {
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

function exibirAlerta(mensagem, tipo = 'success') {
    console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
}

async function api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const resposta = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const dados = await resposta.json();

    if (!resposta.ok) {
        const mensagemErro = dados.error || dados.message || 'Erro inesperado na requisicao';
        throw new Error(mensagemErro);
    }

    return dados;
}

function esc(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatarData(iso) {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
        return iso;
    }
}

function definirCarregando(idTbody, colunas) {
    const tbody = document.getElementById(idTbody);
    if (tbody) {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="${colunas}"><span class="spinner"></span>Carregando...</td></tr>`;
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

function badgeStatus(status) {
    const mapas = {
        disponivel: `<span class="badge badge-success">Disponivel</span>`,
        alugado: `<span class="badge badge-danger">Indisponivel</span>`,
        ativo: `<span class="badge badge-warning">Ativo</span>`,
        atrasado: `<span class="badge badge-danger">Atrasado</span>`,
        devolvido: `<span class="badge badge-success">Devolvido</span>`
    };
    return mapas[status] || `<span class="badge">${esc(status)}</span>`;
}

function badgeTipo(tipo) {
    const mapas = {
        bibliotecario: `<span class="badge badge-gold">Bibliotecario</span>`,
        usuario: `<span class="badge badge-usuario">Leitor</span>`
    };
    return mapas[tipo] || `<span class="badge">${esc(tipo)}</span>`;
}

function badgeExemplar(status) {
    const mapas = {
        disponivel: `<span class="badge badge-success">Disponivel</span>`,
        indisponivel: `<span class="badge badge-danger">Indisponivel</span>`,
        emprestado: `<span class="badge badge-info">Emprestado</span>`,
        perdido: `<span class="badge badge-danger" style="background:var(--crimson);color:white;border-color:white">Perdido</span>`
    };
    return mapas[status] || `<span class="badge">${esc(status)}</span>`;
}

function badgeCondicao(condicao = {}) {
    if (!condicao || !Object.keys(condicao).length) {
        return '<span style="color:var(--text)">-</span>';
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
        bom: `<span class="badge badge-success">Bom</span>`,
        danificado: `<span class="badge badge-danger">Danificado</span>`,
        perdido: `<span class="badge badge-danger" style="background:var(--crimson);color:white;border-color:white">Perdido</span>`
    };
    return mapas[condicao] || `<span class="badge">${esc(condicao)}</span>`;
}

function badgeTipoMulta(tipo) {
    const mapas = {
        atraso: `<span class="badge badge-warning">Atraso</span>`,
        perda: `<span class="badge badge-danger">Perda</span>`
    };
    return mapas[tipo] || `<span class="badge">${esc(tipo)}</span>`;
}

function renderizarPaginacao(idContainer, paginaAtual, totalPaginas, aoMudarPagina) {
    const el = document.getElementById(idContainer);
    if (!el || totalPaginas <= 1) {
        if (el) el.innerHTML = '';
        return;
    }

    let html = `<button class="pg-btn" ${paginaAtual <= 1 ? 'disabled' : ''} onclick="(${aoMudarPagina})(${paginaAtual - 1})"><</button>`;

    const inicio = Math.max(1, paginaAtual - 2);
    const fim = Math.min(totalPaginas, paginaAtual + 2);

    if (inicio > 1) {
        html += `<button class="pg-btn" onclick="(${aoMudarPagina})(1)">1</button>`;
        if (inicio > 2) {
            html += `<span class="pg-info">...</span>`;
        }
    }

    for (let i = inicio; i <= fim; i++) {
        const classeAtiva = i === paginaAtual ? 'active' : '';
        html += `<button class="pg-btn ${classeAtiva}" onclick="(${aoMudarPagina})(${i})">${i}</button>`;
    }

    if (fim < totalPaginas) {
        if (fim < totalPaginas - 1) {
            html += `<span class="pg-info">...</span>`;
        }
        html += `<button class="pg-btn" onclick="(${aoMudarPagina})(${totalPaginas})">${totalPaginas}</button>`;
    }

    html += `<button class="pg-btn" ${paginaAtual >= totalPaginas ? 'disabled' : ''} onclick="(${aoMudarPagina})(${paginaAtual + 1})">></button>`;
    html += `<span class="pg-info">Pag. ${paginaAtual} de ${totalPaginas}</span>`;


    el.innerHTML = html;
}

// Mobile Menu Functions
let touchStartX = 0;
let touchEndX = 0;
let isSwipe = false;

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    
    if (sidebar.classList.contains('mobile-open')) {
        closeMobileMenu();
    } else {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('active');
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
}

// Touch/Swipe handlers
document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    isSwipe = true;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (!isSwipe) return;
    
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    const sidebar = document.getElementById('sidebar');
    
    // Swipe da esquerda para direita para abrir
    if (diff > 50 && touchStartX < 50 && !sidebar.classList.contains('mobile-open')) {
        toggleMobileMenu();
        isSwipe = false;
    }
    
    // Swipe da direita para esquerda para fechar
    if (diff < -50 && sidebar.classList.contains('mobile-open')) {
        closeMobileMenu();
        isSwipe = false;
    }
}, { passive: true });

document.addEventListener('touchend', () => {
    isSwipe = false;
}, { passive: true });

// Clique na borda esquerda para abrir sidebar
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900 && e.clientX < 20) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('mobile-open')) {
            toggleMobileMenu();
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach((m) => fecharModal(m.id));
        fecharConfirmacao();
        closeMobileMenu();
    }
});

restoreTheme();
