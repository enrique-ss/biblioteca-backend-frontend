// Autenticação de usuários

// Listener do formulário de login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        // Prepara dados de login
        const payload = {
            email: document.getElementById('loginEmail').value,
            senha: document.getElementById('loginPassword').value
        };

        // Envia requisição de login
        const dados = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Armazena token e dados do usuário
        token = dados.token || dados.session?.access_token || null;
        currentUser = dados.usuario;

        // Salva sessão e atualiza interface
        salvarSessao();
        atualizarNavbar();
        carregarMenu();

        // Redireciona para o menu principal
        mostrarTela('menuScreen');
        e.target.reset();
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
});

// Listener do formulário de registro
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        // Prepara dados de registro
        const payload = {
            nome: document.getElementById('regNome').value,
            email: document.getElementById('regEmail').value,
            senha: document.getElementById('regSenha').value,
            tipo: 'usuario'
        };

        // Envia requisição de registro
        const dados = await api('/auth/registrar', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Armazena token e dados do usuário
        token = dados.token || dados.session?.access_token || null;
        currentUser = dados.usuario;

        // Salva sessão e atualiza interface
        salvarSessao();
        atualizarNavbar();
        carregarMenu();

        // Redireciona para o menu principal
        mostrarTela('menuScreen');
        e.target.reset();
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
});

function logout() {
    exibirConfirmacao({
        icon: 'Sair',
        title: 'Encerrar sessao',
        msg: 'Deseja realmente sair do sistema?',
        okLabel: 'Sair',
        onOk() {
            limparSessao();
            atualizarNavbar();
            mostrarTela('loginScreen');
        }
    });
}

function atualizarNavbar() {
    const estaLogado = !!currentUser;
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.querySelector('.app-wrapper');

    if (sidebar) sidebar.style.display = estaLogado ? 'flex' : 'none';
    if (wrapper) wrapper.style.paddingLeft = estaLogado ? '' : '0';

    const btnSair = document.getElementById('btnLogout');
    if (btnSair) {
        btnSair.style.display = estaLogado ? 'inline-flex' : 'none';
    }

    const navegacaoLateral = document.getElementById('sidebarNav');
    if (navegacaoLateral) {
        navegacaoLateral.style.display = estaLogado ? 'flex' : 'none';
    }

    const centralNotificacoes = document.getElementById('navNotifications');
    if (centralNotificacoes) {
        centralNotificacoes.style.display = estaLogado ? 'block' : 'none';
    }

    const botaoPerfil = document.getElementById('navUser');
    if (botaoPerfil) {
        botaoPerfil.style.display = estaLogado ? 'flex' : 'none';
    }
}
