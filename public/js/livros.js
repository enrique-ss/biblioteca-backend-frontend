// ── LIVROS ────────────────────────────────────────────────────────────────────

let livrosAbortController = null;

const loadLivrosDebounced = debounce((busca) => loadLivros(busca));

async function loadLivros(busca = '', page = 1) {
    if (livrosAbortController) livrosAbortController.abort();
    livrosAbortController = new AbortController();
    setLoading('livrosTbody', 8);
    try {
        const params = new URLSearchParams({ 
            page, 
            limit: 20,
            sort: sortState.livros.col,
            order: sortState.livros.dir
        });
        if (busca.trim()) params.set('busca', busca.trim());
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/livros?${params}`, { headers, signal: livrosAbortController.signal });
        if (!res.ok) throw new Error((await res.json()).error);
        const { data, pages } = await res.json();
        const tbody = document.getElementById('livrosTbody');
        tbody.innerHTML = '';
        if (!data.length) { setEmpty('livrosTbody', 8, 'Nenhum livro encontrado.'); return; }
        data.forEach(livro => {
            const tr = document.createElement('tr');
            const isBib = currentUser?.tipo === 'bibliotecario';
            tr.innerHTML = `
                <td style="color:var(--text-faint)">${esc(livro.id)}</td>
                <td><strong>${esc(livro.titulo)}</strong></td>
                <td>${esc(livro.autor)}</td>
                <td>${esc(livro.genero)}</td>
                <td style="color:var(--text-dim)">${esc(livro.corredor ?? '—')}-${esc(livro.prateleira ?? '—')}</td>
                <td style="text-align:center">${esc(livro.exemplares_disponiveis)}/${esc(livro.exemplares)}</td>
                <td>${badgeStatus(livro.status)}</td>
                <td>${isBib ? `<div class="td-actions">
                    <button class="btn btn-ghost btn-sm" onclick="verExemplares(${livro.id},'${esc(livro.titulo)}')">Exemplares</button>
                    <button class="btn btn-ghost btn-sm" onclick='editarLivro(${JSON.stringify(livro)})'>Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="removerLivro(${livro.id},'${esc(livro.titulo)}')">Remover</button>
                </div>` : ''}</td>`;
            tbody.appendChild(tr);
        });
        renderPagination('livrosPagination', page, pages, (p) => loadLivros(busca, p));
        
        // Atualiza classes de ordenação
        document.querySelectorAll('#livrosScreen .sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        const currentTh = document.querySelector(`#livrosScreen [onclick="sortTable('livros','${sortState.livros.col}')"]`);
        if (currentTh) currentTh.classList.add(sortState.livros.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    } catch (err) {
        if (err.name === 'AbortError') return;
        setEmpty('livrosTbody', 8, err.message);
        showAlert(err.message, 'danger');
    }
}

document.getElementById('addLivroForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await api('/livros', {
            method: 'POST',
            body: JSON.stringify({
                titulo: document.getElementById('livroTitulo').value,
                autor: document.getElementById('livroAutor').value,
                ano_lancamento: parseInt(document.getElementById('livroAno').value),
                genero: document.getElementById('livroGenero').value,
                isbn: document.getElementById('livroIsbn').value || null,
                exemplares: parseInt(document.getElementById('livroExemplares').value) || 1
            })
        });
        showAlert('Livro cadastrado!');
        closeModal('addLivroModal'); e.target.reset(); loadLivros();
    } catch (err) { showAlert(err.message, 'danger'); }
});

function editarLivro(livro) {
    document.getElementById('editLivroId').value = livro.id;
    document.getElementById('editLivroTitulo').value = livro.titulo;
    document.getElementById('editLivroAutor').value = livro.autor;
    document.getElementById('editLivroAno').value = livro.ano_lancamento;
    document.getElementById('editLivroGenero').value = livro.genero;
    document.getElementById('editLivroIsbn').value = livro.isbn || '';
    document.getElementById('editLivroExemplares').value = livro.exemplares;
    openModal('editLivroModal');
}

document.getElementById('editLivroForm').addEventListener('submit', async e => {
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
                isbn: document.getElementById('editLivroIsbn').value || null,
                exemplares: parseInt(document.getElementById('editLivroExemplares').value) || 1
            })
        });
        showAlert('Livro atualizado!');
        closeModal('editLivroModal');
        loadLivros(document.getElementById('buscaLivros')?.value || '');
    } catch (err) { showAlert(err.message, 'danger'); }
});

function removerLivro(id, titulo) {
    showConfirm({
        icon: '', title: 'Remover livro',
        msg: `Remover "${titulo}" do acervo? Esta ação é irreversível.`,
        okLabel: 'Remover',
        async onOk() {
            try {
                await api(`/livros/${id}`, { method: 'DELETE' });
                showAlert('Livro removido!');
                loadLivros(document.getElementById('buscaLivros')?.value || '');
            } catch (err) { showAlert(err.message, 'danger'); }
        }
    });
}

// ── EXEMPLARES ────────────────────────────────────────────────────────────────

/*
 * Função Didática: Avalia o estado atual de um exemplar (cópia física)
 * e devolve os botões e menus (Ações) corretos em formato HTML.
 * Retirar isso do meio da tabela evita "ternários ( if ? a : b )" gigantes.
 */
