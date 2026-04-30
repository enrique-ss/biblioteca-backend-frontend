/*
    NÚCLEO DO SISTEMA: configuração global, comunicação com o servidor e utilitários.
    Este é o primeiro arquivo carregado. Ele define:
    - A URL base da API do servidor
    - As variáveis globais de sessão (token JWT e dados do usuário)
    - A conexão WebSocket para atualizações em tempo real
    - Todas as funções utilitárias usadas pelos demais arquivos (badges, modais, etc.)
*/

// URL base derivada automaticamente do domínio atual, funciona em local e em produção
const BASE_URL = window.location.origin;
const API_URL = `${BASE_URL}/api`;
// Token JWT de autenticação: null quando o usuário não está logado
let token = null;
// Dados do usuário logado (nome, email, tipo, permissões): null quando deslogado
let currentUser = null;

/**
 * Formata uma data para um formato relativo amigável (ex: "há 2 horas", "hoje às 15:00").
 */
function formatarDataRelativa(dataStr) {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    const agora = new Date();
    const diffMs = agora - data;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHoras < 24) {
        if (data.getDate() === agora.getDate()) {
            return `hoje às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
        }
        return `há ${diffHoras} horas`;
    }
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/*
    Conexão WebSocket com o servidor via Socket.io.
    Permite que o servidor avise o navegador em tempo real quando algo muda
    (novo livro cadastrado, empréstimo devolvido, etc.) sem precisar recarregar a página.
    Se Socket.io não estiver disponível, cria um objeto vazio que absorve chamadas .on()
    sem causar erros.
*/
const socket = typeof io !== 'undefined'
    ? io({ withCredentials: true })
    : { on: () => {} };

socket.on('connect', () => {
    console.log('Conectado ao servidor WebSocket!', socket.id);
    // Se o socket reconectar, garante que volta para a sala privada
    if (currentUser && currentUser.id) {
        socket.emit('joinRoom', currentUser.id);
    }
});

/*
    Ouve o evento 'refreshData' emitido pelo servidor.
    Quando outro usuário faz uma alteração (cadastra livro, devolve empréstimo, etc.),
    o servidor emite este evento para todos os clientes conectados.
    A tela que estiver aberta no momento é recarregada automaticamente.
*/
socket.on('refreshData', (tipo) => {
    console.log(`[Socket] Refresh solicitado para: ${tipo}`);
    if (tipo === 'usuarios') {
        if (typeof carregarUsuarios === 'function') carregarUsuarios(1);
        if (typeof buscarNotificacoes === 'function') buscarNotificacoes();
        
        // Se a tela de perfil estiver aberta, atualiza ela também
        const profileScreen = document.getElementById('profileScreen');
        if (profileScreen && profileScreen.classList.contains('active') && typeof carregarPerfil === 'function') {
            carregarPerfil(typeof profileViewingId !== 'undefined' ? profileViewingId : null);
        }
    }
    if (tipo === 'livros') {
        if (typeof carregarLivros === 'function') carregarLivros(1);
        if (typeof carregarAcervoDigital === 'function') carregarAcervoDigital(1);
        if (typeof carregarNovidades === 'function') carregarNovidades();
        if (typeof buscarNotificacoes === 'function') buscarNotificacoes();
    }
    if (tipo === 'alugueis') {
        if (typeof carregarAlugueis === 'function') carregarAlugueis(1);
        if (typeof carregarMeusAlugueis === 'function') carregarMeusAlugueis();
        if (typeof carregarHistorico === 'function') carregarHistorico(1);
        if (typeof buscarNotificacoes === 'function') buscarNotificacoes();
    }
    if (tipo === 'notificacoes' && typeof buscarNotificacoes === 'function') {
        buscarNotificacoes();
    }
    if (tipo === 'estatisticas' && typeof carregarEstatisticas === 'function') {
        carregarEstatisticas();
    }
});

// Atualiza estatísticas quando o servidor emite um evento específico
socket.on('statsUpdate', (data) => {
    if (typeof carregarEstatisticas === 'function') {
        carregarEstatisticas();
    }
});

/*
    Atualiza o ícone do botão de tema (sol ☀️ / lua 🌙) em todos os lugares onde aparece:
    - Dentro da sidebar (btnThemeIcon)
    - Na tela de login/cadastro, onde a sidebar não existe (themeToggleAuth)
*/
function atualizarIconeTema(tema) {
    const themeIcon = document.getElementById('btnThemeIcon');
    const themeAuth = document.getElementById('themeToggleAuth');
    const icon = tema === 'light' ? '☀️' : '🌙';
    
    if (themeIcon) {
        themeIcon.textContent = icon;
        themeIcon.setAttribute('aria-label', tema === 'light' ? 'Tema claro' : 'Tema escuro');
    }

    if (themeAuth) {
        themeAuth.textContent = icon;
    }
}

/*
    Alterna entre tema escuro (padrão) e claro ao clicar no botão de sol/lua.
    Salva a preferência no localStorage para que persista ao fechar e reabrir o navegador.
*/
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const novoTema = isDark ? 'light' : 'dark';

    html.setAttribute('data-theme', novoTema);
    atualizarIconeTema(novoTema);
    localStorage.setItem('biblioverso_theme', novoTema);
}

/*
    Restaura o tema que o usuário escolheu na sessão anterior.
    Executada uma única vez ao iniciar a página (última linha do arquivo).
    Se nenhuma preferência foi salva, usa o tema escuro como padrão.
*/
function restoreTheme() {
    const saved = localStorage.getItem('biblioverso_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    atualizarIconeTema(saved);
}

/*
    Persiste o token e os dados do usuário no sessionStorage.
    sessionStorage é limpo automaticamente ao fechar a aba do navegador.
    Isso impede que a sessão fique aberta em computadores compartilhados.
*/
function salvarSessao() {
    sessionStorage.setItem('biblioverso_token', token || '');
    sessionStorage.setItem('biblioverso_user', JSON.stringify(currentUser));
    
    // Entra na sala do socket com o próprio ID para receber notificações privadas (pedidos de amizade, etc)
    if (currentUser && currentUser.id) {
        socket.emit('joinRoom', currentUser.id);
    }
}

/*
    Tenta recuperar a sessão do sessionStorage ao carregar a página.
    Se o token e os dados do usuário existem, o usuário é redirecionado
    direto para o menu sem precisar fazer login novamente.
    Se não existem, redireciona para a tela de login.
*/
function restaurarSessao() {
    const t = sessionStorage.getItem('biblioverso_token');
    const u = sessionStorage.getItem('biblioverso_user');
    if (t && u) {
        token = t;
        currentUser = JSON.parse(u);
        
        // Entra na sala do socket
        if (currentUser && currentUser.id) {
            socket.emit('joinRoom', currentUser.id);
        }
        
        atualizarNavbar();
        carregarMenu();
        mostrarTela('menuScreen');
    } else {
        atualizarNavbar();
        mostrarTela('loginScreen');
    }
}

/*
    Remove todos os dados da sessão da memória e do sessionStorage.
    Chamada pelo logout para garantir que nenhum dado sensível persista.
*/
function limparSessao() {
    sessionStorage.clear();
    token = null;
    currentUser = null;
}

/*
    Navega para uma tela do sistema (SPA - Single Page Application).
    Remove a classe 'active' de todas as telas e adiciona apenas na solicitada.
    Também: marca o botão da sidebar correspondente como ativo, rola para o topo,
    dispara a animação GSAP de entrada e fecha o menu mobile se estiver aberto.
    Em telas de login/cadastro, oculta o hamburguer e exibe o botão de tema flutuante.
*/
function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));

    const elementoTela = document.getElementById(id);
    if (elementoTela) {
        elementoTela.classList.add('active');
        if (id === 'menuScreen' && typeof carregarNovidades === 'function') {
            carregarNovidades();
        }
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

    if (typeof closeMobileMenu === 'function' && window.innerWidth <= 900) {
        closeMobileMenu();
    }

    // Controla visibilidade do botão hamburguer e do botão de tema conforme a tela
    const isAuth = (id === 'loginScreen' || id === 'registerScreen');
    const menuBtn = document.getElementById('mobileMenuBtn');
    const authThemeBtn = document.getElementById('themeToggleAuth');

    if (menuBtn) {
        menuBtn.style.display = isAuth ? 'none' : '';
    }

    if (authThemeBtn) {
        authThemeBtn.style.display = isAuth ? 'flex' : 'none';
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        authThemeBtn.textContent = currentTheme === 'light' ? '☀️' : '🌙';
    }
}

/*
    Abre um modal: adiciona a classe 'active' e bloqueia o scroll da página.
    O scroll é bloqueado para evitar que o conteúdo por baixo se mova enquanto o modal está aberto.
*/
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/*
    Fecha um modal e restaura o scroll da página ao estado normal.
*/
function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/*
    Exibe o diálogo de confirmação customizado antes de ações irreversíveis (excluir, bloquear, etc.).
    Recebe: ícone, título, mensagem, texto do botão de confirmação e a função a executar ao confirmar.
    Ao clicar em OK, fecha o diálogo e executa onOk().
*/
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

// Fecha a caixa de confirmação
function fecharConfirmacao() {
    document.getElementById('confirmDialog').classList.remove('active');
}

/**
 * Exibe uma mensagem de feedback visual (Toast) para o usuário.
 * @param {string} mensagem Texto a ser exibido.
 * @param {'success'|'danger'|'warning'|'info'} tipo Categoria do alerta para definir a cor e ícone.
 */
function exibirAlerta(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    
    const icones = {
        success: '✅',
        danger: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icones[tipo] || '🔔'}</div>
        <div class="toast-message">${esc(mensagem)}</div>
    `;

    container.appendChild(toast);

    // Remove automaticamente após 5 segundos
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }, 5000);

    // Clique para fechar antecipadamente
    toast.onclick = () => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 400);
    };
}

