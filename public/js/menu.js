// Gerenciamento dos Menus de Navegação e Sidebar

function carregarMenu() {
    // Define o nome do usuário na tela de boas-vindas do menu
    const elementoNome = document.getElementById('menuUserName');
    if (elementoNome) {
        elementoNome.textContent = currentUser.nome;
    }

    const ehBibliotecario = currentUser.permissions?.is_admin || false;
    
    const navLateral = document.getElementById('sidebarNav');
    if (navLateral) {
        navLateral.innerHTML = ''; // Limpa os itens anteriores para reconstrução
    }

    const itensMenu = [
        { 
            icon: '📚', 
            title: 'Acervo Físico', 
            action() { 
                carregarLivros(); 
                mostrarTela('livrosScreen'); 
            } 
        },
        { 
            icon: '📱', 
            title: 'Acervo Digital', 
            action() { 
                carregarAcervoDigital(); 
                mostrarTela('acervoDigitalScreen'); 
            } 
        }
    ];

    if (ehBibliotecario) {
        // Opções exclusivas para bibliotecários - Empréstimos primeiro
        itensMenu.push({ 
            icon: '📋', 
            title: 'Empréstimos',  
            action() { 
                carregarAlugueis(); 
                mostrarTela('alugueisScreen'); 
            } 
        });
    } else {
        // Opções para usuários comuns - Meus Livros primeiro
        itensMenu.push({ 
            icon: '📖', 
            title: 'Meus Livros', 
            action() { 
                carregarMeusAlugueis(); 
                mostrarTela('alugueisScreen'); 
            } 
        });
    }

    // Espaço Literário agora fica abaixo de Empréstimos/Meus Livros
    itensMenu.push({ 
        icon: '🎓', 
        title: 'Espaço Literário', 
        action() { 
            mostrarTela('espacoInfantilScreen'); 
            if (typeof initializeInfantilSpace === 'function') {
                initializeInfantilSpace();
            }
        } 
    });

    if (ehBibliotecario) {
        // Outras opções administrativas
        itensMenu.push(
            { 
                icon: '👥', 
                title: 'Usuários',     
                action() { 
                    carregarUsuarios(); 
                    mostrarTela('usuariosScreen'); 
                } 
            },
            { 
                icon: '📊', 
                title: 'Estatísticas', 
                action() { 
                    mostrarTela('statsScreen'); 
                    carregarEstatisticasDetalhadas(); 
                } 
            }
        );
    }

    // Itens de suporte comum (Alertas e Tema)
    itensMenu.push(
        { 
            icon: `<span style="position:relative;">🔔<span class="nav-notifications-badge" id="notificationsBadge">0</span></span>`, 
            title: 'Alertas', 
            action() { 
                mostrarTela('notificacoesScreen'); 
                carregarNotificacoesCompleto(); 
            } 
        },
        {
            icon: `<span id="btnThemeIcon" aria-hidden="true">${document.documentElement.getAttribute('data-theme') === 'light' ? '☀️' : '🌙'}</span>`,
            title: 'Tema',
            action() { toggleTheme(); }
        }
    );

    // Itens de Conta
    itensMenu.push(
        { 
            icon: '👤', 
            title: 'Meu Perfil', 
            action() { mostrarTela('perfilScreen'); } 
        },
        { 
            icon: '<span style="color:var(--danger);">🚪</span>', 
            title: `<span style="color:var(--danger);">Sair</span>`, 
            action() { logout(); } 
        }
    );

    // Cria visualmente cada botão no menu lateral (sidebar)
    if (navLateral) {
        navLateral.style.display = 'flex'; // Garante que apareça
        itensMenu.forEach(item => {
            const botao = document.createElement('button');
            botao.className = 'side-btn';
            botao.title = item.title.replace(/<[^>]*>/g, ''); // Limpa HTML para o title
            botao.onclick = item.action;
            botao.innerHTML = `<span class="side-icon">${item.icon}</span><span class="side-text">${item.title}</span>`;
            navLateral.appendChild(botao);
        });
    }

    // Gerencia a visibilidade de botões de ação rápida fora da sidebar
    const displayBib = ehBibliotecario ? 'inline-flex' : 'none';
    
    const btnAddLivro = document.getElementById('btnAddLivro');
    if (btnAddLivro) btnAddLivro.style.display = displayBib;

    const btnNovoAluguel = document.getElementById('btnNovoAluguel');
    if (btnNovoAluguel) btnNovoAluguel.style.display = displayBib;

    const btnHistorico = document.getElementById('btnHistorico');
    if (btnHistorico) btnHistorico.style.display = displayBib;

    // Atualiza o badge das notificações se houver valor acumulado
    if (typeof carregarNotificacoes === 'function') {
        carregarNotificacoes(); 
    }
}
