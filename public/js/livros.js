// ── LIVROS ────────────────────────────────────────────────────────────────────

let livrosAbortController = null;
let livrosSort = { col: 'titulo', dir: 'asc' };

const loadLivrosDebounced = debounce((busca) => loadLivros(busca));

function sortTable(table, col) {
    if (table === 'livros') {
        livrosSort.dir = livrosSort.col === col && livrosSort.dir === 'asc' ? 'desc' : 'asc';
        livrosSort.col = col;
        document.querySelectorAll('#livrosScreen .sortable').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
        const th = document.querySelector(`[onclick="sortTable('livros','${col}')"]`);
        if (th) th.classList.add(livrosSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
        loadLivros(document.getElementById('buscaLivros')?.value || '', 1);
    }
}

async function loadLivros(busca = '', page = 1) {
    if (livrosAbortController) livrosAbortController.abort();
    livrosAbortController = new AbortController();
    setLoading('livrosTbody', 8);
    try {
        const params = new URLSearchParams({ page, limit: 20, sort: livrosSort.col, order: livrosSort.dir });
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
                <td>${badgeCondicao(livro.condicao)}</td>
                <td>${isBib ? `<div class="td-actions">
                    <button class="btn btn-ghost btn-sm" onclick="verExemplares(${livro.id},'${esc(livro.titulo)}')">Exemplares</button>
                    <button class="btn btn-ghost btn-sm" onclick='editarLivro(${JSON.stringify(livro)})'>Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="removerLivro(${livro.id},'${esc(livro.titulo)}')">Remover</button>
                </div>` : ''}</td>`;
            tbody.appendChild(tr);
        });
        renderPagination('livrosPagination', page, pages, (p) => loadLivros(busca, p));
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

async function verExemplares(livroId, titulo) {
    document.getElementById('exemplaresTitulo').textContent = titulo;
    document.getElementById('exemplaresLivroId').value = livroId;
    openModal('exemplareModal');
    await carregarExemplares(livroId);
}

async function carregarExemplares(livroId) {
    setLoading('exemplaresTbody', 6);
    try {
        const { exemplares } = await api(`/livros/${livroId}/exemplares`);
        const tbody = document.getElementById('exemplaresTbody');
        tbody.innerHTML = '';
        if (!exemplares.length) { setEmpty('exemplaresTbody', 6, 'Nenhum exemplar cadastrado.'); return; }
        exemplares.forEach(ex => {
            const tr = document.createElement('tr');
            const ult = ex.ultimo_aluguel;
            tr.innerHTML = `
                <td style="color:var(--text-faint)">${esc(ex.id)}</td>
                <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(ex.codigo ?? '—')}</code></td>
                <td>${badgeExemplar(ex.status)}</td>
                <td style="color:var(--text-dim);font-size:var(--fs-xs)">${esc(ex.observacao ?? '—')}</td>
                <td style="font-size:var(--fs-xs)">
                    ${ult
                    ? `<strong>${esc(ult.usuario)}</strong><br>
                           <span style="color:var(--text-dim)">${fmtDate(ult.data_aluguel)}</span>
                           ${ult.status_aluguel === 'ativo' ? `<span class="badge badge-warning" style="margin-left:4px;font-size:.55rem">em mãos</span>` : ''}`
                    : `<span style="color:var(--text-faint)">Nunca alugado</span>`}
                </td>
                <td>
                    <select class="form-select" style="font-size:var(--fs-xs);padding:5px 28px 5px 8px;"
                        onchange="atualizarExemplar(${livroId}, ${ex.id}, this.value, this)">
                        <option value="disponivel" ${ex.status === 'disponivel' ? 'selected' : ''}>Disponível</option>
                        <option value="emprestado" ${ex.status === 'emprestado' ? 'selected' : ''} disabled>Emprestado</option>
                        <option value="danificado" ${ex.status === 'danificado' ? 'selected' : ''}>Danificado</option>
                        <option value="perdido"    ${ex.status === 'perdido' ? 'selected' : ''}>Perdido</option>
                    </select>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        setEmpty('exemplaresTbody', 6, err.message);
        showAlert(err.message, 'danger');
    }
}

async function atualizarExemplar(livroId, exemplarId, novoStatus) {
    const precisaObs = novoStatus === 'danificado' || novoStatus === 'perdido';
    const observacao = precisaObs ? (prompt('Observação sobre o exemplar (opcional):') ?? '') : '';
    try {
        await api(`/livros/${livroId}/exemplares/${exemplarId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: novoStatus, observacao })
        });
        showAlert('Exemplar atualizado!');
        await carregarExemplares(livroId);
        loadLivros(document.getElementById('buscaLivros')?.value || '');
    } catch (err) {
        showAlert(err.message, 'danger');
        await carregarExemplares(livroId);
    }
}