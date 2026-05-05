/*
    PERFIL DO USUÁRIO: exibição e edição dos dados pessoais (Estilo Rede Social).
*//**
 * Preenche a tela de perfil com os dados de um usuário (próprio ou explorado).
 * @param {string|null} userId ID do usuário a ser visualizado. Se nulo, mostra o logado.
 */
let profileViewingId = null;

async function carregarPerfil(userId = null) {
    profileViewingId = userId;
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
    if (nameEl) nameEl.innerHTML = `<span>${userToShow.nome || 'Usuário'}</span>`;

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
    } catch (e) { }

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
            <div class="activity-item" style="display: flex; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 0.5px solid var(--accent);">
                <div class="activity-icon" style="font-size: 1.5rem; background: rgba(255,255,255,0.05); width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 0.5px solid var(--accent);">
                    ${atv.icone}
                </div>
                <div class="activity-info" style="flex: 1;">
                    <div class="activity-text" style="color: var(--text); line-height: 1.4;">${atv.texto}</div>
                    <div class="activity-date" style="font-size: 0.8rem; color: var(--text-dim); margin-top: 4px;">
                        ${formatarDataRelativa(atv.data)}
                    </div>
                    
                    <div class="activity-comments" id="comments-${atv.id}" style="margin-top: 10px; padding-top: 10px; border-top: 0.5px dashed rgba(255,255,255,0.1);">
                        <button class="btn btn-ghost btn-sm" onclick="carregarComentariosAtividade('${atv.id}')" style="padding: 4px 10px; font-size: 0.75rem;">💬 Ver Comentários</button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (erro) {
        console.error('Erro ao carregar atividades:', erro);
        listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--crimson);">Falha ao carregar atividades. Verifique se o servidor foi reiniciado.</div>`;
    }
}

async function carregarComentariosAtividade(atividadeId) {
    const container = document.getElementById(`comments-${atividadeId}`);
    if(!container) return;
    
    container.innerHTML = '<span class="spinner-sm"></span> Carregando...';
    try {
        const comentarios = await api(`/social/feed/comentarios/${atividadeId}`);
        
        let html = '<div style="margin-bottom: 12px;">';
        if(comentarios.length === 0) {
            html += '<div style="font-size:0.75rem; opacity:0.6; font-style:italic;">Nenhum comentário ainda. Seja o primeiro!</div>';
        } else {
            html += comentarios.map(c => `
                <div style="font-size: 0.8rem; margin-bottom: 6px; display: flex; gap: 8px;">
                    <strong style="color:var(--accent)">${esc(c.usuario_nome)}:</strong>
                    <span style="color:var(--text)">${esc(c.comentario)}</span>
                </div>
            `).join('');
        }
        html += '</div>';
        
        html += `
            <div style="display:flex; gap:8px;">
                <input type="text" id="input-comment-${atividadeId}" class="form-input" style="padding: 6px 12px; font-size:0.8rem; min-height:30px;" placeholder="Escreva um comentário...">
                <button class="btn btn-primary btn-sm" onclick="adicionarComentario('${atividadeId}')">Enviar</button>
            </div>
        `;
        
        container.innerHTML = html;
    } catch(err) {
        container.innerHTML = `<div style="color:var(--danger); font-size:0.8rem;">Erro ao carregar comentários.</div>`;
    }
}

