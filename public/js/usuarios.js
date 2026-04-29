/*
    GERENCIAMENTO DE USUÁRIOS: listagem, edição, bloqueio e controle de multas.
    Este arquivo é exclusivo para bibliotecários (administradores) e concentra:

    - carregarUsuarios: busca e lista todos os usuários cadastrados com paginação
    - editarUsuario: abre o modal de edição pré-preenchido com os dados do usuário
    - verMultasUsuario / carregarMultasUsuario: exibe o histórico de multas de um usuário
    - bloquearUsuario / desbloquearUsuario: controla o acesso do usuário ao sistema
    - quitarMultasUsuario: marca todas as multas pendentes de um usuário como pagas
*/

/*
    Versão com debounce da função de carregamento.
    Evita disparar uma requisição ao servidor a cada letra digitada na busca.
    Aguarda um curto intervalo após o usuário parar de digitar antes de buscar.
*/
const carregarUsuariosDebounced = debounce((busca) => carregarUsuarios(1, busca));

/*
    Busca e renderiza a lista de usuários cadastrados.
    Suporta paginação (20 por página) e filtro de busca por nome ou email.
    Cada linha da tabela mostra: ID, nome (com badges de multa/bloqueio),
    email, tipo de conta (usuário/bibliotecário) e botões de ação.
    Os botões variam conforme o estado do usuário (bloqueado ou não, com multa ou não).
*/
async function carregarUsuarios(pagina = 1, busca = '') {
    definirCarregando('usuariosTbody', 5);
    try {
        const parametros = new URLSearchParams({ 
            page: pagina, 
            limit: 20
        });
        
        if (busca.trim()) {
            parametros.set('busca', busca.trim());
        }

        const { data, pages } = await api(`/usuarios?${parametros}`);
        const tbody = document.getElementById('usuariosTbody');
        tbody.innerHTML = '';
        
        if (!data.length) { 
            definirVazio('usuariosTbody', 5, 'Nenhum usuário cadastrado.'); 
            return; 
        }

        data.forEach(u => {
            const tr = document.createElement('tr');
            
            /*
                Badges de alerta que aparecem ao lado do nome do usuário:
                - Badge vermelho "multa": o usuário tem multa pendente a pagar
                - Badge amarelo "bloqueado": o usuário não pode fazer empréstimos
            */
            let badgesDestaque = '';
            if (u.multa_pendente) {
                badgesDestaque += `<span class="badge badge-danger" style="margin-left:6px;font-size:.55rem">multa</span>`;
            }
            if (u.bloqueado) {
                badgesDestaque += `<span class="badge badge-warning" style="margin-left:6px;font-size:.55rem">bloqueado</span>`;
            }

            /*
                Botão de bloqueio: muda conforme o estado atual do usuário.
                Se estiver bloqueado, mostra "Desbloquear" (cinza).
                Se estiver livre, mostra "Bloquear" (vermelho).
            */
            let botaoBloqueio = '';
            const userId = JSON.stringify(String(u.id));
            const userName = JSON.stringify(u.nome);
            if (u.bloqueado) {
                botaoBloqueio = `<button class="btn btn-ghost" onclick='desbloquearUsuario(${userId}, ${userName})'>Desbloquear</button>`;
            } else {
                botaoBloqueio = `<button class="btn btn-danger" onclick='bloquearUsuario(${userId}, ${userName})'>Bloquear</button>`;
            }

            // Botão de multas: só aparece se o usuário tem multas pendentes
            let botaoMultas = '';
            if (u.multa_pendente) {
                botaoMultas = `<button class="btn btn-warning" onclick='verMultasUsuario(${userId}, ${userName})'>Multas</button>`;
            }

            tr.innerHTML = `
                <td style="color:var(--text-dim)">${esc(u.id)}</td>
                <td><strong>${esc(u.nome)}</strong>${badgesDestaque}</td>
                <td style="color:var(--text)">${esc(u.email)}</td>
                <td>${badgeTipo(u.tipo)}</td>
                <td><div class="td-actions">
                    <button class="btn btn-ghost" onclick='editarUsuario(${JSON.stringify(u)})'>Editar</button>
                    ${botaoMultas}
                    ${botaoBloqueio}
                </div></td>`;
            
            tbody.appendChild(tr);
        });

        renderizarPaginacao('usuariosPagination', pagina, pages, (p) => carregarUsuarios(p, busca));
    } catch (erro) { 
        definirVazio('usuariosTbody', 5, erro.message); 
        exibirAlerta(erro.message, 'danger'); 
    }
}

/*
    Abre o modal de edição de usuário pré-preenchido com os dados atuais.
    Permite ao bibliotecário alterar nome, email e tipo de conta (usuário/bibliotecário).
*/
function editarUsuario(u) {
    document.getElementById('editUsuarioId').value = u.id;
    document.getElementById('editUsuarioNome').value = u.nome;
    document.getElementById('editUsuarioEmail').value = u.email;
    document.getElementById('editUsuarioTipo').value = u.tipo;
    abrirModal('editUsuarioModal');
}

