// Lógica de Autenticação (Login e Registro)

function setupAuthForms() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
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

                token = dados.token;
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
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
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

                token = dados.token;
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
    }
}

// Encerra a sessão do usuário
function logout() {
    exibirConfirmacao({
        icon: '🚪',
        title: 'Encerrar sessão',
        msg: 'Deseja realmente sair do sistema?',
        okLabel: 'Sair',
        onOk() {
            limparSessao();
            atualizarNavbar();
            mostrarTela('loginScreen');
        }
    });
}

// Atualiza a visibilidade dos elementos da barra lateral conforme o login
function atualizarNavbar() {
    const estaLogado = !!currentUser;
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.querySelector('.app-wrapper');

    if (sidebar) sidebar.style.display = estaLogado ? 'flex' : 'none';
    if (wrapper) wrapper.style.paddingLeft = estaLogado ? '80px' : '0';

    // Atualiza botões básicos
    const btnSair = document.getElementById('btnLogout');
    if (btnSair) {
        btnSair.style.display = estaLogado ? 'inline-flex' : 'none';
    }

    const navegaçãoLateral = document.getElementById('sidebarNav');
    if (navegaçãoLateral) {
        navegaçãoLateral.style.display = estaLogado ? 'flex' : 'none';
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