/*
    Função central de comunicação com a API do servidor.
    Adiciona automaticamente o token JWT de autenticação ao cabeçalho Authorization.
    Se o servidor retornar erro (status >= 400), lança uma exceção com a mensagem do erro
    para que os arquivos chamadores possam tratá-la com try/catch.
*/
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

/*
    Escapa caracteres especiais HTML para evitar injeção de código malicioso.
    Sempre use esc() ao inserir dados do servidor no innerHTML de elementos.
    Sem isso, um título de livro como '<script>alert(1)</script>' seria executado.
*/
function esc(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/*
    Converte uma data no formato ISO 8601 (ex: '2024-03-15T00:00:00Z')
    para o formato brasileiro legível (ex: '15/03/2024').
    Retorna '-' se a data for nula ou inválida.
*/
function formatarData(iso) {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
        return iso;
    }
}

/*
    Insere uma linha de carregamento (ícone giratório) em uma tabela.
    Chamada antes de buscar dados do servidor para dar feedback visual imediato.
    colunas: número de colunas da tabela, necessário para o colspan funcionar corretamente.
*/
function definirCarregando(idTbody, colunas) {
    const tbody = document.getElementById(idTbody);
    if (tbody) {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="${colunas}"><span class="spinner"></span>Carregando...</td></tr>`;
    }
}

/*
    Insere uma mensagem de "sem resultados" em uma tabela.
    Chamada quando a busca retorna zero registros.
*/
function definirVazio(idTbody, colunas, msg = 'Nenhum registro encontrado.') {
    const tbody = document.getElementById(idTbody);
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${colunas}" class="table-empty">${msg}</td></tr>`;
    }
}

