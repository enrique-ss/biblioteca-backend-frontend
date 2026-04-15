// Perfil do usuário

function carregarPerfil() {
    // Preenche campos do formulário
    document.getElementById('perfilNome').value = currentUser.nome;
    document.getElementById('perfilEmail').value = currentUser.email;
    document.getElementById('perfilSenha').value = '';

    // Renderiza informações do perfil
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
            <div class="perfil-field-label">Tipo de Conta</div>
            <div class="perfil-field-value" style="margin-top:4px">${badgeTipo(currentUser.tipo)}</div>
        </div>`;
}

// Processa atualização do perfil
document.getElementById('editPerfilForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('perfilNome').value;
    const email = document.getElementById('perfilEmail').value;
    const senha = document.getElementById('perfilSenha').value;

    const dadosParaAtualizar = { nome, email };
    
    // Envia senha apenas se preenchida
    if (senha) {
        dadosParaAtualizar.senha = senha;
    }

    try {
        const resposta = await api('/auth/perfil', { 
            method: 'PUT', 
            body: JSON.stringify(dadosParaAtualizar) 
        });

        // Atualiza estado global
        currentUser.nome = resposta.usuario.nome;
        currentUser.email = resposta.usuario.email;

        // Persiste sessão e atualiza interface
        salvarSessao();
        atualizarNavbar();
        carregarPerfil();

        exibirAlerta(resposta.message || 'Perfil atualizado com sucesso!');
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
});
