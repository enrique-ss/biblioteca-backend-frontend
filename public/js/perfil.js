/*
    PERFIL DO USUÁRIO: exibição e edição dos dados pessoais (Estilo Rede Social).
*//**
 * Preenche a tela de perfil com os dados de um usuário (próprio ou explorado).
 * @param {string|null} userId ID do usuário a ser visualizado. Se nulo, mostra o logado.
 */
async function carregarPerfil(userId = null) {
    const isSelf = !userId || userId === currentUser?.id;
    let userToShow = currentUser;

    console.log(`[Perfil] Carregando perfil de: ${userId || 'mim mesmo'}`);

    // Se estivermos vendo outro usuário, buscamos os dados dele no servidor
    if (!isSelf) {
        try {
            userToShow = await api(`/auth/perfil/${userId}`);
        } catch (erro) {
            console.error('Erro ao buscar perfil de outro usuário:', erro);
            exibirAlerta('Não foi possível carregar este perfil.', 'danger');
            return;
        }
    }

    if (!userToShow) return;

    // Controla visibilidade do botão de edição (apenas para o próprio perfil)
    const editBtn = document.querySelector('.profile-header-actions');
    if (editBtn) editBtn.style.display = isSelf ? 'block' : 'none';

    // Preenche campos do formulário de edição (se for o próprio perfil)
    if (isSelf && document.getElementById('perfilNome')) {
        document.getElementById('perfilNome').value = userToShow.nome || '';
        document.getElementById('perfilEmail').value = userToShow.email || '';
        document.getElementById('perfilBio').value = userToShow.bio || '';
        document.getElementById('perfilGeneros').value = userToShow.generos_favoritos || '';
    }

    // Cabeçalho e Informações Básicas
    const nameEl = document.getElementById('userProfileName');
    if (nameEl) nameEl.textContent = userToShow.nome || 'Usuário';
    
    const typeEl = document.getElementById('userProfileType');
    if (typeEl) {
        typeEl.textContent = userToShow.tipo === 'bibliotecario' ? '👤 Bibliotecário' : '👤 Leitor';
    }
    
    // Atualização do Avatar
    const avatarEl = document.getElementById('userProfileAvatar');
    if (avatarEl) {
        if (userToShow.avatar_url) {
            avatarEl.innerHTML = `<img src="${userToShow.avatar_url}" alt="Avatar" onerror="this.src='https://ui-avatars.com/api/?name=${userToShow.nome}&background=random'">`;
        } else {
            const initial = (userToShow.nome || '?').charAt(0).toUpperCase();
            avatarEl.innerHTML = `<span id="userProfileInitials">${initial}</span>`;
        }
    }

    // Atualização do Banner
    const bannerEl = document.querySelector('.profile-banner');
    if (bannerEl) {
        if (userToShow.banner_url) {
            bannerEl.style.backgroundImage = `url('${userToShow.banner_url}')`;
        } else {
            bannerEl.style.backgroundImage = `url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=2000')`;
        }
    }

    // Biografia
    const bioEl = document.getElementById('userProfileBio');
    if (bioEl) bioEl.textContent = userToShow.bio || 'Sem biografia definida.';

    // Gêneros Favoritos
    const genresEl = document.getElementById('userProfileGenres');
    if (genresEl) {
        genresEl.innerHTML = '';
        if (userToShow.generos_favoritos) {
            userToShow.generos_favoritos.split(',').forEach(genre => {
                if (genre.trim()) {
                    const span = document.createElement('span');
                    span.className = 'genre-tag';
                    span.textContent = genre.trim();
                    genresEl.appendChild(span);
                }
            });
        } else {
            genresEl.innerHTML = '<span style="opacity:0.5; font-size:0.8rem;">Nenhum gênero favorito.</span>';
        }
    }

    // Data de entrada
    const joinDateEl = document.getElementById('userProfileJoinDate');
    if (joinDateEl && userToShow.created_at) {
        const data = new Date(userToShow.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        joinDateEl.textContent = `📅 Membro desde ${data}`;
    }

    // Estatísticas (Ajustado para funcionar com qualquer usuário)
    await carregarEstatisticasPerfil(userToShow.id);
    
    // Feed de Atividades (Ajustado para o usuário alvo)
    await carregarAtividades(userToShow.id);

    // No perfil, carregamos os AMIGOS ao invés do Explorar
    carregarAmigos(userToShow.id);

    // Atualiza botões sociais se não for o próprio perfil
    atualizarAcoesSociais(userToShow.id);
}

/**
 * Carrega as estatísticas numéricas do perfil (PDFs, Aluguéis, XP).
 */
async function carregarEstatisticasPerfil(userId) {
    // 1. PDFs Subidos
    try {
        const resSubidos = await api(`/acervo-digital/estatisticas/subidos?userId=${userId}`);
        const el = document.getElementById('statPDFsUploaded');
        if (el) el.textContent = resSubidos.total || 0;
    } catch (e) {
        const el = document.getElementById('statPDFsUploaded');
        if (el) el.textContent = '0';
    }

    // 2. Livros Alugados
    try {
        // Nota: no backend precisaremos ajustar 'alugueis/meus' para aceitar um query param de userId se quisermos ver de outros
        const endpoint = userId === currentUser.id ? '/alugueis/meus' : `/alugueis/usuario/${userId}`;
        const resAlugueis = await api(endpoint);
        const el = document.getElementById('statBooksRented');
        if (el) el.textContent = resAlugueis.length || 0;
    } catch (e) {
        const el = document.getElementById('statBooksRented');
        if (el) el.textContent = '0';
    }

    // 3. Nível Literário e Dias Ativos
    try {
        const user = (userId === currentUser.id) ? currentUser : await api(`/auth/perfil/${userId}`);
        
        const lvlEl = document.getElementById('statLevel');
        if (lvlEl) lvlEl.textContent = user.infantil_level || 1;

        const dataCriacaoStr = user.created_at || new Date().toISOString();
        const diffDays = Math.floor(Math.abs(new Date() - new Date(dataCriacaoStr)) / (1000 * 60 * 60 * 24)) + 1;
        const daysEl = document.getElementById('statDaysActive');
        if (daysEl) daysEl.textContent = diffDays;
    } catch (e) {}

    // 4. Quantidade de Amigos
    try {
        const amigos = await api(`/amizades/${userId}`);
        const el = document.getElementById('statFollowers');
        if (el) el.textContent = amigos?.length || 0;
    } catch (e) {
        const el = document.getElementById('statFollowers');
        if (el) el.textContent = '0';
    }
}

/**
 * Busca e renderiza o feed completo de atividades de um usuário.
 */
async function carregarAtividades(userId = null) {
    const listEl = document.getElementById('profileActivityList');
    if (!listEl) return;

    listEl.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5;">Carregando atividades...</div>';

    try {
        const endpoint = userId ? `/auth/atividades?userId=${userId}` : '/auth/atividades';
        const atividades = await api(endpoint);

        if (!atividades || atividades.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center; padding:40px; opacity:0.6;">
                    Nenhuma atividade registrada recentemente.
                </div>`;
            return;
        }

        listEl.innerHTML = atividades.map(atv => `
            <div class="activity-item" style="display: flex; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div class="activity-icon" style="font-size: 1.5rem; background: rgba(255,255,255,0.05); width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid var(--border);">
                    ${atv.icone}
                </div>
                <div class="activity-info" style="flex: 1;">
                    <div class="activity-text" style="color: var(--text); line-height: 1.4;">${atv.texto}</div>
                    <div class="activity-date" style="font-size: 0.8rem; color: var(--text-dim); margin-top: 4px;">
                        ${new Date(atv.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        `).join('');

    } catch (erro) {
        console.error('Erro ao carregar atividades:', erro);
        listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--crimson);">Falha ao carregar atividades. Verifique se o servidor foi reiniciado.</div>`;
    }
}

/**
 * Utilitário para converter arquivos locais em Base64 para envio ao servidor.
 */
function lerArquivoComoBase64(arquivo) {
    return new Promise((resolve, reject) => {
        if (!arquivo) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(arquivo);
    });
}

/**
 * Processa o formulário de edição de perfil.
 */
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'editPerfilForm') {
        e.preventDefault();

        const btnSubmit = e.target.querySelector('button[type="submit"]');
        const originalText = btnSubmit.textContent;

        try {
            btnSubmit.textContent = 'Processando...';
            btnSubmit.disabled = true;

            const nome = document.getElementById('perfilNome').value;
            const email = document.getElementById('perfilEmail').value;
            const bio = document.getElementById('perfilBio').value;
            const generos_favoritos = document.getElementById('perfilGeneros').value;
            const senha = document.getElementById('perfilSenha').value;

            // Processamento de Arquivos
            const avatarFile = document.getElementById('perfilAvatarFile').files[0];
            const bannerFile = document.getElementById('perfilBannerFile').files[0];

            const avatarBase64 = avatarFile ? await lerArquivoComoBase64(avatarFile) : currentUser.avatar_url;
            const bannerBase64 = bannerFile ? await lerArquivoComoBase64(bannerFile) : currentUser.banner_url;

            const dadosParaAtualizar = { 
                nome, 
                email, 
                bio, 
                generos_favoritos, 
                avatar_url: avatarBase64, 
                banner_url: bannerBase64 
            };
            if (senha) dadosParaAtualizar.senha = senha;

            const resposta = await api('/auth/perfil', { 
                method: 'PUT', 
                body: JSON.stringify(dadosParaAtualizar) 
            });

            currentUser = { ...currentUser, ...resposta.usuario };
            salvarSessao();
            if (typeof atualizarNavbar === 'function') atualizarNavbar();
            carregarPerfil();

            exibirAlerta(resposta.message || 'Perfil atualizado com sucesso!');
            if (typeof fecharModal === 'function') fecharModal('editPerfilModal');
        } catch (erro) {
            exibirAlerta(erro.message, 'danger');
        } finally {
            btnSubmit.textContent = originalText;
            btnSubmit.disabled = false;
        }
    }
});

/**
 * Função "Social": Busca e renderiza amigos do usuário ou sugestões.
 */
async function carregarAmigos(userId = null) {
    const listEl = document.getElementById('socialUsersList');
    if (!listEl) return;

    try {
        const targetId = userId || currentUser.id;
        const amigos = await api(`/amizades/${targetId}`);

        if (!amigos || amigos.length === 0) {
            listEl.innerHTML = '<div style="text-align:center; padding:30px; opacity:0.5;">Nenhum amigo adicionado ainda.</div>';
            return;
        }

        listEl.innerHTML = amigos.map(user => {
            const avatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${user.nome}&background=random`;
            
            return `
                <div class="social-user-item" onclick="verPerfilUsuario('${user.id}')">
                    <div class="social-user-avatar">
                        <img src="${avatarUrl}" alt="${user.nome}">
                    </div>
                    <div class="social-user-info">
                        <div class="social-user-name">${user.nome}</div>
                        <div class="social-user-badge">
                            🚀 Nível <span class="social-user-level">${user.infantil_level || 1}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (erro) {
        console.error('Erro ao carregar amigos:', erro);
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--crimson);">Erro ao carregar lista de amigos.</div>';
    }
}

/**
 * Atualiza o container de ações sociais (Botão Adicionar Amigo, etc).
 */
async function atualizarAcoesSociais(userId) {
    const container = document.getElementById('socialActionsContainer');
    if (!container) return;

    if (!userId || userId === currentUser?.id) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = '<span class="spinner-sm"></span>';

    try {
        const { status, id: amizadeId } = await api(`/amizades/status/${userId}`);

        if (status === 'nenhum') {
            container.innerHTML = `<button class="btn-edit-floating" onclick="enviarPedidoAmizade('${userId}')" title="Adicionar Amigo">➕</button>`;
        } else if (status === 'enviado') {
            container.innerHTML = `<button class="btn-edit-floating" disabled title="Pedido Enviado" style="opacity: 0.6; cursor: not-allowed;">⏳</button>`;
        } else if (status === 'recebido') {
            container.innerHTML = `<button class="btn-edit-floating" onclick="aceitarPedidoAmizade('${amizadeId}', '${userId}')" title="Aceitar Pedido" style="background: var(--success); border-color: transparent;">✅</button>`;
        } else if (status === 'amigos') {
            container.innerHTML = `<button class="btn-edit-floating" onclick="removerAmizade('${amizadeId}', '${userId}')" title="Remover Amizade" style="background: rgba(220, 53, 69, 0.2); border-color: rgba(220, 53, 69, 0.4);">🗑️</button>`;
        }
    } catch (erro) {
        container.innerHTML = '';
    }
}

/**
 * Envia um pedido de amizade.
 */
async function enviarPedidoAmizade(destinatarioId) {
    try {
        await api('/amizades/solicitar', {
            method: 'POST',
            body: JSON.stringify({ destinatario_id: destinatarioId })
        });
        exibirAlerta('Pedido de amizade enviado!', 'success');
        atualizarAcoesSociais(destinatarioId);
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
}

/**
 * Aceita um pedido de amizade.
 */
async function aceitarPedidoAmizade(amizadeId, userId) {
    try {
        await api(`/amizades/${amizadeId}/aceitar`, { method: 'PUT' });
        exibirAlerta('Pedido aceito!', 'success');
        atualizarAcoesSociais(userId);
        carregarAmigos(); // Recarrega minha lista
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
}

/**
 * Remove uma amizade ou pedido.
 */
async function removerAmizade(amizadeId, userId) {
    exibirConfirmacao({
        icon: '👤',
        title: 'Remover Amizade',
        msg: 'Tem certeza que deseja desfazer esta amizade?',
        okLabel: 'Sim, Remover',
        async onOk() {
            try {
                await api(`/amizades/${amizadeId}`, { method: 'DELETE' });
                exibirAlerta('Amizade removida.', 'info');
                atualizarAcoesSociais(userId);
                carregarAmigos();
            } catch (erro) {
                exibirAlerta(erro.message, 'danger');
            }
        }
    });
}

/**
 * Atalho para ver perfil de outro usuário e mudar de tela.
 */
function verPerfilUsuario(id) {
    console.log(`[Social] Navegando para o perfil do usuário: ${id}`);
    mostrarTela('perfilScreen');
    carregarPerfil(id);
}

/**
 * Debounce para busca social na TELA PRINCIPAL (Continua explorando a comunidade).
 */
let socialMainSearchTimeout;
function buscarUsuariosSocialPrincipal() {
    const search = document.getElementById('socialMainSearchInput').value;
    clearTimeout(socialMainSearchTimeout);
    socialMainSearchTimeout = setTimeout(() => {
        carregarExplorarSocial(search, 'socialScreenList');
    }, 400);
}

/**
 * Mantém a função de explorar para a tela SOCIAL dedicada.
 */
async function carregarExplorarSocial(search = '', containerId = 'socialScreenList') {
    const listEl = document.getElementById(containerId);
    if (!listEl) return;

    try {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const usuarios = await api(`/auth/explorar${query}`);

        if (!usuarios || usuarios.length === 0) {
            listEl.innerHTML = '<div style="text-align:center; padding:30px; opacity:0.5;">Nenhum usuário encontrado.</div>';
            return;
        }

        listEl.innerHTML = usuarios.map(user => {
            const avatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${user.nome}&background=random`;
            return `
                <div class="glass-card social-card-user" onclick="verPerfilUsuario('${user.id}')" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 30px; transition: all 0.3s ease; border: 1px solid var(--border);">
                    <div class="social-card-avatar" style="width: 100px; height: 100px; border-radius: 50%; background: var(--surface-2); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 800; color: var(--accent); box-shadow: var(--shadow-md); overflow: hidden; margin-bottom: 20px; border: 2px solid var(--accent-bg);">
                        <img src="${avatarUrl}" alt="${user.nome}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="social-card-name" style="font-size: 1.3rem; font-weight: 700; color: var(--text); margin-bottom: 8px;">${user.nome}</div>
                    <div class="social-card-bio" style="font-size: 0.9rem; color: var(--text-dim); line-height: 1.5; margin-bottom: 20px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.7em;">
                        ${user.bio || 'Explorando as fronteiras literárias do Biblio Verso.'}
                    </div>
                    <div class="social-card-meta" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                        <span class="social-card-badge" style="padding: 6px 14px; background: var(--accent-bg); color: var(--accent); border-radius: var(--r-pill); font-size: 0.75rem; font-weight: 700;">
                            ✨ Nível ${user.infantil_level || 1}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (erro) {
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--crimson);">Erro ao carregar comunidade.</div>';
    }
}

// Socket events para amizade
socket.on('novoPedidoAmizade', () => {
    exibirAlerta('Você recebeu um novo pedido de amizade!', 'info');
    if (typeof buscarNotificacoes === 'function') buscarNotificacoes();
});

socket.on('pedidoAmizadeAceito', (data) => {
    exibirAlerta('Seu pedido de amizade foi aceito!', 'success');
    if (typeof buscarNotificacoes === 'function') buscarNotificacoes();
    carregarAmigos();
});

