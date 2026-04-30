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

let usuariosAtuais = []; // Cache global para acesso rápido aos dados dos usuários na página

/*
    Busca e renderiza a lista de usuários cadastrados.
    Suporta paginação (20 por página) e filtro de busca por nome ou email.
    Cada linha da tabela mostra: ID, nome (com badges de multa/bloqueio),
    email, tipo de conta (usuário/bibliotecário) e botões de ação.
    Os botões variam conforme o estado do usuário (bloqueado ou não, com multa ou não).
*/
async function carregarUsuarios(pagina = 1, busca = '') {
    const grid = document.getElementById('usuariosGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading-row" style="grid-column: 1/-1; text-align: center; padding: 40px;"><span class="spinner"></span> Carregando comunidade...</div>';

    try {
        const parametros = new URLSearchParams({ 
            page: pagina, 
            limit: 20,
            _t: new Date().getTime() // Cache buster para garantir dados sempre atualizados
        });
        
        if (busca.trim()) {
            parametros.set('busca', busca.trim());
        }

        const { data, pages } = await api(`/usuarios?${parametros}`);
        grid.innerHTML = '';
        
        if (!data.length) { 
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; opacity:0.5;">Nenhum usuário encontrado na comunidade.</div>';
            return; 
        }

        const ehAdmin = currentUser?.tipo === 'bibliotecario';

        usuariosAtuais = data;

        grid.innerHTML = data.map(u => {
            const avatarUrl = u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome)}&background=random`;
            
            // Lógica de admin (botões flutuantes)
            let adminActions = '';
            if (ehAdmin) {
                const userId = String(u.id);
                const userName = JSON.stringify(u.nome);
                
                let botaoBloqueio = `
                    <button title="Gerenciar Restrições" 
                            onclick='event.stopPropagation(); prepararBloqueios("${userId}")' 
                            style="position: absolute; top: 10px; right: 10px; background: rgba(248, 81, 73, 0.15); border: 1px solid rgba(248, 81, 73, 0.3); color: #f85149; cursor: pointer; padding: 0; width: 24px; height: 24px; border-radius: 50%; font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; justify-content: center; transition: 0.2s; backdrop-filter: blur(4px); pointer-events: auto;" 
                            onmouseover="this.style.background='var(--danger)'; this.style.color='white'" 
                            onmouseout="this.style.background='rgba(248, 81, 73, 0.15)'; this.style.color='#f85149'">
                        ✕
                    </button>`;
                
                let botaoMultas = u.multa_pendente 
                    ? `<button title="Gerenciar Multas" onclick='event.stopPropagation(); verMultasUsuario("${userId}", ${userName})' style="background:none; border:none; color:var(--warning); cursor:pointer; padding:4px; font-size:1rem; transition:0.2s; position: absolute; top: 10px; right: 40px; pointer-events: auto;">💸</button>` : '';

                adminActions = `
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;">
                        ${botaoMultas}
                        ${botaoBloqueio}
                    </div>
                `;
            }

            // Badges sutis para estado (bloqueado/multa)
            const temRestricoes = u.bloqueios && Object.values(u.bloqueios).some(v => v === true);
            let statusBadges = '';
            
            if (u.bloqueado) {
                statusBadges += `<div style="position:absolute; top:12px; left:12px; padding: 3px 7px; border-radius: 6px; background:#f85149; color: white; font-size: 0.55rem; font-weight: 800; box-shadow: 0 0 12px rgba(248, 81, 73, 0.4); letter-spacing: 0.5px;" title="Esta conta está banida e não pode logar">BANIDO</div>`;
            } else if (temRestricoes) {
                statusBadges += `<div style="position:absolute; top:12px; left:12px; padding: 3px 7px; border-radius: 6px; background:#e3b341; color: black; font-size: 0.55rem; font-weight: 800; box-shadow: 0 0 12px rgba(227, 179, 65, 0.4); letter-spacing: 0.5px;" title="O usuário possui restrições parciais de acesso">RESTRITO</div>`;
            }

            if (u.multa_pendente) {
                statusBadges += `<div style="position:absolute; top:12px; right:12px; width:10px; height:10px; border-radius:50%; background:var(--danger); box-shadow: 0 0 8px var(--danger);" title="Possui multas pendentes"></div>`;
            }

            // Biografia (vazia ou real)
            const bioContent = u.bio ? esc(u.bio) : '<span style="opacity:0.4; font-style:italic;">Sem biografia</span>';
            
            // Nível e Cargo
            const cargo = u.tipo === 'bibliotecario' ? '👑 Bibliotecário' : '📖 Leitor';
            const nivel = `✨ Nível ${u.infantil_level || 1}`;

            return `
                <div class="glass-card" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px 15px;">
                    ${statusBadges}
                    ${adminActions}
                    
                    <div class="avatar-standard" 
                         onclick="if(typeof verPerfilUsuario === 'function') verPerfilUsuario('${u.id}')" 
                         style="margin-bottom: 12px; cursor: pointer; pointer-events: auto;">
                        <img src="${avatarUrl}" alt="${u.nome}">
                    </div>
                    
                    <div onclick="if(typeof verPerfilUsuario === 'function') verPerfilUsuario('${u.id}')" style="font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 6px; cursor: pointer; width: 100%; padding: 0 10px; pointer-events: auto;">
                        <span class="text-glow">${esc(u.nome)}</span>
                    </div>
                    
                    <div style="font-size: 0.8rem; color: var(--text-dim); line-height: 1.4; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.8em; width: 100%;">
                        ${bioContent}
                    </div>
                    
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: auto; pointer-events: auto;">
                        <span style="padding: 4px 10px; background: var(--accent-bg); color: var(--accent); border-radius: var(--r-pill); font-size: 0.65rem; font-weight: 700;">
                            ${nivel}
                        </span>
                        <span ${ehAdmin ? `onclick="mudarNivelAcesso('${u.id}', '${u.tipo}')" title="Clique para alterar cargo"` : ''} 
                              style="padding: 4px 10px; background: rgba(255,255,255,0.03); color: var(--text-dim); border-radius: var(--r-pill); font-size: 0.65rem; font-weight: 700; border: 0.5px solid var(--accent); ${ehAdmin ? 'cursor: pointer;' : 'cursor: default;'} transition: 0.2s;"
                              ${ehAdmin ? `onmouseover="this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'" onmouseout="this.style.borderColor='var(--accent)'; this.style.color='var(--text-dim)'"` : ''}>
                            ${cargo}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        renderizarPaginacao('usuariosPagination', pagina, pages, (p) => carregarUsuarios(p, busca));
    } catch (erro) { 
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--danger);">${esc(erro.message)}</div>`; 
    }
}


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

