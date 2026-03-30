// Gerenciamento do Acervo Digital (PDFs)

let controladorAbortarDigital = null;

// Debounce para evitar múltiplas requisições enquanto o usuário digita na busca
const carregarAcervoDigitalDebounced = debounce((valor) => carregarAcervoDigital(1));

async function carregarAcervoDigital(pagina = 1) {
    const grid = document.getElementById('digitalGrid');
    const busca = document.getElementById('buscaDigital').value;
    const categoria = document.getElementById('filtroCategoria').value;
    const ano = document.getElementById('filtroAno').value;

    // Cancela a requisição anterior se houver uma em andamento
    if (controladorAbortarDigital) {
        controladorAbortarDigital.abort();
    }
    controladorAbortarDigital = new AbortController();

    grid.innerHTML = '<div class="loading-row" style="grid-column: 1/-1; text-align: center; padding: 40px;"><span class="spinner"></span> Carregando acervo digital...</div>';

    try {
        const query = new URLSearchParams({
            page: pagina,
            limit: 6
        });

        if (busca.trim()) query.set('busca', busca.trim());
        if (categoria) query.set('categoria', categoria);
        if (ano) query.set('ano', ano);

        const response = await fetch(`${API_URL}/acervo-digital?${query}`, {
            headers: { 
                'Authorization': `Bearer ${token || localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            signal: controladorAbortarDigital.signal
        });

        if (!response.ok) throw new Error('Erro ao carregar acervo digital');

        const { data, page, pages, categorias, anos } = await response.json();

        // Atualiza os filtros se for a primeira carga ou se voltarem novos metadados
        atualizarFiltrosDigital(categorias, anos);

        if (data.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-dim); font-style: italic;">Nenhum documento digital encontrado para esta busca.</div>';
            document.getElementById('digitalPagination').innerHTML = '';
            return;
        }

        grid.innerHTML = '';
        
        // Seção Hero (Destaque) - Só na primeira página e se houver dados
        if (pagina === 1 && data.length > 0 && !busca && !categoria && !ano) {
            const destaque = data[0];
            const hero = document.createElement('div');
            hero.className = 'digital-hero';
            hero.style.cssText = `
                grid-column: 1 / -1;
                height: 350px;
                background: linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%), var(--surface);
                border-radius: var(--r-xl);
                display: flex;
                align-items: center;
                padding: 40px;
                margin-bottom: 20px;
                position: relative;
                overflow: hidden;
                border: 1px solid var(--border);
            `;
            hero.innerHTML = `
                <div style="max-width: 500px; z-index: 2;">
                    <span class="badge badge-gold" style="margin-bottom: 16px;">Novidade</span>
                    <h2 style="font-family: 'Cinzel', serif; font-size: 2.5rem; color: #fff; margin-bottom: 8px; line-height: 1.1;">${esc(destaque.titulo)}</h2>
                    <p style="color: var(--accent); font-size: 1.1rem; margin-bottom: 12px; font-weight: 500;">por ${esc(destaque.autor)}</p>
                    <p style="color: var(--text-dim); margin-bottom: 24px;">Explore este documento digital exclusivo de ${esc(destaque.ano)}. Uma adição recente ao nosso acervo de ${esc(destaque.categoria)}.</p>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-ghost" onclick="downloadPDF('${esc(destaque.url_arquivo)}', '${esc(destaque.titulo)}')">Baixar</button>
                    </div>
                </div>
                <div style="position: absolute; right: 0; top: 0; bottom: 0; width: 50%; background: ${destaque.capa_url ? `url('${esc(destaque.capa_url)}') center/cover no-repeat` : 'linear-gradient(135deg, var(--accent-bg), var(--surface))'}; opacity: 0.3; clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%); mix-blend-mode: luminosity;"></div>
            `;
            grid.appendChild(hero);
        }

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
            
            card.innerHTML = `
                <div class="digital-card-poster" style="background: ${fundo}">
                    ${!item.capa_url ? `<div class="digital-card-cover-text">${esc(item.titulo)}</div>` : ''}
                </div>
                <div class="digital-card-content">
                    <h3 class="digital-card-title" style="margin-bottom: 4px;">${esc(item.titulo)}</h3>
                    <p style="font-size: 0.9em; color: var(--text-dim); margin-bottom: 12px; font-style: italic;">por ${esc(item.autor)}</p>
                    <div class="digital-card-meta">
                        <span>📂 ${esc(item.categoria)}</span>
                        <span>📅 ${esc(item.ano)}</span>
                        <span>📄 ${esc(item.paginas)} págs | 💾 ${esc(item.tamanho_arquivo)}</span>
                    </div>
                    <div class="digital-card-actions">
                        <button class="btn btn-ghost btn-sm" onclick="downloadPDF('${esc(item.url_arquivo)}', '${esc(item.titulo)}')">Baixar</button>
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

function atualizarFiltrosDigital(categorias, anos) {
    const selCat = document.getElementById('filtroCategoria');
    const selAno = document.getElementById('filtroAno');

    if (!selCat || !selAno) return;

    // Só preenche se estiverem vazios (exceto a primeira opção)
    if (selCat.options.length <= 1 && categorias) {
        categorias.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            selCat.appendChild(opt);
        });
    }

    if (selAno.options.length <= 1 && anos) {
        anos.forEach(ano => {
            const opt = document.createElement('option');
            opt.value = ano;
            opt.textContent = ano;
            selAno.appendChild(opt);
        });
    }
}

function visualizarPDF(url) {
    window.open(url, '_blank');
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

// Configuração do formulário de adição
document.addEventListener('DOMContentLoaded', () => {
    const frmDigital = document.getElementById('addDigitalForm');
    if (frmDigital) {
        frmDigital.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('digitalFile');
            if (!fileInput.files.length) {
                exibirAlerta('Você deve anexar um arquivo PDF!', 'error');
                return;
            }

            const file = fileInput.files[0];
            const tamanho = (file.size / 1024 / 1024).toFixed(1) + ' MB';
            
            const lerArquivoComoBase64 = (arquivo) => new Promise((resolve, reject) => {
                if (!arquivo) return resolve(null);
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(arquivo);
            });

            try {
                // Alerta visual pois Base64 em arquivos grandes trava um pouco
                const btnSubmit = e.target.querySelector('button[type="submit"]');
                const textoOriginal = btnSubmit.textContent;
                btnSubmit.textContent = 'Processando...';
                btnSubmit.disabled = true;

                const pdfBase64 = await lerArquivoComoBase64(file);
                
                const capaInput = document.getElementById('digitalCapa');
                const capaBase64 = capaInput.files.length > 0 ? await lerArquivoComoBase64(capaInput.files[0]) : null;

                const payload = {
                    titulo: document.getElementById('digitalTitulo').value,
                    autor: document.getElementById('digitalAutor').value,
                    ano: document.getElementById('digitalAno').value,
                    categoria: document.getElementById('digitalGenero').value,
                    paginas: document.getElementById('digitalPaginas').value,
                    capa_url: capaBase64,
                    tamanho_arquivo: tamanho,
                    url_arquivo: pdfBase64
                };

                const req = await api('/acervo-digital', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                exibirAlerta(req.message, 'success');
                fecharModal('addDigitalModal');
                frmDigital.reset();
                carregarAcervoDigital(1);
            } catch (error) {
                exibirAlerta(error.message || 'Erro ao processar anexos.', 'error');
            } finally {
                const btnSubmit = e.target.querySelector('button[type="submit"]');
                btnSubmit.textContent = 'Enviar';
                btnSubmit.disabled = false;
            }
        });
    }
});

// Lógica de Gestão de Pendências (Bibliotecários)
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
                        <button class="btn btn-success btn-sm" onclick="resolverPendencia(${item.id}, 'aprovar')" title="Aprovar e Publicar">✓</button>
                        <button class="btn btn-danger btn-sm" onclick="resolverPendencia(${item.id}, 'rejeitar')" title="Rejeitar e Apagar">✗</button>
                        <button class="btn btn-ghost btn-sm" onclick="visualizarPDF('${esc(item.url_arquivo)}')" title="Visualizar PDF">👁</button>
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
        const rsp = await api(`/acervo-digital/${id}/aprovar`, {
            method: 'POST',
            body: JSON.stringify({ acao })
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