function renderAcoesDoExemplar(livroId, ex) {
    // Regra 1: Se o livro está na casa de um aluno (emprestado), 
    // o bibliotecário não pode alterar nada até ele ser devolvido.
    if (ex.disponibilidade === 'emprestado') {
        return '<span style="color:var(--text-faint);font-size:var(--fs-xs)">Emprestado</span>';
    }
    
    // Regra 2: Se a cópia foi dada como perdida, o único botão
    // que deve aparecer é o de "Achei" (alterando para Bom ou Danificado).
    if (ex.disponibilidade === 'perdido') {
        return `
            <select class="form-select exemplar-status-select" 
                    onchange="atualizarCondicao(${livroId}, ${ex.id}, this.value)">
                <option value="" disabled selected>Perdido</option>
                <option value="bom">Bom</option>
                <option value="danificado">Danificado</option>
            </select>
        `;
    }
    
    // Regra 3: Se a cópia está na biblioteca (Disponível ou Indisponível/Manutenção),
    // mostramos os controles totais para o bibliotecário gerenciá-la.
    return `
        <select class="form-select exemplar-status-select" 
                onchange="atualizarDisponibilidade(${livroId}, ${ex.id}, this.value)">
            <option value="disponivel" ${ex.disponibilidade === 'disponivel' ? 'selected' : ''}>Disponível</option>
            <option value="indisponivel" ${ex.disponibilidade === 'indisponivel' ? 'selected' : ''}>Indisponível</option>
        </select>
        <select class="form-select exemplar-status-select" 
                onchange="atualizarCondicao(${livroId}, ${ex.id}, this.value)">
            <option value="bom" ${ex.condicao === 'bom' ? 'selected' : ''}>Bom</option>
            <option value="danificado" ${ex.condicao === 'danificado' ? 'selected' : ''}>Danificado</option>
            <option value="perdido">Perdido</option>
        </select>
    `;
}

async function verExemplares(livroId, titulo) {
    document.getElementById('exemplaresTitulo').textContent = titulo;
    document.getElementById('exemplaresLivroId').value = livroId;
    openModal('exemplareModal');
    await carregarExemplares(livroId);
}

async function carregarExemplares(livroId) {
    setLoading('exemplaresTbody', 7);
    try {
        const { exemplares } = await api(`/livros/${livroId}/exemplares`);
        const tbody = document.getElementById('exemplaresTbody');
        tbody.innerHTML = '';
        if (!exemplares.length) { setEmpty('exemplaresTbody', 7, 'Nenhum exemplar cadastrado.'); return; }
        exemplares.forEach(ex => {
            const tr = document.createElement('tr');
            const ult = ex.ultimo_aluguel;
            tr.innerHTML = `
                <td style="color:var(--text-faint)">${esc(ex.id)}</td>
                <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(ex.codigo ?? '—')}</code></td>
                <td>${badgeExemplar(ex.disponibilidade)}</td>
                <td>${badgeCondicaoExemplar(ex.condicao || 'bom')}</td>
                <td style="color:var(--text-dim);font-size:var(--fs-xs)">${esc(ex.observacao ?? '—')}</td>
                <td style="font-size:var(--fs-xs)">
                    ${ult
                    ? `<strong>${esc(ult.usuario)}</strong><br>
                           <span style="color:var(--text-dim)">${fmtDate(ult.data_aluguel)}</span>
                           ${ult.status_aluguel === 'ativo' ? `<span class="badge badge-warning" style="margin-left:4px;font-size:.55rem">em mãos</span>` : ''}`
                    : `<span style="color:var(--text-faint)">Nunca alugado</span>`}
                </td>
                <td>
                    <div class="exemplar-actions">
                        ${renderAcoesDoExemplar(livroId, ex)}
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        setEmpty('exemplaresTbody', 7, err.message);
        showAlert(err.message, 'danger');
    }
}

async function atualizarDisponibilidade(livroId, exemplarId, novaDisponibilidade) {
    if (!novaDisponibilidade || novaDisponibilidade === '') return;
    
    try {
        await api(`/livros/${livroId}/exemplares/${exemplarId}`, {
            method: 'PATCH',
            body: JSON.stringify({ 
                status: novaDisponibilidade
            })
        });
        showAlert(`Disponibilidade alterada com sucesso!`);
        await carregarExemplares(livroId);
        loadLivros(document.getElementById('buscaLivros')?.value || '');
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}

async function atualizarCondicao(livroId, exemplarId, novaCondicao) {
    if (!novaCondicao || novaCondicao === '') return;
    
    const observacao = novaCondicao === 'danificado' || novaCondicao === 'perdido' 
        ? (prompt('Observação sobre a condição:') ?? '') 
        : '';
    
    try {
        await api(`/livros/${livroId}/exemplares/${exemplarId}`, {
            method: 'PATCH',
            body: JSON.stringify({ 
                condicao: novaCondicao,
                observacao: observacao || null
            })
        });
        showAlert(`Condição alterada com sucesso!`);
        await carregarExemplares(livroId);
        loadLivros(document.getElementById('buscaLivros')?.value || '');
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}