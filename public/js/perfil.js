// Gerenciamento do Perfil do Usuário

function carregarPerfil() {
    // Preenche os campos do formulário de edição com os dados atuais
    document.getElementById('perfilNome').value = currentUser.nome;
    document.getElementById('perfilEmail').value = currentUser.email;
    document.getElementById('perfilSenha').value = '';

    // Renderiza as informações do perfil na tela de visualização
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

// Processa a atualização dos dados do perfil
document.getElementById('editPerfilForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('perfilNome').value;
    const email = document.getElementById('perfilEmail').value;
    const senha = document.getElementById('perfilSenha').value;

    const dadosParaAtualizar = { nome, email };
    
    // Só envia a senha se o usuário tiver preenchido o campo
    if (senha) {
        dadosParaAtualizar.senha = senha;
    }

    try {
        const resposta = await api('/auth/perfil', { 
            method: 'PUT', 
            body: JSON.stringify(dadosParaAtualizar) 
        });

        // Atualiza o estado global com os novos dados vindos do servidor
        currentUser.nome = resposta.usuario.nome;
        currentUser.email = resposta.usuario.email;

        // Persiste a nova sessão e atualiza a interface
        salvarSessao();
        atualizarNavbar();
        carregarPerfil();

        exibirAlerta(resposta.message || 'Perfil atualizado com sucesso!');
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
});
