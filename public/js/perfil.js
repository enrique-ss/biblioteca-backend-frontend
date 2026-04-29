/*
    PERFIL DO USUÁRIO: exibição e edição dos dados pessoais.
    Este arquivo tem duas responsabilidades:
    1. Exibir os dados atuais do usuário logado na tela de perfil
    2. Processar o formulário de edição quando o usuário quer alterar nome, email ou senha
*/

/*
    Preenche a tela de perfil com os dados do usuário logado.
    Exibe as informações em dois lugares:
    - Área de leitura (perfilInfo): mostra nome, email e tipo de conta em modo somente-leitura
    - Formulário de edição: pré-preenche os campos para o usuário editar
    O campo de senha começa sempre vazio por segurança.
*/
function carregarPerfil() {
    document.getElementById('perfilNome').value = currentUser.nome;
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
            <div class="perfil-field-label">Tipo de Conta</div>
            <div class="perfil-field-value" style="margin-top:4px">${badgeTipo(currentUser.tipo)}</div>
        </div>`;
}

/*
    Ouve o envio do formulário de edição de perfil.
    Envia os dados atualizados para a API via PUT.
    A senha só é incluída no envio se o campo estiver preenchido;
    caso contrário, a senha atual é mantida sem alteração.
    Após sucesso, atualiza os dados em memória, salva a sessão e recarrega o perfil.
*/
document.getElementById('editPerfilForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('perfilNome').value;
    const email = document.getElementById('perfilEmail').value;
    const senha = document.getElementById('perfilSenha').value;

    const dadosParaAtualizar = { nome, email };
    
    // Inclui a senha apenas se o usuário preencheu o campo; campo vazio = mantém a senha atual
    if (senha) {
        dadosParaAtualizar.senha = senha;
    }

    try {
        const resposta = await api('/auth/perfil', { 
            method: 'PUT', 
            body: JSON.stringify(dadosParaAtualizar) 
        });

        // Atualiza os dados do usuário na memória e persiste a sessão no localStorage
        currentUser.nome = resposta.usuario.nome;
        currentUser.email = resposta.usuario.email;

        salvarSessao();
        atualizarNavbar();
        carregarPerfil();

        exibirAlerta(resposta.message || 'Perfil atualizado com sucesso!');
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
});
