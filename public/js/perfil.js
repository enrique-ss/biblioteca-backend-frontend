// ── PERFIL ────────────────────────────────────────────────────────────────────

function loadPerfil() {
    document.getElementById('perfilNome').value  = currentUser.nome;
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
    const nome  = document.getElementById('perfilNome').value;
    const email = document.getElementById('perfilEmail').value;
    const senha = document.getElementById('perfilSenha').value;
    const body  = { nome, email };
    if (senha) body.senha = senha;
    try {
        const data = await api('/auth/perfil', { method: 'PUT', body: JSON.stringify(body) });
        currentUser.nome  = data.usuario.nome;
        currentUser.email = data.usuario.email;
        saveSession(); updateNavbar(); loadPerfil();
        showAlert(data.message || 'Perfil atualizado!');
    } catch (err) { showAlert(err.message, 'danger'); }
});
