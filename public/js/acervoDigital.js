/*
    ACERVO DIGITAL: listagem, download, aprovação e remoção de documentos PDF.
    Este arquivo gerencia toda a interação com o acervo digital da biblioteca:

    - carregarAcervoDigital: busca os PDFs do servidor e renderiza os cards na tela
    - downloadPDF: cria um link temporário para iniciar o download do arquivo
    - carregarPendencias: lista documentos enviados por usuários aguardando aprovação
    - resolverPendencia: aprova ou rejeita um documento pendente (só bibliotecário)
    - removerDocumentoDigital: exclui permanentemente um documento do acervo
*/

// Variável que armazena o controlador para cancelar buscas em andamento
let controladorAbortarDigital = null;

/*
    Versão com debounce da função de carregamento.
    Quando o usuário digita na barra de busca, espera um momento antes de
    disparar a requisição, evitando uma chamada ao servidor a cada letra digitada.
*/
const carregarAcervoDigitalDebounced = debounce((valor) => carregarAcervoDigital(1));

/*
    Busca os documentos digitais do servidor e renderiza os cards na tela.
    Suporta paginação (12 itens por página) e filtragem por busca.
    Se uma busca anterior ainda estiver em andamento, ela é cancelada
    para evitar conflitos de resultado (AbortController).
    Cada card exibe: capa (ou gradiente colorido), título, autor, sinopse,
    gênero, ano, páginas, tamanho e botão de download.
    Bibliotecários também veem o botão de excluir.
*/
async function carregarAcervoDigital(pagina = 1) {
    const grid = document.getElementById('digitalGrid');
    const busca = document.getElementById('buscaDigital').value;

    // Cancela a requisição anterior se ainda estiver em andamento
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
        
        /*
            Gradientes usados como fundo dos cards quando o livro não tem imagem de capa.
            Cada livro pega um gradiente baseado na sua posição na lista (index % total),
            garantindo variação visual mesmo sem imagem.
        */
        const gradientes = [
            'linear-gradient(135deg, #1e3a8a, #1e40af)',
            'linear-gradient(135deg, #312e81, #3730a3)',
            'linear-gradient(135deg, #4c1d95, #5b21b6)',
            'linear-gradient(135deg, #701a75, #86198f)',
            'linear-gradient(135deg, #831843, #9d174d)',
            'linear-gradient(135deg, #111827, #1f2937)'
        ];

        data.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'digital-card';
            
            // Se o livro tem capa, usa a imagem; senão, usa um gradiente colorido
            const fundo = item.capa_url 
                ? `url('${esc(item.capa_url)}') center/cover no-repeat` 
                : gradientes[index % gradientes.length];
            
            // Verifica se o usuário atual é bibliotecário para exibir o botão de excluir
            const ehBibliotecario = currentUser?.permissions?.is_admin || false;
            
            card.innerHTML = `
                <div class="digital-card-poster" style="background: ${fundo}">
                    ${!item.capa_url ? `<div class="digital-card-cover-text">${esc(item.titulo)}</div>` : ''}
                </div>
                <div class="digital-card-content">
                    <h3 class="digital-card-title">${esc(item.titulo)}</h3>
                    <p style="font-size: 0.9em; color: var(--text); margin-bottom: 12px; font-style: italic; opacity: 0.8;"><strong>Autor:</strong> ${esc(item.autor)}</p>
                    ${item.sinopse ? `
                        <p class="card-sinopse" style="font-size: 0.8rem; color: var(--text); margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.4em; line-height: 1.2em; opacity: 0.9;">
                            <strong>Sinopse:</strong> ${esc(item.sinopse)}
                        </p>
                    ` : ''}
                    <div class="digital-card-meta">
                        <span style="color: var(--text); opacity: 0.8;"><strong>Gênero:</strong> ${esc(item.categoria)}</span>
                        <span style="color: var(--text); opacity: 0.8;"><strong>Ano:</strong> ${esc(item.ano)}</span>
                        <span style="color: var(--text); opacity: 0.8;"><strong>Páginas:</strong> ${esc(item.paginas)}</span>
                        <span style="color: var(--text); opacity: 0.8;"><strong>Tamanho:</strong> ${esc(item.tamanho_arquivo)}</span>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-dim); margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                        👤 <strong>Publicado por:</strong> ${esc(item.usuario_nome || 'Bibliotecário')}
                    </p>
                    <div class="digital-card-actions">
                        <button class="btn btn-ghost btn-icon-text" title="Ler / Baixar" onclick="registrarLeituraPDF(${item.id}, '${esc(item.url_arquivo)}', '${esc(item.titulo)}')"><span>📖 Ler</span></button>
                        ${ehBibliotecario ? `<button class="btn btn-danger btn-icon-text" title="Excluir" onclick="removerDocumentoDigital(${item.id}, '${esc(item.titulo)}')"><span>🗑️</span></button>` : ''}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        renderizarPaginacao('digitalPagination', page, pages, (p) => carregarAcervoDigital(p));

    } catch (error) {
        // AbortError é esperado quando a busca é cancelada; ignora silenciosamente
        if (error.name === 'AbortError') return;
        console.error(error);
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger);">${error.message}</div>`;
    }
}

/**
 * Registra que o usuário abriu o PDF e inicia o download/visualização.
 */
async function registrarLeituraPDF(id, url, titulo) {
    try {
        // Avisa o backend que o livro foi "lido" para contabilizar nas estatísticas
        await api(`/acervo-digital/${id}/ler`, { method: 'POST' });
    } catch (e) {
        // Silencioso se der erro (ex: já registrado)
    }
    
    downloadPDF(url, titulo);
}

/*
    Inicia o download de um arquivo PDF.
*/
function downloadPDF(url, titulo) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank'; // Tenta abrir em nova aba antes de baixar
    link.download = `${titulo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    exibirAlerta('Abrindo documento...');
}

// O formulário de envio de documento digital está consolidado em livros.js

/*
    Carrega e exibe o modal de documentos pendentes de aprovação.
    Apenas bibliotecários têm acesso. Busca todos os documentos enviados por
    usuários que ainda não foram aprovados ou rejeitados.
    Exibe título, remetente, categoria e botões de ação para cada item.
*/
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

/*
    Aprova ou rejeita um documento digital pendente.
    A ação é definida pelo parâmetro: 'aprovar' publica o documento no acervo,
    'rejeitar' remove o arquivo e descarta a submissão.
    Após a ação, recarrega a lista de pendências e atualiza o contador de notificações.
    Se o acervo digital estiver aberto, também recarrega a grade de livros.
*/
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
        carregarPendencias();
        if (typeof buscarNotificacoes === 'function') buscarNotificacoes();
        if (document.getElementById('acervoDigitalScreen').classList.contains('active')) {
             carregarAcervoDigital(1);
        }
    } catch (erro) {
        exibirAlerta(erro.message, 'error');
    }
}

/*
    Remove permanentemente um documento do acervo digital.
    Exibe um diálogo de confirmação antes de executar a exclusão,
    pois a ação não pode ser desfeita. Só bibliotecários têm acesso a esta função.
*/
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
