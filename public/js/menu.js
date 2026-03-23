// ── MENU ──────────────────────────────────────────────────────────────────────

function loadMenu() {
    document.getElementById('menuUserName').textContent = currentUser.nome;
    const isBib = currentUser.tipo === 'bibliotecario';
    
    const sideNav = document.getElementById('sidebarNav');
    sideNav.innerHTML = ''; // Limpa links dinâmicos

    const items = [
        { icon: '📚', title: 'Acervo', action() { loadLivros(); showScreen('livrosScreen'); } }
    ];

    if (isBib) {
        items.push(
            { icon: '📋', title: 'Empréstimos',  action() { loadAlugueis(); showScreen('alugueisScreen'); } },
            { icon: '👥', title: 'Usuários',     action() { loadUsuarios(); showScreen('usuariosScreen'); } },
            { icon: '📊', title: 'Estatísticas', action() { showScreen('statsScreen'); loadStatsDetalhado(); } }
        );
    } else {
        items.push(
            { icon: '📖', title: 'Meus Livros', action() { loadMeusAlugueis(); showScreen('alugueisScreen'); } }
        );
    }

    items.push(
        { icon: '🎓', title: 'Quiz Literário', action() { showScreen('quizScreen'); quizInit(); } }
    );

    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'side-btn';
        btn.title = item.title;
        btn.onclick = item.action;
        btn.innerHTML = `<span class="side-icon">${item.icon}</span><span class="side-text">${item.title}</span>`;
        sideNav.appendChild(btn);
    });

    document.getElementById('btnAddLivro').style.display    = isBib ? 'inline-flex' : 'none';
    document.getElementById('btnNovoAluguel').style.display = isBib ? 'inline-flex' : 'none';
    const btnH = document.getElementById('btnHistorico');
    if (btnH) btnH.style.display = isBib ? 'inline-flex' : 'none';
}
