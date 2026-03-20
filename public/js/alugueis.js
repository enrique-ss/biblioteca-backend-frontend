// ── ALUGUÉIS ──────────────────────────────────────────────────────────────────

function voltarAlugueis() { showScreen('menuScreen'); }

async function loadAlugueis(page = 1) {
    document.getElementById('alugueisTitle').innerHTML = `<span>Empréstimos</span>`;
    document.getElementById('alugueisHead').innerHTML =
        `<tr><th>#</th><th>Usuário</th><th>Livro</th><th>Exemplar</th><th>Empréstimo</th><th>Prazo</th><th>Atraso</th><th>Status</th><th>Ações</th></tr>`;
    setLoading('alugueisTbody', 9);
    try {
        const [res, atrasados] = await Promise.all([
            api(`/alugueis/todos?page=${page}&limit=20`),
            api('/alugueis/atrasados')
        ]);
        const rows = Array.isArray(res) ? res : (res.data ?? []);
        const pages = Array.isArray(res) ? 1 : (res.pages ?? 1);
        renderAlugueisCompleto(rows);
        renderPagination('alugueisPagination', page, pages, loadAlugueis);
        const banner = document.getElementById('atrasadosBanner');
        if (atrasados.total > 0) {
            banner.style.display = 'flex';
            banner.innerHTML = `${atrasados.total} empréstimo(s) em atraso — <a href="#" style="color:inherit;margin-left:4px;" onclick="showScreen('historicoScreen');loadHistorico();">ver todos</a>`;
        } else {
            banner.style.display = 'none';
        }
    } catch (err) { setEmpty('alugueisTbody', 9, err.message); showAlert(err.message, 'danger'); }
}

async function loadMeusAlugueis() {
    document.getElementById('alugueisTitle').innerHTML = `<span>Meus Empréstimos</span>`;
    document.getElementById('alugueisHead').innerHTML =
        `<tr><th>#</th><th>Livro</th><th>Exemplar</th><th>Empréstimo</th><th>Prazo</th><th>Atraso / Multa</th><th>Status</th><th>Ações</th></tr>`;
    setLoading('alugueisTbody', 8);
    try {
        const data = await api('/alugueis/meus');
        renderAlugueisMeus(data);
    } catch (err) { setEmpty('alugueisTbody', 8, err.message); showAlert(err.message, 'danger'); }
}

function renderAlugueisCompleto(data) {
    const tbody = document.getElementById('alugueisTbody');
    tbody.innerHTML = '';
    if (!data.length) { setEmpty('alugueisTbody', 9, 'Nenhum empréstimo encontrado.'); return; }
    data.forEach(a => {
        const diasAtraso = Number(a.dias_atraso ?? 0);
        const multaAcum = Number(a.multa_acumulada ?? 0);
        const atrasoCell = diasAtraso > 0
            ? `<span style="color:#f85149;font-weight:600">${diasAtraso}d — R$&nbsp;${multaAcum.toFixed(2)}</span>`
            : `<span style="color:var(--text-faint)">—</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:var(--text-faint)">${esc(a.id)}</td>
            <td>${esc(a.usuario ?? '—')}${a.multa_pendente ? ' <span class="badge badge-danger" style="font-size:.55rem;vertical-align:middle">multa</span>' : ''}</td>
            <td><strong>${esc(a.titulo ?? '—')}</strong></td>
            <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(a.exemplar_codigo ?? '—')}</code></td>
            <td style="color:var(--text-dim)">${fmtDate(a.data_aluguel)}</td>
            <td style="color:var(--text-dim)">${fmtDate(a.prazo)}</td>
            <td>${atrasoCell}</td>
            <td>${badgeStatus(a.status)}</td>
            <td>${a.pode_devolver
                ? `<button class="btn btn-success btn-sm" onclick="abrirModalDevolucao(${a.id})">Devolver</button>`
                : `<span style="color:var(--text-faint)">—</span>`
            }</td>`;
        tbody.appendChild(tr);
    });
}

function renderAlugueisMeus(data) {
    const tbody = document.getElementById('alugueisTbody');
    tbody.innerHTML = '';
    if (!data.length) { setEmpty('alugueisTbody', 8, 'Nenhum empréstimo encontrado.'); return; }
    data.forEach(a => {
        const diasAtraso = Number(a.dias_atraso ?? 0);
        const multaAcum = Number(a.multa_acumulada ?? 0);
        const atrasoCell = diasAtraso > 0
            ? `<span style="color:#f85149;font-weight:600">${diasAtraso}d — R$&nbsp;${multaAcum.toFixed(2)}</span>`
            : `<span style="color:var(--text-faint)">—</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:var(--text-faint)">${esc(a.id)}</td>
            <td><strong>${esc(a.titulo ?? '—')}</strong></td>
            <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(a.exemplar_codigo ?? '—')}</code></td>
            <td style="color:var(--text-dim)">${fmtDate(a.data_aluguel)}</td>
            <td style="color:var(--text-dim)">${fmtDate(a.prazo)}</td>
            <td>${atrasoCell}</td>
            <td>${badgeStatus(a.status)}</td>
            <td>${a.pode_renovar
                ? `<button class="btn btn-gold btn-sm" onclick="renovarEmprestimo(${a.id})">+14 dias</button>`
                : `<span style="color:var(--text-faint)">—</span>`
            }</td>`;
        tbody.appendChild(tr);
    });
}

