// Gerenciamento dos Menus de Navegação e Sidebar

function carregarMenu() {
    // Define o nome do usuário na tela de boas-vindas do menu
    const elementoNome = document.getElementById('menuUserName');
    if (elementoNome) {
        elementoNome.textContent = currentUser.nome;
    }

    const ehBibliotecario = currentUser.tipo === 'bibliotecario';
    
    const navLateral = document.getElementById('sidebarNav');
    if (navLateral) {
        navLateral.innerHTML = ''; // Limpa os itens anteriores para reconstrução
    }

    // Define os itens do menu baseados nas permissões do usuário
    const itensMenu = [
        { 
            icon: '📚', 
            title: 'Acervo', 
            action() { 
                carregarLivros(); 
                mostrarTela('livrosScreen'); 
            } 
        }
    ];

    if (ehBibliotecario) {
        // Opções exclusivas para bibliotecários
        itensMenu.push(
            { 
                icon: '📋', 
                title: 'Empréstimos',  
                action() { 
                    carregarAlugueis(); 
                    mostrarTela('alugueisScreen'); 
                } 
            },
            { 
                icon: '👥', 
                title: 'Usuários',     
                action() { 
                    carregarUsuarios(); 
                    mostrarTela('usuariosScreen'); 
                } 
            }
        );
    } else {
        // Opções para usuários comuns
        itensMenu.push(
            { 
                icon: '📖', 
                title: 'Meus Livros', 
                action() { 
                    carregarMeusAlugueis(); 
                    mostrarTela('alugueisScreen'); 
                } 
            },
            { 
                icon: '💸', 
                title: 'Minhas Multas', 
                action() { 
                    carregarMinhasMultas(); 
                    mostrarTela('multasUsuarioScreen'); 
                } 
            }
        );
    }

    // Item comum a todos
    itensMenu.push({ 
        icon: '📊', 
        title: 'Estatísticas', 
        action() { 
            mostrarTela('statsScreen'); 
            carregarEstatisticasDetalhadas(); 
        } 
    });

    // Cria visualmente cada botão no menu lateral (sidebar)
    if (navLateral) {
        itensMenu.forEach(item => {
            const botao = document.createElement('button');
            botao.className = 'side-btn';
            botao.title = item.title;
            botao.onclick = item.action;
            botao.innerHTML = `<span class="side-icon">${item.icon}</span><span class="side-text">${item.title}</span>`;
            navLateral.appendChild(botao);
        });
    }

    // Gerencia a visibilidade de botões de ação rápida dependendo do tipo de usuário
    const displayBib = ehBibliotecario ? 'inline-flex' : 'none';
    
    const btnAddLivro = document.getElementById('btnAddLivro');
    if (btnAddLivro) {
        btnAddLivro.style.display = displayBib;
    }

    const btnNovoAluguel = document.getElementById('btnNovoAluguel');
    if (btnNovoAluguel) {
        btnNovoAluguel.style.display = displayBib;
    }

    const btnHistorico = document.getElementById('btnHistorico');
    if (btnHistorico) {
        btnHistorico.style.display = displayBib;
    }
}
