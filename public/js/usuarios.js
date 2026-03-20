// ── USUÁRIOS ──────────────────────────────────────────────────────────────────

const loadUsuariosDebounced = debounce((busca) => loadUsuarios(1, busca));

async function loadUsuarios(page = 1, busca = '') {
    setLoading('usuariosTbody', 5);
    try {
        const params = new URLSearchParams({ page, limit: 20 });
        if (busca.trim()) params.set('busca', busca.trim());
        const { data, pages } = await api(`/usuarios?${params}`);
        const tbody = document.getElementById('usuariosTbody');
        tbody.innerHTML = '';
        if (!data.length) { setEmpty('usuariosTbody', 5, 'Nenhum usuário cadastrado.'); return; }
        data.forEach(u => {
            const tr = document.createElement('tr');
            const multaBadge = u.multa_pendente
                ? `<span class="badge badge-danger" style="margin-left:6px;font-size:.55rem">multa</span>` : '';
            tr.innerHTML = `
                <td style="color:var(--text-faint)">${esc(u.id)}</td>
                <td><strong>${esc(u.nome)}</strong>${multaBadge}</td>
                <td style="color:var(--text-dim)">${esc(u.email)}</td>
                <td>${badgeTipo(u.tipo)}</td>
                <td><div class="td-actions">
                    <button class="btn btn-ghost btn-sm" onclick='editarUsuario(${JSON.stringify(u)})'>Editar</button>
                    ${u.multa_pendente
                    ? `<button class="btn btn-warning btn-sm" onclick="verMultasUsuario(${u.id},'${esc(u.nome)}')">Multas</button>`
                    : ''}
                    <button class="btn btn-danger btn-sm" onclick="excluirUsuario(${u.id},'${esc(u.nome)}')">Excluir</button>
                </div></td>`;
            tbody.appendChild(tr);
        });
        renderPagination('usuariosPagination', page, pages, (p) => loadUsuarios(p, busca));
    } catch (err) { setEmpty('usuariosTbody', 5, err.message); showAlert(err.message, 'danger'); }
}

function editarUsuario(u) {
    document.getElementById('editUsuarioId').value = u.id;
    document.getElementById('editUsuarioNome').value = u.nome;
    document.getElementById('editUsuarioEmail').value = u.email;
    document.getElementById('editUsuarioTipo').value = u.tipo;
    openModal('editUsuarioModal');
}

document.getElementById('editUsuarioForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('editUsuarioId').value;
    try {
        await api(`/usuarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                nome: document.getElementById('editUsuarioNome').value,
                email: document.getElementById('editUsuarioEmail').value,
                tipo: document.getElementById('editUsuarioTipo').value,
            })
        });
        showAlert('Usuário atualizado!');
        closeModal('editUsuarioModal');
        loadUsuarios();
    } catch (err) { showAlert(err.message, 'danger'); }
});

function excluirUsuario(id, nome) {
    showConfirm({
        icon: '', title: 'Excluir usuário',
        msg: `Excluir "${nome}" permanentemente?`, okLabel: 'Excluir',
        async onOk() {
            try {
                await api(`/usuarios/${id}`, { method: 'DELETE' });
                showAlert('Usuário excluído!');
                loadUsuarios();
            } catch (err) { showAlert(err.message, 'danger'); }
        }
    });
}

async function verMultasUsuario(id, nome) {
    openModal('multasModal');
    document.getElementById('multasUsuarioNome').textContent = nome;
    document.getElementById('multasUsuarioId').value = id;
    await carregarMultasUsuario(id);
}

async function carregarMultasUsuario(id) {
    setLoading('multasTbody', 5);
    try {
        const { multas, total_pendente } = await api(`/alugueis/multas/${id}`);
        const tbody = document.getElementById('multasTbody');
        tbody.innerHTML = '';
        if (!multas.length) { setEmpty('multasTbody', 5, 'Nenhuma multa.'); return; }
        multas.forEach(m => {
            const tr = document.createElement('tr');
            const cor = m.status === 'pendente' ? 'badge-danger' : 'badge-success';
            tr.innerHTML = `
                <td>${badgeTipo2(m.tipo)}</td>
                <td><strong>${esc(m.livro)}</strong></td>
                <td style="color:#f85149;font-weight:600">R$ ${Number(m.valor).toFixed(2)}</td>
                <td style="color:var(--text-dim)">${m.dias_atraso > 0 ? `${m.dias_atraso} dias` : '—'}</td>
                <td><span class="badge ${cor}">${esc(m.status)}</span></td>
                <td style="color:var(--text-dim)">${fmtDate(m.created_at)}</td>`;
            tbody.appendChild(tr);
        });
        const totalEl = document.getElementById('multasTotalPendente');
        if (total_pendente > 0) {
            totalEl.innerHTML = `Total pendente: <strong style="color:#f85149">R$ ${total_pendente.toFixed(2)}</strong>`;
            document.getElementById('btnQuitarMultas').style.display = 'inline-flex';
        } else {
            totalEl.textContent = 'Sem multas pendentes.';
            document.getElementById('btnQuitarMultas').style.display = 'none';
        }
    } catch (err) { setEmpty('multasTbody', 5, err.message); }
}

async function quitarMultasUsuario() {
    const id = document.getElementById('multasUsuarioId').value;
    try {
        const res = await api(`/alugueis/multas/${id}/pagar`, { method: 'PUT' });
        showAlert(res.message);
        await carregarMultasUsuario(id);
        loadUsuarios();
    } catch (err) { showAlert(err.message, 'danger'); }
}

function badgeTipo2(tipo) {
    if (tipo === 'atraso') return `<span class="badge badge-warning">Atraso</span>`;
    if (tipo === 'perda') return `<span class="badge badge-danger">Perda</span>`;
    return `<span class="badge">${esc(tipo)}</span>`;
}