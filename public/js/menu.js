// Menus de navegação

function carregarMenu() {
    // Nome do usuário
    const elementoNome = document.getElementById('menuUserName');
    if (elementoNome) {
        elementoNome.textContent = currentUser.nome;
    }

    const ehBibliotecario = currentUser.permissions?.is_admin || false;
    
    const navLateral = document.getElementById('sidebarNav');
    if (navLateral) {
        navLateral.innerHTML = '';
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
        itensMenu.push({ 
            icon: '📋', 
            title: 'Empréstimos',  
            action() { 
                carregarAlugueis(); 
                mostrarTela('alugueisScreen'); 
            } 
        });
    } else {
        itensMenu.push({ 
            icon: '📖', 
            title: 'Meus Livros', 
            action() { 
                carregarMeusAlugueis(); 
                mostrarTela('alugueisScreen'); 
            } 
        });
    }

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

    // Suporte
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
            action() {
                toggleTheme();
            }
        },
        {
            icon: '🚪',
            title: 'Sair',
            action() {
                logout();
            }
        }
    );

    // Renderiza menu
    const menuHTML = itensMenu.map(item => `
        <div class="nav-item" onclick="(${item.action})()">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-title">${item.title}</span>
        </div>
    `).join('');

    navLateral.innerHTML = menuHTML;

    // Inicializa badge de notificações se existir
    if (typeof atualizarBadgeNotificacoes === 'function') {
        atualizarBadgeNotificacoes();
    }
}
