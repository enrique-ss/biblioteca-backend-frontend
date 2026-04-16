// Menus de navegação

let sidebarExpanded = false;
let currentExpandedItem = null;

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
            action() { toggleTheme(); }
        }
    );

    // Conta
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

    // Cria botões do menu
    if (navLateral) {
        navLateral.style.display = 'flex';
        itensMenu.forEach(item => {
            const botao = document.createElement('button');
            botao.className = 'side-btn';
            botao.title = item.title.replace(/<[^>]*>/g, ''); // Limpa HTML para o title
            botao.innerHTML = `<span class="side-icon">${item.icon}</span><span class="side-text">${item.title}</span>`;
            
            // Adiciona comportamento de clique
            botao.addEventListener('click', (e) => {
                e.preventDefault();
                handleSidebarClick(item, botao);
            });
            
            navLateral.appendChild(botao);
        });
    }

    // Visibilidade de botões
    const displayBib = ehBibliotecario ? 'inline-flex' : 'none';
    
    const btnAddLivro = document.getElementById('btnAddLivro');
    if (btnAddLivro) btnAddLivro.style.display = displayBib;

    const btnNovoAluguel = document.getElementById('btnNovoAluguel');
    if (btnNovoAluguel) btnNovoAluguel.style.display = displayBib;

    const btnHistorico = document.getElementById('btnHistorico');
    if (btnHistorico) btnHistorico.style.display = displayBib;

    // Atualiza badge de notificações
    if (typeof carregarNotificacoes === 'function') {
        carregarNotificacoes(); 
    }
}

function handleSidebarClick(item, button) {
    const sidebar = document.querySelector('.sidebar');
    const isMobile = window.innerWidth <= 900;
    
    // Se não estiver expandido, apenas expande
    if (!sidebarExpanded && isMobile) {
        expandSidebar();
        currentExpandedItem = item;
        return;
    }
    
    // Se já estiver expandido ou não for mobile, executa a ação
    if (item.action) {
        item.action();
        
        // Remove classe active de todos os botões
        document.querySelectorAll('.side-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Adiciona classe active ao botão clicado
        button.classList.add('active');
        
        // Se for mobile, colapsa após a navegação
        if (isMobile) {
            setTimeout(() => {
                collapseSidebar();
            }, 300);
        }
    }
}

function expandSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebarExpanded = true;
    sidebar.classList.add('expanded');
}

function collapseSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebarExpanded = false;
    sidebar.classList.remove('expanded');
    currentExpandedItem = null;
}

// Detecta clique fora da sidebar para colapsar
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const isClickInsideSidebar = sidebar.contains(e.target);
    
    if (!isClickInsideSidebar && sidebarExpanded && window.innerWidth <= 900) {
        collapseSidebar();
    }
});
