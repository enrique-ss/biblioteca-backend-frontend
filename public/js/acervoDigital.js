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
                    <h2 style="font-family: 'Cinzel', serif; font-size: 2.5rem; color: #fff; margin-bottom: 12px; line-height: 1.1;">${esc(destaque.titulo)}</h2>
                    <p style="color: var(--text-dim); margin-bottom: 24px;">Explore este documento digital exclusivo de ${esc(destaque.ano)}. Uma adição recente ao nosso acervo de ${esc(destaque.categoria)}.</p>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-primary" onclick="visualizarPDF('${esc(destaque.url_arquivo)}')">Ler Agora</button>
                        <button class="btn btn-ghost" onclick="downloadPDF('${esc(destaque.url_arquivo)}', '${esc(destaque.titulo)}')">Download</button>
                    </div>
                </div>
                <div style="position: absolute; right: 0; top: 0; bottom: 0; width: 50%; background: linear-gradient(135deg, var(--accent-bg), var(--surface)); opacity: 0.3; clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%);"></div>
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
            const bg = gradientes[index % gradientes.length];
            
            card.innerHTML = `
                <div class="digital-card-poster" style="background: ${bg}">
                    <div class="digital-card-cover-text">${esc(item.titulo)}</div>
                </div>
                <div class="digital-card-content">
                    <h3 class="digital-card-title">${esc(item.titulo)}</h3>
                    <div class="digital-card-meta">
                        <span>📂 ${esc(item.categoria)}</span>
                        <span>📅 ${esc(item.ano)}</span>
                        <span>📄 ${esc(item.paginas)} págs | 💾 ${esc(item.tamanho_arquivo)}</span>
                    </div>
                    <div class="digital-card-actions">
                        <button class="btn btn-primary btn-sm" onclick="visualizarPDF('${esc(item.url_arquivo)}')">Visualizar</button>
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
