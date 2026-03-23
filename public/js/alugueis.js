// ── ALUGUÉIS ──────────────────────────────────────────────────────────────────

const loadAlugueisDebounced = debounce((busca) => loadAlugueis(1, busca));

function voltarAlugueis() { showScreen('menuScreen'); }

async function loadAlugueis(page = 1, busca = '') {
    document.getElementById('alugueisTitle').innerHTML = `<span>Empréstimos</span>`;
    document.getElementById('alugueisHead').innerHTML =
        `<tr><th>#</th><th class="sortable" onclick="sortTable('alugueis','usuario')">Usuário <span class="sort-indicator"></span></th><th class="sortable" onclick="sortTable('alugueis','titulo')">Livro <span class="sort-indicator"></span></th><th>Exemplar</th><th class="sortable" onclick="sortTable('alugueis','data_aluguel')">Empréstimo <span class="sort-indicator"></span></th><th class="sortable" onclick="sortTable('alugueis','prazo')">Prazo <span class="sort-indicator"></span></th><th class="sortable" onclick="sortTable('alugueis','dias_atraso')">Atraso <span class="sort-indicator"></span></th><th>Status</th><th>Ações</th></tr>`;
    setLoading('alugueisTbody', 9);
    try {
        const params = new URLSearchParams({ 
            page, 
            limit: 20,
            sort: sortState.alugueis.col,
            order: sortState.alugueis.dir
        });
        if (busca.trim()) params.set('busca', busca.trim());
        const [res, atrasados] = await Promise.all([
            api(`/alugueis/todos?${params}`),
            api('/alugueis/atrasados')
        ]);
        const rows = Array.isArray(res) ? res : (res.data ?? []);
        const pages = Array.isArray(res) ? 1 : (res.pages ?? 1);
        renderAlugueisCompleto(rows);
        renderPagination('alugueisPagination', page, pages, (p) => loadAlugueis(p, busca));
        const banner = document.getElementById('atrasadosBanner');
        if (atrasados.total > 0) {
            banner.style.display = 'flex';
            banner.innerHTML = `${atrasados.total} empréstimo(s) em atraso — <a href="#" style="color:inherit;margin-left:4px;" onclick="showScreen('historicoScreen');loadHistorico();">ver todos</a>`;
        } else {
            banner.style.display = 'none';
        }
        
        // Atualiza classes de ordenação
        document.querySelectorAll('#alugueisScreen .sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        const currentTh = document.querySelector(`#alugueisScreen [onclick="sortTable('alugueis','${sortState.alugueis.col}')"]`);
        if (currentTh) currentTh.classList.add(sortState.alugueis.dir === 'asc' ? 'sort-asc' : 'sort-desc');
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

/*
 * Função Didática: Exibe em vermelho os dias e o custo financeiro 
 * da multa atual, ou exibe apenas "—" (traço) se o livro estiver dentro do prazo.
 */
function renderAlertaAtraso(diasAtraso, multaAcumulada) {
    if (diasAtraso > 0) {
        return `<span style="color:#f85149;font-weight:600">${diasAtraso}d — R$&nbsp;${multaAcumulada.toFixed(2)}</span>`;
    }
    return `<span style="color:var(--text-faint)">—</span>`;
}

/*
 * Função Didática: Determina os botões de ação na tabela de Controle Geral.
 */
function renderAcoesAluguel(id, podeDevolver) {
    if (podeDevolver) {
        return `<button class="btn btn-success btn-sm" onclick="abrirModalDevolucao(${id})">Devolver</button>`;
    }
    return `<span style="color:var(--text-faint)">—</span>`;
}

function renderAlugueisCompleto(data) {
    const tbody = document.getElementById('alugueisTbody');
    tbody.innerHTML = ''; // Limpa a tabela

    if (!data.length) { 
        setEmpty('alugueisTbody', 9, 'Nenhum empréstimo encontrado.'); 
        return; 
    }

    data.forEach(a => {
        const diasAtraso = Number(a.dias_atraso ?? 0);
        const multaAcum = Number(a.multa_acumulada ?? 0);

        const tr = document.createElement('tr');
        
        // Vamos usar variáveis claras para avisar sobre multa pendente passada
        const badgeMulta = a.multa_pendente 
            ? ' <span class="badge badge-danger" style="font-size:.55rem;vertical-align:middle">multa pendente</span>' 
            : '';

        tr.innerHTML = `
            <td style="color:var(--text-faint)">${esc(a.id)}</td>
            <td>${esc(a.usuario ?? '—')} ${badgeMulta}</td>
            <td><strong>${esc(a.titulo ?? '—')}</strong></td>
            <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(a.exemplar_codigo ?? '—')}</code></td>
            <td style="color:var(--text-dim)">${fmtDate(a.data_aluguel)}</td>
            <td style="color:var(--text-dim)">${fmtDate(a.prazo)}</td>
            <td>${renderAlertaAtraso(diasAtraso, multaAcum)}</td>
            <td>${badgeStatus(a.status)}</td>
            <td>${renderAcoesAluguel(a.id, a.pode_devolver)}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

/*
 * Função Didática: Representa o botão de Extender/Renovar o Prazo (+14 dias)
 * na visão do aluno autenticado (Meus Empréstimos). 
 */
function renderAcoesMeusAlugueis(id, podeRenovar) {
    if (podeRenovar) {
        return `<button class="btn btn-gold btn-sm" onclick="renovarEmprestimo(${id})">+14 dias</button>`;
    }
    return `<span style="color:var(--text-faint)">—</span>`;
}

function renderAlugueisMeus(data) {
    const tbody = document.getElementById('alugueisTbody');
    tbody.innerHTML = ''; // Limpa a tabela
    
    if (!data.length) { 
        setEmpty('alugueisTbody', 8, 'Nenhum empréstimo encontrado.'); 
        return; 
    }
    
    data.forEach(a => {
        const diasAtraso = Number(a.dias_atraso ?? 0);
        const multaAcum = Number(a.multa_acumulada ?? 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:var(--text-faint)">${esc(a.id)}</td>
            <td><strong>${esc(a.titulo ?? '—')}</strong></td>
            <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(a.exemplar_codigo ?? '—')}</code></td>
            <td style="color:var(--text-dim)">${fmtDate(a.data_aluguel)}</td>
            <td style="color:var(--text-dim)">${fmtDate(a.prazo)}</td>
            <td>${renderAlertaAtraso(diasAtraso, multaAcum)}</td>
            <td>${badgeStatus(a.status)}</td>
            <td>${renderAcoesMeusAlugueis(a.id, a.pode_renovar)}</td>
        `;
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
        const selE = document.getElementById('aluguelExemplar');
        
        selL.innerHTML = '<option value="">Selecione um livro…</option>';
        selU.innerHTML = '<option value="">Selecione um usuário…</option>';
        selE.innerHTML = '<option value="">Selecione um livro primeiro…</option>';
        
        (livros.data ?? livros).forEach(l => selL.innerHTML += `<option value="${l.id}">${esc(l.titulo)} — ${esc(l.autor)} (${esc(l.exemplares_disponiveis)} disp.)</option>`);
        (usuarios.data ?? usuarios).forEach(u => selU.innerHTML += `<option value="${u.id}">${esc(u.nome)} (${esc(u.email)})</option>`);
        
        // Adicionar evento para carregar exemplares quando livro for selecionado
        selL.onchange = async () => {
            const livroId = selL.value;
            if (!livroId) {
                selE.innerHTML = '<option value="">Selecione um livro primeiro…</option>';
                return;
            }
            
            try {
                const { exemplares } = await api(`/livros/${livroId}/exemplares`);
                const disponiveis = exemplares.filter(ex => ex.disponibilidade === 'disponivel');
                
                selE.innerHTML = '<option value="">Selecione um exemplar…</option>';
                disponiveis.forEach(ex => {
                    const condicaoText = ex.condicao === 'bom' ? 'Bom' : ex.condicao === 'danificado' ? 'Danificado' : ex.condicao;
                    selE.innerHTML += `<option value="${ex.id}">${esc(ex.codigo || `#${ex.id}`)} - ${condicaoText}</option>`;
                });
                
                if (disponiveis.length === 0) {
                    selE.innerHTML = '<option value="">Nenhum exemplar disponível</option>';
                }
            } catch (err) {
                selE.innerHTML = '<option value="">Erro ao carregar exemplares</option>';
            }
        };
        
        openModal('addAluguelModal');
    } catch (err) { showAlert(err.message, 'danger'); }
}

document.getElementById('addAluguelForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        const livroId = parseInt(document.getElementById('aluguelLivro').value);
        const usuarioId = parseInt(document.getElementById('aluguelUsuario').value);
        const exemplarId = document.getElementById('aluguelExemplar').value ? 
            parseInt(document.getElementById('aluguelExemplar').value) : null;
            
        const requestBody = {
            livro_id: livroId,
            usuario_id: usuarioId
        };
        
        // Só adiciona exemplar_id se foi selecionado
        if (exemplarId) {
            requestBody.exemplar_id = exemplarId;
        }
        
        await api('/alugueis', {
            method: 'POST',
            body: JSON.stringify(requestBody)
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
            if (res.aviso) {
                showAlert(res.aviso, 'warning');
                if (res.multas && res.multas.length > 0) {
                    const multasText = res.multas.map(m => 
                        `${m.tipo === 'atraso' ? `Atraso: ${m.dias} dias` : 'Perda do exemplar'}: R$ ${m.valor.toFixed(2)}`
                    ).join('\n');
                    setTimeout(() => {
                        showAlert(`Multas geradas:\n${multasText}\nTotal: R$ ${res.total_multa.toFixed(2)}`, 'info');
                    }, 2000);
                }
            } else {
                showAlert(res.message || 'Livro devolvido!');
            }
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
        const params = new URLSearchParams({ 
            page, 
            limit: 20,
            sort: sortState.historico.col,
            order: sortState.historico.dir
        });
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
        
        // Atualiza classes de ordenação
        document.querySelectorAll('#historicoScreen .sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        const currentTh = document.querySelector(`#historicoScreen [onclick="sortTable('historico','${sortState.historico.col}')"]`);
        if (currentTh) currentTh.classList.add(sortState.historico.dir === 'asc' ? 'sort-asc' : 'sort-desc');
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