async function adicionarComentario(atividadeId) {
    const input = document.getElementById(`input-comment-${atividadeId}`);
    if(!input || !input.value.trim()) return;
    
    try {
        await api('/social/feed/comentarios', {
            method: 'POST',
            body: JSON.stringify({ atividade_id: atividadeId, comentario: input.value.trim() })
        });
        carregarComentariosAtividade(atividadeId);
    } catch(err) {
        exibirAlerta('Erro ao comentar: ' + err.message, 'danger');
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
                <div class="social-user-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; cursor:pointer; flex:1;" onclick="verPerfilUsuario('${user.id}')">
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
                    <button class="btn btn-ghost btn-icon-text" title="Chat" onclick="abrirChatPrivado('${user.id}', '${esc(user.nome)}')" style="margin-left:10px;"><span>💬</span></button>
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
        const userName = document.getElementById('userProfileName')?.textContent || 'Usuário';
        
        let actionsHtml = `<button class="btn-edit-floating" onclick="abrirChatPrivado('${userId}', '${esc(userName)}')" title="Conversar" style="background: var(--accent); color: #000;">💬</button>`;

        if (status === 'nenhum') {
            actionsHtml += `<button class="btn-edit-floating" onclick="enviarPedidoAmizade('${userId}')" title="Adicionar Amigo">➕</button>`;
        } else if (status === 'enviado') {
            actionsHtml += `<button class="btn-edit-floating" disabled title="Pedido Enviado" style="opacity: 0.6; cursor: not-allowed;">⏳</button>`;
        } else if (status === 'recebido') {
            actionsHtml += `<button class="btn-edit-floating" onclick="aceitarPedidoAmizade('${amizadeId}', '${userId}')" title="Aceitar Pedido" style="background: var(--success); border-color: transparent;">✅</button>`;
        } else if (status === 'amigos') {
            actionsHtml += `<button class="btn-edit-floating" onclick="removerAmizade('${amizadeId}', '${userId}')" title="Remover Amizade" style="background: rgba(220, 53, 69, 0.2); border-color: rgba(220, 53, 69, 0.4);">🗑️</button>`;
        }
        
        container.innerHTML = `<div style="display:flex; gap:10px; justify-content:center;">${actionsHtml}</div>`;
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
        okLabel: 'Remover',
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

// --- LÓGICA DOS CLUBES DE LEITURA ---
let currentClubeId = null;
let clubesSearchTimeout = null;

/**
 * Busca e renderiza os clubes de leitura em formato de cards.
 * @param {string} busca Termo de busca opcional.
 */
async function carregarClubes(busca = '') {
    const list = document.getElementById('clubesList');
    if (!list) return;

    if (!busca) {
        list.innerHTML = '<div class="loading-row" style="grid-column: 1/-1; text-align: center; padding: 40px;"><span class="spinner"></span> Carregando clubes...</div>';
    }

    try {
        const query = busca ? `?busca=${encodeURIComponent(busca)}` : '';
        const clubes = await api(`/social/clubes${query}`);

        if (clubes.length === 0) {
            list.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">${busca ? 'Nenhum clube encontrado para sua busca.' : 'Nenhum clube criado ainda. Que tal criar o primeiro?'}</div>`;
            return;
        }

        list.innerHTML = clubes.map(c => {
            // Estilo visual: usa um gradiente baseado no nome do clube para variedade
            const gradients = [
                'linear-gradient(135deg, #1e3a8a, #1e40af)',
                'linear-gradient(135deg, #312e81, #3730a3)',
                'linear-gradient(135deg, #4c1d95, #5b21b6)',
                'linear-gradient(135deg, #2d6a4f, #1b4332)'
            ];
            const bg = gradients[Math.abs(c.id) % gradients.length];

            return `
            <div class="digital-card clube-card" onclick="abrirPerfilClube(${c.id})" style="cursor:pointer;">
                <div class="digital-card-poster" style="background: ${bg}; display:flex; align-items:center; justify-content:center; position: relative;">
                     <span style="font-size: 3.5rem; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));">👥</span>
                </div>
                <div class="digital-card-footer">
                    <h4 class="digital-card-footer-title">${esc(c.nome)}</h4>
                    <p class="digital-card-footer-subtitle">Criado por: ${esc(c.usuario_nome)}</p>
                </div>
                <div class="digital-card-content">
                    <h3 class="digital-card-title">${esc(c.nome)}</h3>
                    
                    <div class="digital-card-meta">
                        <span><strong>👑 Criador:</strong> ${esc(c.usuario_nome)}</span>
                        ${c.livro_titulo ? `<span><strong>📖 Livro:</strong> ${esc(c.livro_titulo)}</span>` : '<span><strong>📖 Livro:</strong> Leitura livre</span>'}
                        <span class="card-sinopse-meta"><strong>Descrição:</strong> ${esc(c.descricao || 'Sem descrição definida.')}</span>
                    </div>

                    <div class="digital-card-actions" style="margin-top:auto; padding-top:10px; display:flex; gap:8px;">
                        <button class="btn btn-primary btn-block" onclick="event.stopPropagation(); abrirChatClube(${c.id}, '${esc(c.nome)}')">💬 Chat</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');

    } catch (err) {
        list.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger);">Erro ao carregar: ${err.message}</div>`;
    }
}

/**
 * Debounce para busca de clubes.
 */
function carregarClubesDebounced(valor) {
    if (clubesSearchTimeout) clearTimeout(clubesSearchTimeout);
    clubesSearchTimeout = setTimeout(() => carregarClubes(valor), 400);
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('criarClubeForm');
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('clubeNome').value;
            const descricao = document.getElementById('clubeDescricao').value;
            
            try {
                await api('/social/clubes', {
                    method: 'POST',
                    body: JSON.stringify({ nome, descricao })
                });
                exibirAlerta('Clube criado!', 'success');
                fecharModal('criarClubeModal');
                carregarClubes();
            } catch(err) {
                exibirAlerta(err.message, 'danger');
            }
        });
    }
});