async function prepareAluguelModal() {
    try {
        const [livros, usuarios] = await Promise.all([
            api('/livros?status=disponivel&limit=1000'),
            api('/usuarios?limit=1000')
        ]);
        const selL = document.getElementById('aluguelLivro');
        const selU = document.getElementById('aluguelUsuario');
        selL.innerHTML = '<option value="">Selecione um livro…</option>';
        selU.innerHTML = '<option value="">Selecione um usuário…</option>';
        (livros.data ?? livros).forEach(l => selL.innerHTML += `<option value="${l.id}">${esc(l.titulo)} — ${esc(l.autor)} (${esc(l.exemplares_disponiveis)} disp.)</option>`);
        (usuarios.data ?? usuarios).forEach(u => selU.innerHTML += `<option value="${u.id}">${esc(u.nome)} (${esc(u.email)})</option>`);
        openModal('addAluguelModal');
    } catch (err) { showAlert(err.message, 'danger'); }
}

document.getElementById('addAluguelForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await api('/alugueis', {
            method: 'POST',
            body: JSON.stringify({
                livro_id: parseInt(document.getElementById('aluguelLivro').value),
                usuario_id: parseInt(document.getElementById('aluguelUsuario').value)
            })
        });
        showAlert('Empréstimo registrado!');
        closeModal('addAluguelModal'); e.target.reset();
        loadAlugueis(); showScreen('alugueisScreen');
    } catch (err) { showAlert(err.message, 'danger'); }
});

// ── DEVOLUÇÃO COM ESTADO ───────────────────────────────────────────────────────

function abrirModalDevolucao(aluguelId) {
    document.getElementById('devolucaoAluguelId').value = aluguelId;
    document.getElementById('devolucaoEstado').value = 'bom';
    document.getElementById('devolucaoObs').value = '';
    document.getElementById('devolucaoObsWrap').style.display = 'none';
    openModal('devolucaoModal');
}

document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('devolucaoEstado');
    if (sel) sel.addEventListener('change', () => {
        const precisaObs = sel.value === 'danificado' || sel.value === 'perdido';
        document.getElementById('devolucaoObsWrap').style.display = precisaObs ? 'block' : 'none';
    });

    document.getElementById('devolucaoForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('devolucaoAluguelId').value;
        const estado = document.getElementById('devolucaoEstado').value;
        const obs = document.getElementById('devolucaoObs').value;
        try {
            const res = await api(`/alugueis/${id}/devolver`, {
                method: 'PUT',
                body: JSON.stringify({ estado_exemplar: estado, observacao: obs })
            });
            closeModal('devolucaoModal');
            if (res.aviso) showAlert(res.aviso, 'warning');
            else showAlert(res.message || 'Livro devolvido!');
            loadAlugueis();
        } catch (err) { showAlert(err.message, 'danger'); }
    });
});

function renovarEmprestimo(id) {
    showConfirm({
        icon: '', title: 'Renovar Empréstimo',
        msg: 'Adicionar mais 14 dias ao prazo?', okLabel: 'Renovar',
        async onOk() {
            try {
                const res = await api(`/alugueis/${id}/renovar`, { method: 'PUT' });
                showAlert(res.message || 'Empréstimo renovado!');
                loadMeusAlugueis();
            } catch (err) { showAlert(err.message, 'danger'); }
        }
    });
}

// ── HISTÓRICO ─────────────────────────────────────────────────────────────────

async function loadHistorico(page = 1, usuarioId = '') {
    setLoading('historicoTbody', 9);
    try {
        const params = new URLSearchParams({ page, limit: 20 });
        if (String(usuarioId).trim()) params.set('usuario_id', String(usuarioId).trim());
        const { data, pages } = await api(`/alugueis/historico?${params}`);
        const tbody = document.getElementById('historicoTbody');
        tbody.innerHTML = '';
        if (!data.length) { setEmpty('historicoTbody', 9, 'Nenhum registro encontrado.'); return; }
        data.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--text-faint)">${esc(a.id)}</td>
                <td>${esc(a.usuario)}</td>
                <td><strong>${esc(a.titulo)}</strong></td>
                <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(a.exemplar_codigo ?? '—')}</code></td>
                <td>${badgeExemplar(a.estado_devolucao ?? a.exemplar_status ?? 'disponivel')}</td>
                <td style="color:var(--text-dim)">${fmtDate(a.data_aluguel)}</td>
                <td style="color:var(--text-dim)">${fmtDate(a.prazo)}</td>
                <td style="color:var(--text-dim)">${fmtDate(a.data_devolucao)}</td>
                <td style="text-align:center">${esc(a.renovacoes ?? 0)}x</td>`;
            tbody.appendChild(tr);
        });
        renderPagination('historicoPagination', page, pages, (p) => loadHistorico(p, usuarioId));
    } catch (err) { setEmpty('historicoTbody', 9, err.message); showAlert(err.message, 'danger'); }
}

async function exportCSV() {
    try {
        const { data } = await api('/alugueis/historico?page=1&limit=10000');
        const cols = ['id', 'usuario', 'titulo', 'exemplar_codigo', 'estado_devolucao', 'data_aluguel', 'prazo', 'data_devolucao', 'renovacoes'];
        const csv = [cols.join(','), ...data.map(r => cols.map(c => `"${(r[c] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = 'historico_emprestimos.csv';
        a.click();
        showAlert('CSV exportado!');
    } catch (err) { showAlert(err.message, 'danger'); }
}