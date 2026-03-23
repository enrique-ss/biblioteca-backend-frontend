// ── AUTH ──────────────────────────────────────────────────────────────────────

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
        token = data.token;
        currentUser = data.usuario;
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
        token = data.token;
        currentUser = data.usuario;
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
    const isLogged = !!currentUser;
    const btn = document.getElementById('btnLogout');
    if (btn) btn.style.display = isLogged ? 'inline-flex' : 'none';

    const sidebarNav = document.getElementById('sidebarNav');
    if (sidebarNav) sidebarNav.style.display = isLogged ? 'flex' : 'none';

    const navNotifications = document.getElementById('navNotifications');
    if (navNotifications) navNotifications.style.display = isLogged ? 'block' : 'none';

    const navUser = document.getElementById('navUser');
    if (navUser) navUser.style.display = isLogged ? 'flex' : 'none';

    if (isLogged) {
        // Name and Role removed from sidebar as per UI refinement
    }
}
