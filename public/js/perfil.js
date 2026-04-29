/*
    PERFIL DO USUÁRIO: exibição e edição dos dados pessoais (Estilo Rede Social).
*/

/**
 * Preenche a tela de perfil com os dados do usuário logado e estatísticas.
 */
async function carregarPerfil() {
    console.log('[Perfil] Iniciando carregamento...', currentUser);
    if (!currentUser) return;

    // Campos do formulário (configurações)
    if (document.getElementById('perfilNome')) {
        document.getElementById('perfilNome').value = currentUser.nome || '';
        document.getElementById('perfilEmail').value = currentUser.email || '';
        document.getElementById('perfilBio').value = currentUser.bio || '';
        document.getElementById('perfilGeneros').value = currentUser.generos_favoritos || '';
        document.getElementById('perfilSenha').value = '';
    }

    // Cabeçalho e Informações Básicas
    const nameEl = document.getElementById('userProfileName');
    if (nameEl) nameEl.textContent = currentUser.nome || 'Usuário';
    
    const typeEl = document.getElementById('userProfileType');
    if (typeEl) typeEl.textContent = currentUser.tipo === 'bibliotecario' ? '👤 Bibliotecário' : '👤 Leitor';
    
    // Atualização do Avatar
    const avatarEl = document.getElementById('userProfileAvatar');
    if (avatarEl) {
        if (currentUser.avatar_url) {
            avatarEl.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar" onerror="this.src='https://ui-avatars.com/api/?name=${currentUser.nome}&background=random'">`;
        } else {
            const initial = (currentUser.nome || '?').charAt(0).toUpperCase();
            avatarEl.innerHTML = `<span id="userProfileInitials">${initial}</span>`;
        }
    }

    // Atualização do Banner
    const bannerEl = document.querySelector('.profile-banner');
    if (bannerEl) {
        if (currentUser.banner_url) {
            bannerEl.style.backgroundImage = `url('${currentUser.banner_url}')`;
        } else {
            bannerEl.style.backgroundImage = `url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=2000')`;
        }
    }

    // Biografia
    const bioEl = document.getElementById('userProfileBio');
    if (bioEl) bioEl.textContent = currentUser.bio || '';

    // Gêneros Favoritos
    const genresEl = document.getElementById('userProfileGenres');
    if (genresEl) {
        genresEl.innerHTML = '';
        if (currentUser.generos_favoritos) {
            currentUser.generos_favoritos.split(',').forEach(genre => {
                if (genre.trim()) {
                    const span = document.createElement('span');
                    span.className = 'genre-tag';
                    span.textContent = genre.trim();
                    genresEl.appendChild(span);
                }
            });
        }
    }

    // Data de entrada
    const joinDateEl = document.getElementById('userProfileJoinDate');
    if (joinDateEl && currentUser.created_at) {
        const data = new Date(currentUser.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        joinDateEl.textContent = `📅 Membro desde ${data}`;
    }

    // Estatísticas Reais - Carregadas de forma independente
    
    // 1. PDFs Subidos
    try {
        const resSubidos = await api('/acervo-digital/estatisticas/subidos');
        const el = document.getElementById('statPDFsUploaded');
        if (el) el.textContent = resSubidos.total || 0;
    } catch (e) {
        console.error('Erro ao carregar PDFs subidos:', e);
        const el = document.getElementById('statPDFsUploaded');
        if (el) el.textContent = '0';
    }

    // 2. Livros Alugados
    try {
        const resAlugueis = await api('/alugueis/meus');
        const el = document.getElementById('statBooksRented');
        if (el) el.textContent = resAlugueis.length || 0;
    } catch (e) {
        console.error('Erro ao carregar livros alugados:', e);
        const el = document.getElementById('statBooksRented');
        if (el) el.textContent = '0';
    }

    // 3. Nível Literário
    try {
        const resInfantil = await api('/infantil/data');
        const el = document.getElementById('statLevel');
        if (el && resInfantil && resInfantil.userProfile) {
            el.textContent = resInfantil.userProfile.level || 1;
        }
    } catch (e) {
        console.error('Erro ao carregar nível literário:', e);
        const el = document.getElementById('statLevel');
        if (el) el.textContent = '1';
    }

    // 4. Dias Ativos
    if (currentUser.created_at) {
        const dataCriacao = new Date(currentUser.created_at);
        dataCriacao.setHours(0, 0, 0, 0);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const diffMilis = Math.abs(hoje - dataCriacao);
        const diffDays = Math.floor(diffMilis / (1000 * 60 * 60 * 24)) + 1;
        const el = document.getElementById('statDaysActive');
        if (el) el.textContent = diffDays;
    }

    // Chamada inicial do feed
    carregarAtividades();
}

let currentActivityPage = 1;

/**
 * Busca e renderiza o feed completo de atividades do usuário.
 */
async function carregarAtividades() {
    const listEl = document.getElementById('profileActivityList');
    if (!listEl) return;

    listEl.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5;">Carregando atividades...</div>';

    try {
        const atividades = await api('/auth/atividades');

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
