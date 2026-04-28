// Acervo digital (PDFs)

let controladorAbortarDigital = null;

const carregarAcervoDigitalDebounced = debounce((valor) => carregarAcervoDigital(1));

async function carregarAcervoDigital(pagina = 1) {
    const grid = document.getElementById('digitalGrid');
    const busca = document.getElementById('buscaDigital').value;

    // Cancela requisição anterior
    if (controladorAbortarDigital) {
        controladorAbortarDigital.abort();
    }
    controladorAbortarDigital = new AbortController();

    grid.innerHTML = '<div class="loading-row" style="grid-column: 1/-1; text-align: center; padding: 40px;"><span class="spinner"></span> Carregando acervo digital...</div>';

    try {
        const query = new URLSearchParams({
            page: pagina,
            limit: 12
        });

        if (busca.trim()) query.set('busca', busca.trim());

        const response = await fetch(`${API_URL}/acervo-digital?${query}`, {
            headers: { 
                'Authorization': `Bearer ${token || ''}`,
                'Content-Type': 'application/json'
            },
            signal: controladorAbortarDigital.signal
        });

        if (!response.ok) throw new Error('Erro ao carregar acervo digital');

        const { data, page, pages } = await response.json();

        if (data.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-dim); font-style: italic;">Nenhum documento digital encontrado para esta busca.</div>';
            document.getElementById('digitalPagination').innerHTML = '';
            return;
        }

        grid.innerHTML = '';
        
        const gradientes = [
            'linear-gradient(135deg, #1e3a8a, #1e40af)', // Blue
            'linear-gradient(135deg, #312e81, #3730a3)', // Indigo
            'linear-gradient(135deg, #4c1d95, #5b21b6)', // Violet
            'linear-gradient(135deg, #701a75, #86198f)', // Fuchsia
            'linear-gradient(135deg, #831843, #9d174d)', // Pink
            'linear-gradient(135deg, #111827, #1f2937)'  // Dark Gray
        ];

        data.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'digital-card';
            
            const fundo = item.capa_url 
                ? `url('${esc(item.capa_url)}') center/cover no-repeat` 
                : gradientes[index % gradientes.length];
            
            const ehBibliotecario = currentUser?.permissions?.is_admin || false;
            
            card.innerHTML = `
                <div class="digital-card-poster" style="background: ${fundo}">
                    ${!item.capa_url ? `<div class="digital-card-cover-text">${esc(item.titulo)}</div>` : ''}
                </div>
                <div class="digital-card-content">
                    <h3 class="digital-card-title">${esc(item.titulo)}</h3>
                    <p style="font-size: 0.9em; color: var(--text); margin-bottom: 12px; font-style: italic; opacity: 0.8;">por ${esc(item.autor)}</p>
                    ${item.sinopse ? `
                        <p class="card-sinopse" style="font-size: 0.8rem; color: var(--text); margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.4em; line-height: 1.2em; opacity: 0.9;">
                            ${esc(item.sinopse)}
                        </p>
                    ` : ''}
                    <div class="digital-card-meta">
                        <span style="color: var(--text); opacity: 0.8;">${esc(item.categoria)}</span>
                        <span style="color: var(--text); opacity: 0.8;">${esc(item.ano)}</span>
                        <span style="color: var(--text); opacity: 0.8;">${esc(item.paginas)} págs | ${esc(item.tamanho_arquivo)}</span>
                    </div>
                    <div class="digital-card-actions">
                        <button class="btn btn-ghost" onclick="downloadPDF('${esc(item.url_arquivo)}', '${esc(item.titulo)}')">Baixar</button>
                        ${ehBibliotecario ? `<button class="btn btn-danger" onclick="removerDocumentoDigital(${item.id}, '${esc(item.titulo)}')">Excluir</button>` : ''}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        renderizarPaginacao('digitalPagination', page, pages, (p) => carregarAcervoDigital(p));

    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error(error);
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger);">${error.message}</div>`;
    }
}

function downloadPDF(url, titulo) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${titulo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    exibirAlerta('Download iniciado...');
}

// Formulário consolidado em livros.js

// Gestão de pendências
async function carregarPendencias() {
    abrirModal('aprovacoesModal');
    const tbody = document.getElementById('aprovacoesTbody');
    tbody.innerHTML = '<tr class="loading-row"><td colspan="4" style="text-align:center;"><span class="spinner"></span></td></tr>';

    try {
        const dados = await api('/acervo-digital/pendentes');
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-dim);">Nenhuma submissão pendente.</td></tr>';
            return;
        }

        tbody.innerHTML = dados.map(item => `
            <tr>
                <td><strong>${esc(item.titulo)}</strong></td>
                <td>${esc(item.usuario_nome || 'Desconhecido')}</td>
                <td><span class="badge" style="background:var(--accent-bg); color:var(--accent);">${esc(item.categoria)}</span></td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-success" onclick="resolverPendencia(${item.id}, 'aprovar')" title="Aprovar e Publicar">✓</button>
                        <button class="btn btn-danger" onclick="resolverPendencia(${item.id}, 'rejeitar')" title="Rejeitar e Apagar">✗</button>
                        <button class="btn btn-ghost" onclick="downloadPDF('${esc(item.url_arquivo)}', '${esc(item.titulo)}')" title="Baixar PDF">⬇</button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (erro) {
         tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--crimson);">${erro.message}</td></tr>`;
    }
}

async function resolverPendencia(id, acao) {
    if(!confirm(`Tem certeza que deseja ${acao} este documento?`)) return;

    try {
        const endpoint = acao === 'aprovar'
            ? `/acervo-digital/${id}/aprovar`
            : `/acervo-digital/${id}/rejeitar`;
        const rsp = await api(endpoint, {
            method: 'PATCH'
        });
        exibirAlerta(rsp.message, 'success');
        carregarPendencias(); // Recarrega a lista
        if (typeof buscarNotificacoes === 'function') buscarNotificacoes(); // Atualiza contador de alertas
        if (document.getElementById('acervoDigitalScreen').classList.contains('active')) {
             carregarAcervoDigital(1); // Atualiza o grid
        }
    } catch (erro) {
        exibirAlerta(erro.message, 'error');
    }
}

function removerDocumentoDigital(id, titulo) {
    exibirConfirmacao({
        icon: ' ',
        title: 'Remover documento digital',
        msg: `Deseja remover "${titulo}" do acervo digital? Esta ação é irreversível.`,
        okLabel: 'Remover',
        async onOk() {
            try {
                await api(`/acervo-digital/${id}`, { method: 'DELETE' });
                exibirAlerta('Documento removido do acervo digital.');
                carregarAcervoDigital(1);
            } catch (erro) {
                exibirAlerta(erro.message, 'danger');
            }
        }
    });
}
