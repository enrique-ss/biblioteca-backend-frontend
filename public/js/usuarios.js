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
            tr.innerHTML = `
                <td style="color:var(--text-faint)">${esc(u.id)}</td>
                <td><strong>${esc(u.nome)}</strong></td>
                <td style="color:var(--text-dim)">${esc(u.email)}</td>
                <td>${badgeTipo(u.tipo)}</td>
                <td><div class="td-actions">
                    <button class="btn btn-ghost btn-sm" onclick='editarUsuario(${JSON.stringify(u)})'>Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="excluirUsuario(${u.id},'${esc(u.nome)}')">Excluir</button>
                </div></td>`;
            tbody.appendChild(tr);
        });
        renderPagination('usuariosPagination', page, pages, (p) => loadUsuarios(p, busca));
    } catch (err) { setEmpty('usuariosTbody', 5, err.message); showAlert(err.message, 'danger'); }
}

function editarUsuario(u) {
    document.getElementById('editUsuarioId').value    = u.id;
    document.getElementById('editUsuarioNome').value  = u.nome;
    document.getElementById('editUsuarioEmail').value = u.email;
    document.getElementById('editUsuarioTipo').value  = u.tipo;
    openModal('editUsuarioModal');
}

document.getElementById('editUsuarioForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('editUsuarioId').value;
    try {
        await api(`/usuarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                nome:  document.getElementById('editUsuarioNome').value,
                email: document.getElementById('editUsuarioEmail').value,
                tipo:  document.getElementById('editUsuarioTipo').value
            })
        });
        showAlert('Usuário atualizado!');
        closeModal('editUsuarioModal'); loadUsuarios();
    } catch (err) { showAlert(err.message, 'danger'); }
});

function excluirUsuario(id, nome) {
    showConfirm({
        icon: '🗑️', title: 'Excluir usuário',
        msg: `Excluir "${nome}"? Esta ação é irreversível.`, okLabel: 'Excluir',
        async onOk() {
            try {
                await api(`/usuarios/${id}`, { method: 'DELETE' });
                showAlert('Usuário excluído!'); loadUsuarios();
            } catch (err) { showAlert(err.message, 'danger'); }
        }
    });
}
