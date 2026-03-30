// Gerenciamento do Acervo de Livros e Exemplares

let controladorAbortarLivros = null;

// Debounce para evitar múltiplas requisições enquanto o usuário digita na busca
const carregarLivrosDebounced = debounce((busca) => carregarLivros(busca));

async function carregarLivros(busca = '', pagina = 1) {
    // Cancela a requisição anterior se houver uma em andamento
    if (controladorAbortarLivros) {
        controladorAbortarLivros.abort();
    }
    controladorAbortarLivros = new AbortController();

    definirCarregando('livrosTbody', 8);

    try {
        const parametros = new URLSearchParams({ 
            page: pagina, 
            limit: 20,
            sort: sortState.livros.col,
            order: sortState.livros.dir
        });

        if (busca.trim()) {
            parametros.set('busca', busca.trim());
        }

        // Realiza a chamada manual para suportar o sinal de cancelamento (AbortSignal)
        const cabecalhos = { 'Content-Type': 'application/json' };
        if (token) {
            cabecalhos['Authorization'] = `Bearer ${token}`;
        }

        const resposta = await fetch(`${API_URL}/livros?${parametros}`, { 
            headers: cabecalhos, 
            signal: controladorAbortarLivros.signal 
        });

        if (!resposta.ok) {
            const erroJson = await resposta.json();
            throw new Error(erroJson.error || 'Erro ao carregar livros');
        }

        const { data, pages } = await resposta.json();
        const tbody = document.getElementById('livrosTbody');
        tbody.innerHTML = '';

        if (!data.length) {
            definirVazio('livrosTbody', 8, 'Nenhum livro encontrado.');
            return;
        }

        data.forEach(livro => {
            const tr = document.createElement('tr');
            const ehBibliotecario = currentUser?.tipo === 'bibliotecario';

            tr.innerHTML = `
                <td style="color:var(--text-dim)">${esc(livro.id)}</td>
                <td><strong>${esc(livro.titulo)}</strong></td>
                <td>${esc(livro.autor)}</td>
                <td>${esc(livro.genero)}</td>
                <td style="color:var(--text)">${esc(livro.corredor ?? '—')}-${esc(livro.prateleira ?? '—')}</td>
                <td style="text-align:center">${esc(livro.exemplares_disponiveis)}/${esc(livro.exemplares)}</td>
                <td>${badgeStatus(livro.status)}</td>
                <td>
                    ${ehBibliotecario ? `
                    <div class="td-actions">
                        <button class="btn btn-ghost btn-sm" onclick="verExemplares(${livro.id},'${esc(livro.titulo)}')">Exemplares</button>
                        <button class="btn btn-ghost btn-sm" onclick='editarLivro(${JSON.stringify(livro)})'>Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="removerLivro(${livro.id},'${esc(livro.titulo)}')">Remover</button>
                    </div>` : ''}
                </td>`;
            
            tbody.appendChild(tr);
        });

        renderizarPaginacao('livrosPagination', pagina, pages, (p) => carregarLivros(busca, p));
        
        // Atualiza os indicadores visuais de ordenação nas colunas
        document.querySelectorAll('#livrosScreen .sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const thAtual = document.querySelector(`#livrosScreen [onclick="sortTable('livros','${sortState.livros.col}')"]`);
        if (thAtual) {
            const classeOrdenacao = sortState.livros.dir === 'asc' ? 'sort-asc' : 'sort-desc';
            thAtual.classList.add(classeOrdenacao);
        }

    } catch (erro) {
        if (erro.name === 'AbortError') return;
        definirVazio('livrosTbody', 8, erro.message);
        exibirAlerta(erro.message, 'danger');
    }
}

function prepararAddLivro(tipo) {
    const frm = document.getElementById('addLivroForm');
    frm.reset();
    document.getElementById('livroTipo').value = tipo;
    
    const groupExemplares = document.getElementById('groupExemplares');
    const groupPaginas = document.getElementById('groupPaginas');
    const groupCapa = document.getElementById('groupCapa');
    const groupArquivo = document.getElementById('groupArquivo');

    if (tipo === 'digital') {
        document.getElementById('addLivroTitle').innerHTML = 'Adicionar <span>Digital</span>';
        document.getElementById('addLivroSubtitle').textContent = 'Incluir um livro no acervo digital (PDF)';
        document.getElementById('btnAddSubmit').textContent = 'Enviar PDF';
        document.getElementById('btnAddSubmit').className = 'btn btn-primary';

        groupExemplares.style.display = 'none';
        document.getElementById('livroExemplares').required = false;

        groupPaginas.style.display = 'block';
        document.getElementById('livroPaginas').required = true;

        groupCapa.style.display = 'block';
        document.getElementById('livroCapa').required = false;

        groupArquivo.style.display = 'block';
        document.getElementById('livroArquivo').required = true;
    } else {
        document.getElementById('addLivroTitle').innerHTML = 'Cadastrar <span>Físico</span>';
        document.getElementById('addLivroSubtitle').textContent = 'Preencha os dados do novo exemplar';
        document.getElementById('btnAddSubmit').textContent = 'Cadastrar Físico';
        document.getElementById('btnAddSubmit').className = 'btn btn-success';

        groupExemplares.style.display = 'block';
        document.getElementById('livroExemplares').required = true;

        groupPaginas.style.display = 'none';
        document.getElementById('livroPaginas').required = false;

        groupCapa.style.display = 'none';
        document.getElementById('livroCapa').required = false;

        groupArquivo.style.display = 'none';
        document.getElementById('livroArquivo').required = false;
    }
    abrirModal('addLivroModal');
}

// Cadastro Unificado de Livro Físico ou Digital
document.getElementById('addLivroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('livroTipo').value;
    const btnSubmit = e.target.querySelector('button[type="submit"]');

    try {
        btnSubmit.textContent = 'Processando...';
        btnSubmit.disabled = true;

        if (tipo === 'fisico') {
            await api('/livros', {
                method: 'POST',
                body: JSON.stringify({
                    titulo: document.getElementById('livroTitulo').value,
                    autor: document.getElementById('livroAutor').value,
                    ano_lancamento: parseInt(document.getElementById('livroAno').value),
                    genero: document.getElementById('livroGenero').value,
                    exemplares: parseInt(document.getElementById('livroExemplares').value) || 1
                })
            });
            exibirAlerta('Exemplar físico cadastrado com sucesso!');
            carregarLivros(document.getElementById('livrosPagination').querySelector('.active')?.textContent || 1);
        } else {
            const fileInput = document.getElementById('livroArquivo');
            if (!fileInput.files.length) {
                exibirAlerta('Você deve anexar um arquivo PDF!', 'error');
                btnSubmit.textContent = 'Enviar PDF';
                btnSubmit.disabled = false;
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

            const pdfBase64 = await lerArquivoComoBase64(file);
            const capaInput = document.getElementById('livroCapa');
            const capaBase64 = capaInput.files.length > 0 ? await lerArquivoComoBase64(capaInput.files[0]) : null;

            const payload = {
                titulo: document.getElementById('livroTitulo').value,
                autor: document.getElementById('livroAutor').value,
                ano: document.getElementById('livroAno').value,
                categoria: document.getElementById('livroGenero').value,
                paginas: document.getElementById('livroPaginas').value,
                capa_url: capaBase64,
                tamanho_arquivo: tamanho,
                url_arquivo: pdfBase64
            };

            const req = await api('/acervo-digital', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            exibirAlerta(req.message, 'success');
            if (typeof carregarAcervoDigital === 'function') carregarAcervoDigital(1);
        }

        fecharModal('addLivroModal');
        e.target.reset();

    } catch (erro) {
        exibirAlerta(erro.message || 'Erro ao concluir operação.', 'error');
    } finally {
        btnSubmit.textContent = tipo === 'digital' ? 'Enviar PDF' : 'Cadastrar Físico';
        btnSubmit.disabled = false;
    }
});

function editarLivro(livro) {
    document.getElementById('editLivroId').value = livro.id;
    document.getElementById('editLivroTitulo').value = livro.titulo;
    document.getElementById('editLivroAutor').value = livro.autor;
    document.getElementById('editLivroAno').value = livro.ano_lancamento;
    document.getElementById('editLivroGenero').value = livro.genero;
    document.getElementById('editLivroExemplares').value = livro.exemplares;
    abrirModal('editLivroModal');
}

// Atualização de livro existente
document.getElementById('editLivroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editLivroId').value;
    try {
        await api(`/livros/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                titulo: document.getElementById('editLivroTitulo').value,
                autor: document.getElementById('editLivroAutor').value,
                ano_lancamento: parseInt(document.getElementById('editLivroAno').value),
                genero: document.getElementById('editLivroGenero').value,
                exemplares: parseInt(document.getElementById('editLivroExemplares').value) || 1
            })
        });

        exibirAlerta('Livro atualizado com sucesso!');
        fecharModal('editLivroModal');
        
        const buscaAtual = document.getElementById('buscaLivros')?.value || '';
        carregarLivros(buscaAtual);
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
});

function removerLivro(id, titulo) {
    exibirConfirmacao({
        icon: '🗑️',
        title: 'Remover livro',
        msg: `Deseja remover "${titulo}" do acervo? Esta ação é irreversível e afetará todos os exemplares.`,
        okLabel: 'Remover',
        async onOk() {
            try {
                await api(`/livros/${id}`, { method: 'DELETE' });
                exibirAlerta('Livro removido do acervo.');
                
                const buscaAtual = document.getElementById('buscaLivros')?.value || '';
                carregarLivros(buscaAtual);
            } catch (erro) {
                exibirAlerta(erro.message, 'danger');
            }
        }
    });
}

// --- Gerenciamento de Exemplares (Cópias Físicas) ---

/**
 * Função Didática: Avalia o estado atual de um exemplar e devolve as ações permitidas.
 * Centralizar essa lógica evita complexidade excessiva dentro da renderização da tabela.
 */
function renderizarAcoesExemplar(livroId, ex) {
    // Se está emprestado, não permitimos alteração manual de status/condição para evitar conflitos
    if (ex.disponibilidade === 'emprestado') {
        return '<span style="color:var(--text-faint);font-size:var(--fs-xs)">Emprestado (Em uso)</span>';
    }
    
    // Se o exemplar está marcado como perdido, permitimos apenas marcar como "Achei" (Bom/Danificado)
    if (ex.disponibilidade === 'perdido') {
        return `
            <select class="form-select exemplar-status-select" 
                    onchange="atualizarCondicaoExemplar(${livroId}, ${ex.id}, this.value)">
                <option value="" disabled selected>Perdido</option>
                <option value="bom">Encontrado (Bom estado)</option>
                <option value="danificado">Encontrado (Danificado)</option>
            </select>`;
    }
    
    // Para exemplares na biblioteca, mostramos controles completos de status e condição
    return `
        <select class="form-select exemplar-status-select" 
                onchange="atualizarDisponibilidadeExemplar(${livroId}, ${ex.id}, this.value)">
            <option value="disponivel" ${ex.disponibilidade === 'disponivel' ? 'selected' : ''}>Disponível</option>
            <option value="indisponivel" ${ex.disponibilidade === 'indisponivel' ? 'selected' : ''}>Em Manutenção</option>
        </select>
        <select class="form-select exemplar-status-select" 
                onchange="atualizarCondicaoExemplar(${livroId}, ${ex.id}, this.value)">
            <option value="bom" ${ex.condicao === 'bom' ? 'selected' : ''}>Bom Estado</option>
            <option value="danificado" ${ex.condicao === 'danificado' ? 'selected' : ''}>Danificado</option>
            <option value="perdido">Marcar como Perdido</option>
        </select>`;
}

async function verExemplares(livroId, titulo) {
    document.getElementById('exemplaresTitulo').textContent = titulo;
    document.getElementById('exemplaresLivroId').value = livroId;
    abrirModal('exemplareModal');
    await carregarExemplares(livroId);
}

async function carregarExemplares(livroId) {
    definirCarregando('exemplaresTbody', 7);
    try {
        const { exemplares } = await api(`/livros/${livroId}/exemplares`);
        const tbody = document.getElementById('exemplaresTbody');
        tbody.innerHTML = '';

        if (!exemplares.length) {
            definirVazio('exemplaresTbody', 7, 'Nenhum exemplar cadastrado.');
            return;
        }

        exemplares.forEach(ex => {
            const tr = document.createElement('tr');
            const ultimo = ex.ultimo_aluguel;

            tr.innerHTML = `
                <td style="color:var(--text-dim)">${esc(ex.id)}</td>
                <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(ex.codigo ?? '—')}</code></td>
                <td>${badgeExemplar(ex.disponibilidade)}</td>
                <td>${badgeCondicaoExemplar(ex.condicao || 'bom')}</td>
                <td style="color:var(--text);font-size:var(--fs-xs)">${esc(ex.observacao ?? '—')}</td>
                <td style="font-size:var(--fs-xs)">
                    ${ultimo ? `
                        <strong>${esc(ultimo.usuario)}</strong><br>
                        <strong>${esc(ultimo.usuario)}</strong><br>
                        <span style="color:var(--text)">${formatarData(ultimo.data_aluguel)}</span>
                        ${ultimo.status_aluguel === 'ativo' ? '<span class="badge badge-warning" style="margin-left:4px;font-size:.55rem">em mãos</span>' : ''}
                    ` : '<span style="color:var(--text-dim)">Nunca alugado</span>'}
                </td>
                <td>
                    <div class="exemplar-actions">
                        ${renderizarAcoesExemplar(livroId, ex)}
                    </div>
                </td>`;
            
            tbody.appendChild(tr);
        });
    } catch (erro) {
        definirVazio('exemplaresTbody', 7, erro.message);
        exibirAlerta(erro.message, 'danger');
    }
}

async function atualizarDisponibilidadeExemplar(livroId, exemplarId, novaDisponibilidade) {
    if (!novaDisponibilidade) return;
    
    try {
        await api(`/livros/${livroId}/exemplares/${exemplarId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: novaDisponibilidade })
        });

        exibirAlerta('Disponibilidade do exemplar atualizada.');
        await carregarExemplares(livroId);
        
        const buscaAtual = document.getElementById('buscaLivros')?.value || '';
        carregarLivros(buscaAtual);
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
}

async function atualizarCondicaoExemplar(livroId, exemplarId, novaCondicao) {
    if (!novaCondicao) return;
    
    let observacao = '';
    // Solicita uma observação se o exemplar sofreu dano ou foi perdido
    if (novaCondicao === 'danificado' || novaCondicao === 'perdido') {
        observacao = prompt('Por favor, descreva o ocorrido (observação):') ?? '';
    }
    
    try {
        await api(`/livros/${livroId}/exemplares/${exemplarId}`, {
            method: 'PATCH',
            body: JSON.stringify({ 
                condicao: novaCondicao,
                observacao: observacao.trim() || null
            })
        });

        exibirAlerta('Condição do exemplar atualizada.');
        await carregarExemplares(livroId);
        
        const buscaAtual = document.getElementById('buscaLivros')?.value || '';
        carregarLivros(buscaAtual);
    } catch (erro) {
        exibirAlerta(erro.message, 'danger');
    }
}