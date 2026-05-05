/*
  PERFIL DE LIVRO E CLUBE DE LEITURA
  Gerencia as telas de perfil de livros (físicos e digitais) e clubes de leitura,
  reutilizando o mesmo layout visual do perfil de usuário.
*/

// Estado da tela de perfil atual
let _livroPerfilAtual = null; // { id, tipo: 'fisico'|'digital' }
let _clubePerfilAtual = null; // { id }

// --- RENDERIZAÇÃO DE ESTRELAS ---

function renderEstrelas(nota, total = 5) {
    const n = Math.round(nota);
    return Array.from({ length: total }, (_, i) =>
        `<span style="color: ${i < n ? 'var(--accent)' : 'var(--text-dim)'}">★</span>`
    ).join('');
}

// --- PERFIL DE LIVRO (Físico ou Digital) ---

async function abrirPerfilLivro(id, tipo = 'fisico') {
    _livroPerfilAtual = { id, tipo };

    mostrarTela('livroPerfilScreen');

    // Loading state
    document.getElementById('livroPerfilTitulo').textContent = 'Carregando...';
    document.getElementById('livroAvaliacoesList').innerHTML =
        '<div style="text-align:center; padding:40px;"><span class="spinner"></span></div>';

    try {
        const endpoint = tipo === 'digital'
            ? `/social/digital/${id}/perfil`
            : `/social/livros/${id}/perfil`;

        const data = await api(endpoint);
        const livro = data.livro;

        // Banner: usa capa como background se existir
        const banner = document.getElementById('livroBanner');
        if (livro.capa_url) {
            banner.style.backgroundImage = `url('${livro.capa_url}')`;
            banner.style.backgroundSize = 'cover';
            banner.style.backgroundPosition = 'center';
        }

        // Avatar: capa do livro
        const avatar = document.getElementById('livroAvatar');
        if (livro.capa_url) {
            avatar.innerHTML = `<img src="${livro.capa_url}" alt="Capa" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            avatar.innerHTML = `<span style="font-size:2.5rem;">${tipo === 'digital' ? '📄' : '📖'}</span>`;
        }

        // Cabeçalho
        document.getElementById('livroPerfilTitulo').textContent = livro.titulo;
        document.getElementById('livroPerfilAutor').textContent = livro.autor ? `✍️ ${livro.autor}` : '';
        document.getElementById('livroPerfilAno').textContent = livro.ano_lancamento || livro.ano
            ? `📅 ${livro.ano_lancamento || livro.ano}` : '';
        document.getElementById('livroPerfilGenero').textContent =
            livro.genero || livro.categoria ? `🏷️ ${livro.genero || livro.categoria}` : '';

        // Estrelas
        const nota = parseFloat(livro.media_nota) || 0;
        document.getElementById('livroEstrelasDisplay').innerHTML =
            nota > 0 ? renderEstrelas(nota) + ` <small style="font-size:0.9rem; color: var(--text-dim);">(${nota.toFixed(1)})</small>` : '';

        // Sidebar — Sinopse
        document.getElementById('livroPerfilSinopse').textContent =
            livro.sinopse || 'Sem sinopse disponível.';

        // Sidebar — Stats
        document.getElementById('livroStatNota').textContent =
            nota > 0 ? `${nota.toFixed(1)} ★` : '—';
        document.getElementById('livroStatAvaliacoes').textContent = livro.total_avaliacoes || 0;
        document.getElementById('livroStatAno').textContent =
            livro.ano_lancamento || livro.ano || '—';

        // Exemplares (somente físico)
        const exemplarBox = document.getElementById('livroStatExemplarBox');
        if (tipo === 'fisico') {
            document.getElementById('livroStatExemplares').textContent =
                `${livro.exemplares_disponiveis ?? '—'}/${livro.exemplares ?? '—'}`;
            exemplarBox.style.display = '';
        } else {
            exemplarBox.style.display = 'none';
        }

        // Botão avaliar
        const btnAvaliar = document.getElementById('btnAvaliarLivro');
        btnAvaliar.style.display = 'inline-flex';

        // Pré-preenche avaliação existente
        if (data.minha_avaliacao) {
            const { nota: minhaNotaVal, comentario } = data.minha_avaliacao;
            document.getElementById('avaliacaoNota').value = minhaNotaVal;
            document.getElementById('avaliacaoComentario').value = comentario || '';
            btnAvaliar.textContent = '✏️ Editar Avaliação';
            _sincronizarEstrelas(minhaNotaVal);
        } else {
            document.getElementById('avaliacaoNota').value = 0;
            document.getElementById('avaliacaoComentario').value = '';
            btnAvaliar.textContent = '⭐ Avaliar';
            _sincronizarEstrelas(0);
        }

        // Define o tipo/id no modal de avaliação
        document.getElementById('avaliacaoItemTipo').value = tipo;
        document.getElementById('avaliacaoItemId').value = id;
        document.getElementById('avaliacaoSubtitle').textContent =
            `Como foi sua experiência com "${livro.titulo}"?`;

        // Lista de avaliações
        _renderAvaliacoes(data.avaliacoes || []);

    } catch (err) {
        console.error('Erro ao carregar perfil do livro:', err);
        exibirAlerta('Erro ao carregar perfil do livro.', 'danger');
    }
}

function _renderAvaliacoes(avaliacoes) {
    const container = document.getElementById('livroAvaliacoesList');
    if (!avaliacoes.length) {
        container.innerHTML = '<div style="text-align:center; padding:40px; opacity:0.6;">Nenhuma avaliação ainda. Seja o primeiro!</div>';
        return;
    }

    container.innerHTML = avaliacoes.map(av => {
        const inicial = (av.usuario_nome || '?').charAt(0).toUpperCase();
        const data = av.created_at ? new Date(av.created_at).toLocaleDateString('pt-BR') : '';
        return `
        <div class="activity-item" style="display:flex; gap:14px; align-items:flex-start; padding: 16px 0;">
            <div style="width:40px; height:40px; border-radius:50%; background:var(--surface); border: 0.5px solid var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-weight:700; color:var(--accent); overflow:hidden;">
                ${av.avatar_url
                    ? `<img src="${av.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
                    : inicial}
            </div>
            <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="font-size:0.9rem;">${esc(av.usuario_nome || 'Leitor')}</strong>
                    <span style="font-size:0.8rem; color:var(--text-dim);">${data}</span>
                </div>
                <div style="font-size:1rem; color:var(--accent); margin-bottom:4px;">${renderEstrelas(av.nota)}</div>
                ${av.comentario ? `<p style="font-size:0.88rem; color:var(--text-dim); line-height:1.5;">${esc(av.comentario)}</p>` : ''}
            </div>
        </div>`;
    }).join('');
}

// Sincroniza as estrelas do modal com um valor
function _sincronizarEstrelas(valor) {
    document.querySelectorAll('.star-rating span').forEach(s => {
        s.style.color = parseInt(s.dataset.value) <= valor ? 'var(--accent)' : 'var(--text-dim)';
    });
}

// Abre o modal de avaliação (já pré-configurado por abrirPerfilLivro)
function abrirAvaliacaoModal() {
    const nota = parseInt(document.getElementById('avaliacaoNota').value) || 0;
    _sincronizarEstrelas(nota);
    document.getElementById('btnSalvarAvaliacao').disabled = nota === 0;
    abrirModal('avaliacaoModal');
}

// --- PERFIL DE CLUBE DE LEITURA ---

async function abrirPerfilClube(id) {
    _clubePerfilAtual = { id };
    mostrarTela('clubePerfilScreen');

    document.getElementById('clubePerfilNome').textContent = 'Carregando...';
    document.getElementById('clubeMembrosList').innerHTML =
        '<div style="text-align:center; padding:10px; opacity:0.5; font-size:0.8rem;">Carregando...</div>';

    try {
        const data = await api(`/social/clubes/${id}/perfil`);
        const { clube, membros, total_mensagens } = data;

        // Cabeçalho
        document.getElementById('clubePerfilNome').textContent = clube.nome;
        document.getElementById('clubePerfilCriador').textContent = `👤 Criado por ${esc(clube.criador_nome)}`;
        document.getElementById('clubePerfilLivro').textContent = clube.livro_titulo
            ? `📖 ${esc(clube.livro_titulo)}` : '';

        // Sidebar
        document.getElementById('clubePerfilDescricao').textContent =
            clube.descricao || 'Sem descrição.';
        document.getElementById('clubeStatMembros').textContent = membros.length;
        document.getElementById('clubeStatMensagens').textContent = total_mensagens;

        // Lista de membros
        const membrosList = document.getElementById('clubeMembrosList');
        if (!membros.length) {
            membrosList.innerHTML = '<div style="opacity:0.5; font-size:0.8rem; text-align:center; padding:10px;">Nenhum participante ainda.</div>';
        } else {
            membrosList.innerHTML = membros.map(m => {
                const inicial = (m.nome || '?').charAt(0).toUpperCase();
                return `
                <div class="social-user-item" style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom: 0.5px solid rgba(255,255,255,0.05); cursor:pointer;" onclick="carregarPerfil('${m.id}'); mostrarTela('perfilScreen');">
                    <div style="width:34px; height:34px; border-radius:50%; background:var(--surface); border: 0.5px solid var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden;">
                        ${m.avatar_url ? `<img src="${m.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` : inicial}
                    </div>
                    <span style="font-size:0.88rem;">${esc(m.nome)}</span>
                </div>`;
            }).join('');
        }

        // Livro em debate
        const debateEl = document.getElementById('clubeLivroDebate');
        if (clube.livro_titulo) {
            debateEl.innerHTML = `
            <div class="digital-card" style="max-width:300px; margin: 0 auto; display:flex; flex-direction:column; align-items:center; gap:12px; cursor:pointer;" onclick="abrirPerfilLivro(${clube.livro_id}, 'fisico')">
                ${clube.livro_capa ? `<img src="${clube.livro_capa}" style="width:120px; border-radius:var(--r-sm); box-shadow:var(--shadow);">` : '<div style="font-size:3rem;">📖</div>'}
                <h3 style="text-align:center; font-size:1rem;">${esc(clube.livro_titulo)}</h3>
                <button class="btn btn-ghost btn-sm">Ver Perfil do Livro</button>
            </div>`;
        } else {
            debateEl.innerHTML = '<div style="text-align:center; opacity:0.6; padding:20px;">Nenhum livro associado a este clube.</div>';
        }

    } catch (err) {
        console.error('Erro ao carregar perfil do clube:', err);
        exibirAlerta('Erro ao carregar perfil do clube.', 'danger');
    }
}

// Abre o chat a partir da tela de perfil do clube
function abrirChatClubePerfil() {
    if (!_clubePerfilAtual) return;
    const nomeEl = document.getElementById('clubePerfilNome');
    abrirChatClube(_clubePerfilAtual.id, nomeEl?.textContent || 'Clube');
}

// --- INICIALIZAÇÃO DO MODAL DE AVALIAÇÃO (Estrelas) ---

document.addEventListener('DOMContentLoaded', () => {
    // Lógica de clique nas estrelas do modal de avaliação
    document.querySelectorAll('.star-rating span').forEach(star => {
        star.addEventListener('click', () => {
            const val = parseInt(star.dataset.value);
            document.getElementById('avaliacaoNota').value = val;
            document.getElementById('btnSalvarAvaliacao').disabled = false;
            _sincronizarEstrelas(val);
        });
        star.addEventListener('mouseenter', () => {
            const val = parseInt(star.dataset.value);
            _sincronizarEstrelas(val);
        });
        star.addEventListener('mouseleave', () => {
            const val = parseInt(document.getElementById('avaliacaoNota').value) || 0;
            _sincronizarEstrelas(val);
        });
    });

    // Submissão do formulário de avaliação
    const form = document.getElementById('avaliacaoForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nota = parseInt(document.getElementById('avaliacaoNota').value);
            const comentario = document.getElementById('avaliacaoComentario').value;
            const tipo = document.getElementById('avaliacaoItemTipo').value;
            const itemId = parseInt(document.getElementById('avaliacaoItemId').value);

            if (!nota || nota < 1) {
                exibirAlerta('Selecione uma nota antes de salvar.', 'warning');
                return;
            }

            const body = { nota, comentario };
            if (tipo === 'digital') {
                body.acervo_digital_id = itemId;
            } else {
                body.livro_id = itemId;
            }

            try {
                await api('/social/avaliacoes', {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                exibirAlerta('Avaliação salva com sucesso!', 'success');
                fecharModal('avaliacaoModal');
                // Recarrega a tela de perfil do livro para atualizar as notas
                if (_livroPerfilAtual) {
                    abrirPerfilLivro(_livroPerfilAtual.id, _livroPerfilAtual.tipo);
                }
            } catch (err) {
                exibirAlerta(err.message || 'Erro ao salvar avaliação.', 'danger');
            }
        });
    }
});