/*
    Implementação de debounce: atrasa a execução de uma função após o último evento.
    Usado principalmente na busca por texto: ao digitar, aguarda 350ms de pausa
    antes de disparar a requisição ao servidor, evitando uma chamada por letra digitada.
*/
function debounce(funcao, atraso = 350) {
    let cronometro;
    return (...argumentos) => {
        clearTimeout(cronometro);
        cronometro = setTimeout(() => funcao(...argumentos), atraso);
    };
}

/*
    SISTEMA DE BADGES: funções que retornam HTML de etiquetas coloridas.
    Cada função recebe um valor textual (status, tipo, condição) e retorna
    a tag <span> com a classe correta de cor. Isso centraliza a aparência
    dos badges em um único lugar, garantindo consistência visual em todo o sistema.
*/

// Badge de status do empréstimo: verde (devolvido), amarelo (ativo), vermelho (atrasado)
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

// Badge do tipo de conta: dourado para bibliotecário, cinza para leitor
function badgeTipo(tipo) {
    const mapas = {
        bibliotecario: `<span class="badge badge-gold">Bibliotecario</span>`,
        usuario: `<span class="badge badge-usuario">Leitor</span>`
    };
    return mapas[tipo] || `<span class="badge">${esc(tipo)}</span>`;
}

