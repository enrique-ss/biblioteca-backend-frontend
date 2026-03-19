// ── MENU ──────────────────────────────────────────────────────────────────────

function loadMenu() {
    document.getElementById('menuUserName').textContent = currentUser.nome;
    const isBib = currentUser.tipo === 'bibliotecario';
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';

    const items = [
        { icon: '📚', title: 'Acervo de Livros', action() { loadLivros(); showScreen('livrosScreen'); } }
    ];

    if (isBib) {
        items.push(
            { icon: '📋', title: 'Empréstimos',  action() { loadAlugueis(); showScreen('alugueisScreen'); } },
            { icon: '👥', title: 'Usuários',     action() { loadUsuarios(); showScreen('usuariosScreen'); } },
            { icon: '📊', title: 'Estatísticas', action() { showScreen('statsScreen'); loadStatsDetalhado(); } }
        );
    } else {
        items.push(
            { icon: '📖', title: 'Meus Empréstimos', action() { loadMeusAlugueis(); showScreen('alugueisScreen'); } }
        );
    }

    items.push(
        { icon: '🎓', title: 'Quiz Literário', action() { showScreen('quizScreen'); quizInit(); } },
        { icon: '✏️', title: 'Meu Perfil',     action() { loadPerfil(); showScreen('perfilScreen'); } }
    );

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `<span class="menu-card-icon">${item.icon}</span><div class="menu-card-title">${item.title}</div>`;
        card.addEventListener('click', item.action);
        grid.appendChild(card);
    });

    document.getElementById('btnAddLivro').style.display    = isBib ? 'inline-flex' : 'none';
    document.getElementById('btnNovoAluguel').style.display = isBib ? 'inline-flex' : 'none';
    const btnH = document.getElementById('btnHistorico');
    if (btnH) btnH.style.display = isBib ? 'inline-flex' : 'none';
}