// --- LÓGICA DE CHAT UNIFICADO (BIBLIO CHAT) ---


/**
 * Renderiza uma bolha de chat (Unificado para Clube e Privado)
 */
function renderizarBolhaChat(m, isClube = false) {
    const isMe = String(m.usuario_id || m.remetente_id) === String(currentUser.id);
    const align = isMe ? 'flex-end' : 'flex-start';
    const bgColor = isMe ? 'var(--accent)' : 'rgba(255,255,255,0.08)';
    const color = isMe ? '#fff' : 'var(--text)';
    const borderRadius = isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px';
    const name = isMe ? 'Você' : (m.usuario_nome || 'Usuário');
    const avatar = m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    
    return `
    <div style="display: flex; flex-direction: column; align-items: ${align}; margin-bottom: 16px; width: 100%;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-direction: ${isMe ? 'row-reverse' : 'row'};">
            <img src="${esc(avatar)}" style="width:20px; height:20px; border-radius:50%; object-fit:cover; border: 0.5px solid var(--accent);">
            <span style="font-size: 0.7rem; color: var(--text-dim); font-weight: 600;">${esc(name)} • ${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div style="padding: 10px 14px; background: ${bgColor}; color: ${color}; border-radius: ${borderRadius}; font-size: 0.88rem; max-width: 85%; box-shadow: var(--shadow-sm); line-height: 1.4; word-break: break-word;">
            ${esc(m.mensagem)}
        </div>
    </div>
    `;
}


let currentChatTab = 'privado'; // 'privado' ou 'clube'
let currentChatUserId = null;
let currentChatUserName = null;
let currentClubeName = null;
let chatViewMode = 'inbox'; // 'inbox' ou 'conversation'

/**
 * Abre o chat mestre. Se houver ID, abre a conversa direta; senão, abre o inbox.
 */
async function abrirChat(tipo, id, nome) {
    const widget = document.getElementById('biblioChatWidget');
    widget.style.display = 'flex';
    
    if (id) {
        // Abre uma conversa específica
        chatViewMode = 'conversation';
        if (tipo === 'clube') {
            currentClubeId = id;
            currentClubeName = nome;
            currentChatTab = 'clube';
        } else {
            currentChatUserId = id;
            currentChatUserName = nome;
            currentChatTab = 'privado';
        }
        await exibirConversaAtiva();
    } else {
        // Abre o inbox
        await irParaInbox();
    }

    // Inicia atualização automática se ainda não houver
    if (!window.chatMasterInterval) {
        window.chatMasterInterval = setInterval(() => {
            if (widget.style.display !== 'none') {
                if (chatViewMode === 'conversation') carregarMensagensMaster(true);
                else carregarInbox(currentChatTab, true);
            }
        }, 5000);
    }
}

async function irParaInbox() {
    chatViewMode = 'inbox';
    document.getElementById('chatMainTitle').textContent = 'Biblio Chat';
    document.getElementById('btnChatBack').style.display = 'none';
    document.getElementById('chatInboxView').style.display = 'flex';
    document.getElementById('chatConversationView').style.display = 'none';
    await carregarInbox(currentChatTab);
}