// Badge de disponibilidade do exemplar físico: disponível, emprestado, perdido
function badgeExemplar(status) {
    const mapas = {
        disponivel: `<span class="badge badge-success">Disponivel</span>`,
        indisponivel: `<span class="badge badge-danger">Indisponivel</span>`,
        emprestado: `<span class="badge badge-info">Emprestado</span>`,
        perdido: `<span class="badge badge-danger" style="background:var(--crimson);color:white;border-color:white">Perdido</span>`
    };
    return mapas[status] || `<span class="badge">${esc(status)}</span>`;
}

/*
    Badge de condição do acervo: exibe quantos exemplares estão danificados ou perdidos.
    Se nenhum estiver com problema, exibe "Bom estado" em verde.
    O parâmetro é um objeto com contagens: { danificado: N, perdido: M }.
*/
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

// Badge de condição de um exemplar individual: bom, danificado ou perdido
function badgeCondicaoExemplar(condicao) {
    const mapas = {
        bom: `<span class="badge badge-success">Bom</span>`,
        danificado: `<span class="badge badge-danger">Danificado</span>`,
        perdido: `<span class="badge badge-danger" style="background:var(--crimson);color:white;border-color:white">Perdido</span>`
    };
    return mapas[condicao] || `<span class="badge">${esc(condicao)}</span>`;
}

// Badge do tipo de multa: amarelo para atraso, vermelho para perda do exemplar
function badgeTipoMulta(tipo) {
    const mapas = {
        atraso: `<span class="badge badge-warning">Atraso</span>`,
        perda: `<span class="badge badge-danger">Perda</span>`
    };
    return mapas[tipo] || `<span class="badge">${esc(tipo)}</span>`;
}

/*
    Renderiza a barra de paginação com botões numéricos, anterior (<) e próxima (>).
    Exibe no máximo 5 páginas por vez (2 antes e 2 depois da atual), com '...' nos extremos.
    Se houver apenas 1 página, limpa o container e não exibe nada.
    aoMudarPagina é a função que será chamada com o número da página ao clicar.
*/
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

/*
    CONTROLE DO MENU MOBILE: abre/fecha a sidebar em dispositivos com tela pequena.
    Usa gestos de swipe (deslizar o dedo) e clique no botão hamburguer.
    As variáveis abaixo armazenam a posição inicial e final do toque para calcular a direção.
*/
let touchStartX = 0;
let touchEndX = 0;
let isSwipe = false;

/*
    Alterna o estado da sidebar mobile: se estiver aberta, fecha; se fechada, abre.
    Também controla o overlay escuro que aparece por baixo da sidebar.
*/
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

// Fecha a sidebar no mobile e remove o overlay escuro
function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
}

// Registra a posição X inicial do toque para poder calcular a direção do swipe
document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    isSwipe = true;
}, { passive: true });

/*
    Detecta o gesto de swipe durante o movimento do dedo:
    - Deslizar da borda esquerda (< 50px) para a direita (> 50px): abre a sidebar
    - Deslizar para a esquerda com a sidebar aberta: fecha a sidebar
*/
document.addEventListener('touchmove', (e) => {
    if (!isSwipe) return;
    
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    const sidebar = document.getElementById('sidebar');
    
    if (diff > 50 && touchStartX < 50 && !sidebar.classList.contains('mobile-open')) {
        toggleMobileMenu();
        isSwipe = false;
    }
    
    if (diff < -50 && sidebar.classList.contains('mobile-open')) {
        closeMobileMenu();
        isSwipe = false;
    }
}, { passive: true });

// Encerra o controle de swipe quando o dedo é levantado da tela
document.addEventListener('touchend', () => {
    isSwipe = false;
}, { passive: true });

// Permite abrir a sidebar tocando na borda esquerda da tela (primeiros 20px)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900 && e.clientX < 20) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('mobile-open')) {
            toggleMobileMenu();
        }
    }
});

/*
    Atalho de teclado: a tecla Escape fecha qualquer modal ou diálogo aberto
    e também fecha a sidebar no mobile, retornando à visualização normal.
*/
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach((m) => fecharModal(m.id));
        fecharConfirmacao();
        closeMobileMenu();
    }
});

// Restaura o tema assim que o arquivo carrega, antes de qualquer outro script executar
restoreTheme();
