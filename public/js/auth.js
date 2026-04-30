/*
    AUTENTICAÇÃO: login, registro e controle de sessão.
    Este arquivo gerencia todo o ciclo de vida da sessão do usuário:
    - Login: valida credenciais e armazena o token de acesso
    - Registro: cria uma nova conta e já faz login automático
    - Logout: pede confirmação e encerra a sessão com segurança
    - atualizarNavbar: ajusta o que é visível na interface conforme o estado de login
*/

/*
    Ouve o envio do formulário de login.
    Quando o usuário clica em "Entrar", envia o email e a senha para a API.
    Se o servidor aceitar, armazena o token JWT e os dados do usuário na memória,
    salva no localStorage para manter a sessão ao recarregar a página,
    e redireciona para a tela principal.
*/
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

        // O token pode vir diretamente ou dentro de um objeto de sessão (Supabase)
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

/*
    Ouve o envio do formulário de criação de conta.
    Todos os novos usuários são criados com o tipo "usuario" (leitor).
    Apenas um administrador pode elevar um usuário a bibliotecário depois.
    Após o cadastro bem-sucedido, o usuário já é logado automaticamente.
*/
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

        // Armazena o token e os dados do novo usuário para já iniciar a sessão
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

/*
    Encerra a sessão do usuário.
    Antes de limpar os dados, exibe um diálogo de confirmação para evitar
    saídas acidentais. Ao confirmar, remove o token do localStorage,
    oculta a sidebar e redireciona para a tela de login.
*/
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

/*
    Atualiza a visibilidade dos elementos da interface conforme o estado de login.
    Quando logado: exibe a sidebar, a navegação, o ícone de notificações e o perfil.
    Quando deslogado: oculta tudo isso e remove o espaço reservado pela sidebar.
    Esta função é chamada sempre que o estado de autenticação muda.
*/
function atualizarNavbar() {
    const estaLogado = !!currentUser;
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.querySelector('.app-wrapper');

    if (sidebar) sidebar.style.display = estaLogado ? 'flex' : 'none';
    if (wrapper) wrapper.style.paddingLeft = estaLogado ? '' : '0';

    if (estaLogado && typeof socket !== 'undefined' && currentUser?.id) {
        socket.emit('joinRoom', currentUser.id);
    }

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
