// ===== CONFIGURAÇÃO =====
const API_URL = 'http://127.0.0.1:3000/api';
let token = null;
let currentUser = null;

// ===== FUNÇÕES DE NAVEGAÇÃO =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.style.animation = 'slideInRight 0.5s ease reverse';
        setTimeout(() => alertDiv.remove(), 500);
    }, 3000);
}

// ===== FUNÇÕES DE API =====
async function apiCall(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
        const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }
}

// ===== AUTENTICAÇÃO =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginPassword').value;

    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, senha })
        });

        token = data.token;
        currentUser = data.usuario;
        updateUserInfo();
        loadMenu();
        showScreen('menuScreen');
        showAlert('Login realizado com sucesso!');
        e.target.reset();
    } catch (error) {
        showAlert(error.message || 'Erro ao fazer login', 'danger');
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('regNome').value;
    const email = document.getElementById('regEmail').value;
    const senha = document.getElementById('regSenha').value;
    const tipo = document.getElementById('regTipo').value;

    try {
        const data = await apiCall('/auth/registrar', {
            method: 'POST',
            body: JSON.stringify({ nome, email, senha, tipo })
        });

        token = data.token;
        currentUser = data.usuario;
        updateUserInfo();
        loadMenu();
        showScreen('menuScreen');
        showAlert('Cadastro realizado com sucesso!');
        e.target.reset();
    } catch (error) {
        showAlert(error.message || 'Erro ao fazer cadastro', 'danger');
    }
});

function updateUserInfo() {
    document.getElementById('userName').textContent = currentUser.nome;
    document.getElementById('userType').textContent = currentUser.tipo === 'bibliotecario' ? '👨‍💼 Bibliotecário' : '👤 Usuário';
    document.getElementById('userInfo').style.display = 'block';
}

function logout() {
    if (!confirm('Deseja realmente sair?')) return;

    token = null;
    currentUser = null;
    document.getElementById('userInfo').style.display = 'none';
    showScreen('loginScreen');
    showAlert('Logout realizado com sucesso!');
}

// ===== MENU =====
function loadMenu() {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';

    const menus = [
        { icon: '📚', title: 'Consultar Livros', desc: 'Gerenciar acervo', screen: 'livrosScreen', action: loadLivros }
    ];

    if (currentUser.tipo === 'bibliotecario') {
        menus.push(
            { icon: '📋', title: 'Empréstimos', desc: 'Gerenciar aluguéis', screen: 'alugueisScreen', action: loadAlugueis },
            { icon: '👥', title: 'Usuários', desc: 'Gerenciar usuários', screen: 'usuariosScreen', action: loadUsuarios }
        );
        document.getElementById('btnAddLivro').style.display = 'inline-block';
        document.getElementById('btnAddAluguel').style.display = 'inline-block';
    } else {
        menus.push(
            { icon: '📖', title: 'Meus Empréstimos', desc: 'Ver meus livros', screen: 'alugueisScreen', action: loadMeusAlugueis }
        );
        document.getElementById('btnAddLivro').style.display = 'none';
        document.getElementById('btnAddAluguel').style.display = 'none';
    }

    menus.forEach(menu => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `
            <div class="icon">${menu.icon}</div>
            <h3>${menu.title}</h3>
            <p>${menu.desc}</p>
        `;
        card.onclick = () => {
            menu.action();
            showScreen(menu.screen);
        };
        menuGrid.appendChild(card);
    });
}

// ===== LIVROS =====
async function loadLivros() {
    try {
        const data = await apiCall('/livros');
        const tbody = document.querySelector('#livrosTable tbody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum livro cadastrado</td></tr>';
            return;
        }

        data.forEach(livro => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${livro.id}</td>
                <td>${livro.titulo}</td>
                <td>${livro.autor}</td>
                <td>${livro.genero || 'N/A'}</td>
                <td>${livro.corredor}-${livro.prateleira}</td>
                <td>
                    <span class="badge ${livro.status === 'disponivel' ? 'badge-success' : 'badge-danger'}">
                        ${livro.status === 'disponivel' ? '🟢 Disponível' : '🔴 Alugado'}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        showAlert('Erro ao carregar livros', 'danger');
    }
}

document.getElementById('addLivroForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const livro = {
        titulo: document.getElementById('livroTitulo').value,
        autor: document.getElementById('livroAutor').value,
        ano_lancamento: parseInt(document.getElementById('livroAno').value),
        genero: document.getElementById('livroGenero').value,
        isbn: document.getElementById('livroIsbn').value || null
    };

    try {
        await apiCall('/livros', {
            method: 'POST',
            body: JSON.stringify(livro)
        });

        showAlert('Livro cadastrado com sucesso!');
        closeModal('addLivroModal');
        loadLivros();
        e.target.reset();
    } catch (error) {
        showAlert(error.message || 'Erro ao cadastrar livro', 'danger');
    }
});

