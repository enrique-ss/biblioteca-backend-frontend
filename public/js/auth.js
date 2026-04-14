// Logica de autenticacao (login e registro)

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const payload = {
            email: document.getElementById('loginEmail').value,
            senha: document.getElementById('loginPassword').value
        };

        const dados = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        token = dados.token || dados.session?.access_token || null;
        currentUser = dados.usuario;

        salvarSessao();
        atualizarNavbar();
        carregarMenu();

        mostrarTela('menuScreen');
        e.target.reset();
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const payload = {
            nome: document.getElementById('regNome').value,
            email: document.getElementById('regEmail').value,
            senha: document.getElementById('regSenha').value,
            tipo: 'usuario'
        };

        const dados = await api('/auth/registrar', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        token = dados.token || dados.session?.access_token || null;
        currentUser = dados.usuario;

        salvarSessao();
        atualizarNavbar();
        carregarMenu();

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
    if (wrapper) wrapper.style.paddingLeft = estaLogado ? '80px' : '0';

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