/*
    Ouve o envio do formulário de edição de usuário.
    Envia os dados alterados para a API e fecha o modal ao concluir.
*/
document.getElementById('editUsuarioForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editUsuarioId').value;
    try {
        await api(`/usuarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                nome: document.getElementById('editUsuarioNome').value,
                email: document.getElementById('editUsuarioEmail').value,
                tipo: document.getElementById('editUsuarioTipo').value,
            })
        });
        exibirAlerta('Usuário atualizado com sucesso!');
        fecharModal('editUsuarioModal');
        carregarUsuarios();
    } catch (erro) { 
        exibirAlerta(erro.message, 'danger'); 
    }
});

/*
    Abre o modal de multas para um usuário específico.
    Exibe o nome do usuário no título do modal e carrega o histórico de multas.
*/
async function verMultasUsuario(id, nome) {
    abrirModal('multasModal');
    document.getElementById('multasUsuarioNome').textContent = nome;
    document.getElementById('multasUsuarioId').value = id;
    await carregarMultasUsuario(id);
}

/*
    Carrega o histórico de multas de um usuário e preenche a tabela do modal.
    Exibe tipo de multa, livro relacionado, valor em reais, dias de atraso e status.
    Se houver total pendente, mostra o botão "Quitar Multas"; caso contrário, oculta.
*/
async function carregarMultasUsuario(id) {
    definirCarregando('multasTbody', 5);
    try {
        const { multas, total_pendente } = await api(`/alugueis/multas/${id}`);
        const tbody = document.getElementById('multasTbody');
        tbody.innerHTML = '';
        
        if (!multas.length) { 
            definirVazio('multasTbody', 5, 'Nenhuma multa registrada.'); 
            return; 
        }

        multas.forEach(m => {
            const tr = document.createElement('tr');
            // Badge verde para multas pagas, vermelho para pendentes
            const classeBadge = m.status === 'pendente' ? 'badge-danger' : 'badge-success';
            
            tr.innerHTML = `
                <td>${badgeTipoMulta(m.tipo)}</td>
                <td><strong>${esc(m.livro)}</strong></td>
                <td style="color:#f85149;font-weight:600">R$ ${Number(m.valor).toFixed(2)}</td>
                <td style="color:var(--text)">${m.dias_atraso > 0 ? `${m.dias_atraso} dias` : '—'}</td>
                <td><span class="badge ${classeBadge}">${esc(m.status)}</span></td>
                <td style="color:var(--text)">${formatarData(m.created_at)}</td>`;
            
            tbody.appendChild(tr);
        });

        const totalEl = document.getElementById('multasTotalPendente');
        if (total_pendente > 0) {
            totalEl.innerHTML = `Total pendente: <strong style="color:#f85149">R$ ${total_pendente.toFixed(2)}</strong>`;
            document.getElementById('btnQuitarMultas').style.display = 'inline-flex';
        } else {
            totalEl.textContent = 'Sem multas pendentes.';
            document.getElementById('btnQuitarMultas').style.display = 'none';
        }
    } catch (erro) { 
        definirVazio('multasTbody', 5, erro.message); 
    }
}

/*
    Bloqueia um usuário, impedindo-o de realizar novos empréstimos.
    Exige que o bibliotecário informe o motivo do bloqueio via prompt.
    Se o motivo estiver vazio, a ação é cancelada silenciosamente.
*/
async function bloquearUsuario(id, nome) {
    exibirConfirmacao({
        icon: '🔒',
        title: 'Bloquear Usuário',
        msg: `Bloquear o usuário "${nome}"? Ele não poderá mais realizar empréstimos.`,
        okLabel: 'Bloquear',
        onOk: async () => {
            const motivo = prompt('Motivo do bloqueio:');
            // Se o usuário cancelou o prompt ou deixou vazio, não faz nada
            if (!motivo) {
                return;
            }
            if (motivo.trim() === '') {
                return;
            }
            
            try {
                await api(`/usuarios/${id}/bloquear`, {
                    method: 'PATCH',
                    body: JSON.stringify({ motivo: motivo.trim() })
                });
                exibirAlerta('Usuário bloqueado com sucesso!', 'success');
                carregarUsuarios();
            } catch (erro) {
                exibirAlerta(erro.message, 'danger');
            }
        }
    });
}

/*
    Desbloqueia um usuário, restaurando seu acesso aos empréstimos.
    Exibe diálogo de confirmação antes de executar a ação.
*/
async function desbloquearUsuario(id, nome) {
    exibirConfirmacao({
        icon: '🔓',
        title: 'Desbloquear Usuário',
        msg: `Desbloquear o usuário "${nome}"? Ele poderá voltar a realizar empréstimos.`,
        okLabel: 'Desbloquear',
        onOk: async () => {
            try {
                await api(`/usuarios/${id}/desbloquear`, { method: 'PATCH' });
                exibirAlerta('Usuário desbloqueado com sucesso!', 'success');
                carregarUsuarios();
            } catch (erro) {
                exibirAlerta(erro.message, 'danger');
            }
        }
    });
}

/*
    Quita (paga) todas as multas pendentes de um usuário de uma vez.
    Lê o ID do usuário do campo oculto do modal de multas.
    Após a quitação, recarrega as multas e a lista de usuários para atualizar os badges.
*/
async function quitarMultasUsuario() {
    const id = document.getElementById('multasUsuarioId').value;
    try {
        const resultado = await api(`/alugueis/multas/${id}/pagar`, { method: 'PUT' });
        exibirAlerta(resultado.message);
        await carregarMultasUsuario(id);
        carregarUsuarios();
    } catch (erro) { 
        exibirAlerta(erro.message, 'danger'); 
    }
}