// ===== ALUGUÉIS =====
async function loadAlugueis() {
    try {
        const data = await apiCall('/alugueis/todos');
        const tbody = document.querySelector('#alugueisTable tbody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum empréstimo registrado</td></tr>';
            return;
        }

        data.forEach(aluguel => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${aluguel.id}</td>
                <td>${aluguel.usuario}</td>
                <td>${aluguel.titulo}</td>
                <td>${new Date(aluguel.data_aluguel).toLocaleDateString('pt-BR')}</td>
                <td>${new Date(aluguel.data_prevista_devolucao).toLocaleDateString('pt-BR')}</td>
                <td>
                    <span class="badge ${aluguel.status === 'ativo' ? 'badge-warning' : 'badge-success'}">
                        ${aluguel.status === 'ativo' ? '🟡 Ativo' : '🟢 Devolvido'}
                    </span>
                </td>
                <td>
                    ${aluguel.status === 'ativo' ?
                    `<button class="btn btn-success action-btn" onclick="devolverLivro(${aluguel.id})">
                            <span>Devolver</span>
                        </button>` :
                    '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        showAlert('Erro ao carregar empréstimos', 'danger');
    }
}

async function loadMeusAlugueis() {
    try {
        const data = await apiCall('/alugueis/meus');
        const tbody = document.querySelector('#alugueisTable tbody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Você não tem empréstimos</td></tr>';
            return;
        }

        data.forEach(aluguel => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${aluguel.id}</td>
                <td>${currentUser.nome}</td>
                <td>${aluguel.titulo}</td>
                <td>${new Date(aluguel.data_aluguel).toLocaleDateString('pt-BR')}</td>
                <td>${new Date(aluguel.data_prevista_devolucao).toLocaleDateString('pt-BR')}</td>
                <td>
                    <span class="badge ${aluguel.status === 'ativo' ? 'badge-warning' : 'badge-success'}">
                        ${aluguel.status === 'ativo' ? '🟡 Ativo' : '🟢 Devolvido'}
                    </span>
                </td>
                <td>-</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        showAlert('Erro ao carregar seus empréstimos', 'danger');
    }
}

async function devolverLivro(id) {
    if (!confirm('Confirmar devolução do livro?')) return;

    try {
        await apiCall(`/alugueis/${id}/devolver`, { method: 'PUT' });
        showAlert('Livro devolvido com sucesso!');
        loadAlugueis();
    } catch (error) {
        showAlert(error.message || 'Erro ao devolver livro', 'danger');
    }
}

async function prepareAluguelModal() {
    try {
        const [livros, usuarios] = await Promise.all([
            apiCall('/livros?status=disponivel'),
            apiCall('/usuarios')
        ]);

        const selectLivro = document.getElementById('aluguelLivro');
        const selectUsuario = document.getElementById('aluguelUsuario');

        selectLivro.innerHTML = '<option value="">Selecione um livro...</option>';
        livros.forEach(livro => {
            selectLivro.innerHTML += `<option value="${livro.id}">${livro.titulo} - ${livro.autor}</option>`;
        });

        selectUsuario.innerHTML = '<option value="">Selecione um usuário...</option>';
        usuarios.forEach(usuario => {
            selectUsuario.innerHTML += `<option value="${usuario.id}">${usuario.nome} (${usuario.email})</option>`;
        });
    } catch (error) {
        showAlert('Erro ao carregar dados', 'danger');
    }
}

document.getElementById('btnAddAluguel').addEventListener('click', prepareAluguelModal);

document.getElementById('addAluguelForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const aluguel = {
        livro_id: parseInt(document.getElementById('aluguelLivro').value),
        usuario_id: parseInt(document.getElementById('aluguelUsuario').value)
    };

    if (!aluguel.livro_id || !aluguel.usuario_id) {
        showAlert('Selecione um livro e um usuário', 'danger');
        return;
    }

    try {
        await apiCall('/alugueis', {
            method: 'POST',
            body: JSON.stringify(aluguel)
        });

        showAlert('Aluguel registrado com sucesso!');
        closeModal('addAluguelModal');
        loadAlugueis();
        e.target.reset();
    } catch (error) {
        showAlert(error.message || 'Erro ao registrar aluguel', 'danger');
    }
});

// ===== USUÁRIOS =====
async function loadUsuarios() {
    try {
        const data = await apiCall('/usuarios');
        const tbody = document.querySelector('#usuariosTable tbody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum usuário cadastrado</td></tr>';
            return;
        }

        data.forEach(usuario => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${usuario.id}</td>
                <td>${usuario.nome}</td>
                <td>${usuario.email}</td>
                <td>
                    <span class="badge ${usuario.tipo === 'bibliotecario' ? 'badge-warning' : 'badge-success'}">
                        ${usuario.tipo === 'bibliotecario' ? '👨‍💼 Bibliotecário' : '👤 Usuário'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-primary action-btn" onclick='editarUsuario(${JSON.stringify(usuario)})'>
                        <span>✏️ Editar</span>
                    </button>
                    <button class="btn btn-danger action-btn" onclick="excluirUsuario(${usuario.id})">
                        <span>🗑️ Excluir</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        showAlert('Erro ao carregar usuários', 'danger');
    }
}

function editarUsuario(usuario) {
    document.getElementById('editUsuarioId').value = usuario.id;
    document.getElementById('editUsuarioNome').value = usuario.nome;
    document.getElementById('editUsuarioEmail').value = usuario.email;
    document.getElementById('editUsuarioTipo').value = usuario.tipo;
    showModal('editUsuarioModal');
}

document.getElementById('editUsuarioForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editUsuarioId').value;
    const usuario = {
        nome: document.getElementById('editUsuarioNome').value,
        email: document.getElementById('editUsuarioEmail').value,
        tipo: document.getElementById('editUsuarioTipo').value
    };

    try {
        await apiCall(`/usuarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify(usuario)
        });

        showAlert('Usuário atualizado com sucesso!');
        closeModal('editUsuarioModal');
        loadUsuarios();
    } catch (error) {
        showAlert(error.message || 'Erro ao atualizar usuário', 'danger');
    }
});

async function excluirUsuario(id) {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita!')) return;

    try {
        await apiCall(`/usuarios/${id}`, { method: 'DELETE' });
        showAlert('Usuário excluído com sucesso!');
        loadUsuarios();
    } catch (error) {
        showAlert(error.message || 'Erro ao excluir usuário', 'danger');
    }
}