async function carregarInbox(filtro, silent = false) {
    currentChatTab = filtro;
    const container = document.getElementById('inboxItemsList');
    
    // UI feedback
    document.getElementById('btnFilterPrivado').classList.toggle('active', filtro === 'privado');
    document.getElementById('btnFilterClube').classList.toggle('active', filtro === 'clube');

    try {
        let items = [];
        if (filtro === 'clube') {
            items = await api('/social/clubes');
        } else {
            // Agora traz Amigos + Conversas Recentes
            items = await api('/social/conversas');
        }

        if (items.length === 0) {
            const msg = filtro === 'clube' ? 'Nenhum clube disponível.' : 'Nenhum contato ou conversa recente.';
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-dim); font-size:0.85rem; opacity:0.6;">${msg}</div>`;
            return;
        }

        container.innerHTML = items.map(item => {
            const name = item.nome;
            const avatar = item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
            const id = item.id;
            const isClube = filtro === 'clube';
            const subtitle = isClube ? 'Grupo Literário' : 'Mensagem Privada';
            
            return `
                <div class="social-user-item" onclick="abrirChat('${filtro}', '${id}', '${esc(name)}')" style="padding: 12px; margin-bottom: 10px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s ease; cursor: pointer; display: flex; align-items: center; gap: 12px;">
                    <div class="social-user-avatar" style="width:44px; height:44px; border: 1px solid var(--accent); flex-shrink: 0;">
                        <img src="${esc(avatar)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
                    </div>
                    <div class="social-user-info" style="flex:1; min-width:0;">
                        <div class="social-user-name" style="font-size:0.92rem; color:var(--text); font-weight:700; margin:0;">${esc(name)}</div>
                        <div style="font-size:0.75rem; color:var(--accent); opacity:0.8; font-family:'Cinzel', serif; letter-spacing:0.05em;">${subtitle}</div>
                    </div>
                    <div style="color:var(--text-dim); font-size:1.2rem; opacity:0.4;">›</div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Erro ao carregar inbox:', err);
        container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger); font-size:0.8rem;">Erro ao conectar ao chat.</div>`;
    }
}

async function exibirConversaAtiva() {
    chatViewMode = 'conversation';
    const name = currentChatTab === 'clube' ? currentClubeName : currentChatUserName;
    document.getElementById('chatMainTitle').textContent = name;
    document.getElementById('btnChatBack').style.display = 'block';
    document.getElementById('chatInboxView').style.display = 'none';
    document.getElementById('chatConversationView').style.display = 'flex';
    await carregarMensagensMaster();
}

async function carregarMensagensMaster(silent = false) {
    const container = document.getElementById('chatBodyContainer');
    const isClube = currentChatTab === 'clube';
    const targetId = isClube ? currentClubeId : currentChatUserId;
    
    if (!targetId || chatViewMode !== 'conversation') return;

    try {
        const endpoint = isClube ? `/social/clubes/${targetId}/mensagens` : `/social/chat/${targetId}`;
        const mensagens = await api(endpoint);
        
        if (mensagens.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-dim); font-size:0.85rem;">Nenhuma mensagem aqui ainda.</div>`;
            return;
        }
        
        container.innerHTML = mensagens.map(m => renderizarBolhaChat(m, isClube)).join('');
        
        if (!silent) container.scrollTop = container.scrollHeight;
    } catch (err) {
        console.error('Erro ao carregar chat:', err);
    }
}

async function enviarMensagemMaster() {
    const input = document.getElementById('inputMasterChat');
    const msg = input.value.trim();
    const isClube = currentChatTab === 'clube';
    const targetId = isClube ? currentClubeId : currentChatUserId;

    if (!msg || !targetId) return;
    
    try {
        const endpoint = isClube ? `/social/clubes/${targetId}/mensagens` : `/social/chat/${targetId}`;
        await api(endpoint, {
            method: 'POST',
            body: JSON.stringify({ mensagem: msg })
        });
        input.value = '';
        await carregarMensagensMaster();
    } catch (err) {
        exibirAlerta(err.message, 'danger');
    }
}

function fecharChatMaster() {
    document.getElementById('biblioChatWidget').style.display = 'none';
    if (window.chatMasterInterval) {
        clearInterval(window.chatMasterInterval);
        window.chatMasterInterval = null;
    }
}

// Compatibilidade
function abrirChatPrivado(id, nome) { abrirChat('privado', id, nome); }
function abrirChatClube(id, nome) { abrirChat('clube', id, nome); }
function fecharChatPrivado() { fecharChatMaster(); }
function fecharChatClube() { fecharChatMaster(); }
async function carregarMensagensClube(silent) { if(currentChatTab === 'clube' && chatViewMode === 'conversation') await carregarMensagensMaster(silent); }
async function carregarMensagensPrivadas(silent) { if(currentChatTab === 'privado' && chatViewMode === 'conversation') await carregarMensagensMaster(silent); }

/**
 * Atalho para ver perfil de outro usuário e mudar de tela.
 */
function verPerfilUsuario(id) {
    console.log(`[Social] Navegando para o perfil do usuário: ${id}`);
    mostrarTela('perfilScreen');
    carregarPerfil(id);
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

// Socket events para Chat em Tempo Real
socket.on('novaMensagemClube', (data) => {
    // Se estiver com o chat do clube aberto, atualiza
    if (currentClubeId && String(data.clube_id) === String(currentClubeId) && chatViewMode === 'conversation') {
        carregarMensagensClube(true);
    } else if (chatViewMode === 'inbox' && currentChatTab === 'clube') {
        carregarInbox('clube', true);
    }
});

socket.on('novaMensagemDireta', (data) => {
    // Se estiver com o chat privado aberto com esse usuário, atualiza
    if (currentChatUserId && String(data.remetente_id) === String(currentChatUserId) && chatViewMode === 'conversation') {
        carregarMensagensPrivadas(true);
    } else {
        if (chatViewMode === 'inbox' && currentChatTab === 'privado') carregarInbox('privado', true);
        
        // Se o chat estiver fechado ou em outra conversa, mostra um alerta
        exibirAlerta('Você recebeu uma nova mensagem direta!', 'info');
        if (typeof buscarNotificacoes === 'function') buscarNotificacoes();
    }
});