/**
 * Alterna o cargo do usuário entre Leitor e Bibliotecário.
 */
async function mudarNivelAcesso(id, tipoAtual) {
    const novoTipo = tipoAtual === 'bibliotecario' ? 'usuario' : 'bibliotecario';
    const label = novoTipo === 'bibliotecario' ? 'Bibliotecário' : 'Leitor';
    
    exibirConfirmacao({
        icon: '👑',
        title: 'Alterar Cargo',
        msg: `Deseja mudar o cargo deste usuário para "${label}"?`,
        okLabel: 'Alterar',
        onOk: async () => {
            try {
                await api(`/usuarios/${id}/mudar-tipo`, {
                    method: 'PATCH',
                    body: JSON.stringify({ tipo: novoTipo })
                });
                exibirAlerta(`Cargo atualizado para ${label}!`, 'success');
                carregarUsuarios();
            } catch (erro) {
                exibirAlerta(erro.message, 'danger');
            }
        }
    });
}

/**
 * Abre o modal de bloqueios granulares e preenche com os dados atuais do usuário.
 */
function prepararBloqueios(id) {
    const u = usuariosAtuais.find(user => String(user.id) === String(id));
    if (!u) return;

    document.getElementById('bloqueioUsuarioId').value = u.id;
    document.getElementById('bloqueioMotivo').value = u.motivo_bloqueio || '';
    
    const restricoes = u.bloqueios || {};
    document.getElementById('blockFisico').checked = !!restricoes.fisico;
    document.getElementById('blockDigital').checked = !!restricoes.digital;
    document.getElementById('blockSocial').checked = !!restricoes.social;
    document.getElementById('blockInfantil').checked = !!restricoes.infantil;
    document.getElementById('blockBan').checked = !!u.bloqueado;
    
    abrirModal('bloqueiosModal');
}

/**
 * Envia as restrições selecionadas para o servidor.
 */
document.getElementById('bloqueiosForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('bloqueioUsuarioId').value;
    const bloqueios = {
        fisico: document.getElementById('blockFisico').checked,
        digital: document.getElementById('blockDigital').checked,
        social: document.getElementById('blockSocial').checked,
        infantil: document.getElementById('blockInfantil').checked
    };
    const ban = document.getElementById('blockBan').checked;
    const motivo = document.getElementById('bloqueioMotivo').value;

    try {
        await api(`/usuarios/${id}/bloquear`, {
            method: 'PATCH',
            body: JSON.stringify({ motivo, bloqueios, ban })
        });
        exibirAlerta('Restrições atualizadas com sucesso!', 'success');
        fecharModal('bloqueiosModal');
        carregarUsuarios();
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
});

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
