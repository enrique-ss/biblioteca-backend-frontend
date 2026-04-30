/*
    MENU LATERAL E CARROSSEL DE NOVIDADES.
    Este arquivo controla dois sistemas interligados:

    1. SIDEBAR DE NAVEGAÇÃO: monta dinamicamente os botões do menu lateral conforme
       o tipo de usuário. Bibliotecários veem mais opções (empréstimos, usuários, estatísticas).
       Leitores comuns veem apenas acervos, seus livros, o espaço literário e o perfil.

    2. CARROSSEL DE NOVIDADES: exibe na tela inicial os 10 itens mais recentes do acervo
       (físico + digital combinados, ordenados por data de cadastro). Avança automaticamente
       a cada 5 segundos e tem pontinhos de navegação manual.
*/

// Controla o estado de expansão da sidebar no mobile
let sidebarExpanded = false;
let currentExpandedItem = null;

/*
    Monta e inicializa a tela do menu principal após o login.
    Responsabilidades:
    - Exibe o nome do usuário logado
    - Gera os botões de navegação conforme o tipo de conta (leitor ou bibliotecário)
    - Controla a visibilidade dos botões de ação (Adicionar Livro, Novo Empréstimo, etc.)
    - Inicializa as notificações e o carrossel de novidades
*/
function carregarMenu() {
    // Exibe o nome do usuário no cumprimento da tela inicial
    const elementoNome = document.getElementById('menuUserName');
    if (elementoNome) {
        elementoNome.textContent = currentUser.nome;
    }

    const ehBibliotecario = currentUser.permissions?.is_admin || false;
    
    const navLateral = document.getElementById('sidebarNav');
    if (navLateral) {
        navLateral.innerHTML = '';
    }

    /*
        Lista de itens do menu: cada item tem ícone, título e a ação a executar ao clicar.
        Itens com skipActive: true não marcam o botão como "ativo" ao serem clicados
        (usados para ações que não são telas, como alternar o tema ou sair).

        Itens comuns a todos os usuários:
    */
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

    /*
        O terceiro item muda conforme o tipo de usuário:
        - Bibliotecário vê "Empréstimos" (gerencia todos os empréstimos do sistema)
        - Leitor vê "Meus Livros" (lista apenas seus próprios empréstimos)
    */
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

    // Social: Comunidade de leitores
    itensMenu.push({ 
        icon: '🌍', 
        title: 'Social', 
        action() { 
            mostrarTela('socialScreen'); 
            if (typeof carregarExplorarSocial === 'function') {
                carregarExplorarSocial('', 'socialScreenList');
            }
        } 
    });

    // Espaço Literário: disponível para todos os usuários
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

    // Itens exclusivos de bibliotecário: gestão de usuários e painel de estatísticas
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

    // Itens de suporte e configuração: notificações e alternância de tema
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
            // O ícone muda conforme o tema atual: sol (☀️) no claro, lua (🌙) no escuro
            icon: `<span id="btnThemeIcon" aria-hidden="true">${document.documentElement.getAttribute('data-theme') === 'light' ? '☀️' : '🌙'}</span>`,
            title: 'Tema',
            action() { toggleTheme(); },
            skipActive: true
        }
    );

    // Itens de conta: perfil e botão de sair (em vermelho para destacar a ação destrutiva)
    itensMenu.push(
        { 
            icon: '👤', 
            title: 'Meu Perfil', 
            action() { 
                mostrarTela('perfilScreen'); 
                if (typeof carregarPerfil === 'function') carregarPerfil();
            } 
        },
        { 
            icon: '<span style="color:var(--danger);">🚪</span>', 
            title: `<span style="color:var(--danger);">Sair</span>`, 
            action() { logout(); },
            skipActive: true
        }
    );

    // Cria os botões da sidebar com base na lista de itens definida acima
    if (navLateral) {
        navLateral.style.display = 'flex';
        itensMenu.forEach(item => {
            const botao = document.createElement('button');
            botao.className = 'side-btn';
            // Remove tags HTML do title para o tooltip nativo do navegador funcionar
            botao.title = item.title.replace(/<[^>]*>/g, '');
            botao.innerHTML = `<span class="side-icon">${item.icon}</span><span class="side-text">${item.title}</span>`;
            
            botao.addEventListener('click', (e) => {
                e.preventDefault();
                handleSidebarClick(item, botao, e);
            });
            
            navLateral.appendChild(botao);
        });
    }

    /*
        Controla a visibilidade dos botões de ação nas telas internas.
        Botões de gestão (adicionar livro, novo empréstimo, histórico) só aparecem
        para bibliotecários. Leitores não têm acesso a essas ações.
    */
    const displayBib = ehBibliotecario ? 'inline-flex' : 'none';
    
    const btnAddLivro = document.getElementById('btnAddLivro');
    if (btnAddLivro) btnAddLivro.style.display = displayBib;

    const btnNovoAluguel = document.getElementById('btnNovoAluguel');
    if (btnNovoAluguel) btnNovoAluguel.style.display = displayBib;

    const btnHistorico = document.getElementById('btnHistorico');
    if (btnHistorico) btnHistorico.style.display = displayBib;

    // Carrega o contador de notificações pendentes no ícone do sino
    if (typeof carregarNotificacoes === 'function') {
        carregarNotificacoes(); 
    }

    // Inicializa o carrossel de novidades na tela principal
    carregarNovidades();
}

// Controla o índice (posição) atual do carrossel
let carouselIndex = 0;

/*
    Busca os 10 itens mais recentes do acervo (físico e digital combinados)
    e renderiza o carrossel de novidades na tela inicial.
    As duas buscas são feitas em paralelo com Promise.all para ser mais rápido.
    Os itens são mesclados, ordenados por data de criação (mais novo primeiro)
    e apenas os 10 primeiros são exibidos.
    Após renderizar, inicia o auto-play (avanço automático a cada 5 segundos).
*/
async function carregarNovidades() {
    const track = document.getElementById('novidadesTrack');
    if (!track) return;

    try {
        // Busca em paralelo: acervo físico e digital ao mesmo tempo
        const [resFisico, resDigital] = await Promise.all([
            api('/livros?limit=10'),
            api('/acervo-digital?limit=10')
        ]);

        // Adiciona o tipo a cada item para saber para qual tela navegar ao clicar
        let todos = [
            ...(resFisico.data || []).map(i => ({ ...i, type: 'fisico' })),
            ...(resDigital.data || []).map(i => ({ ...i, type: 'digital' }))
        ];

        // Ordena do mais novo para o mais antigo
        todos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        const novidades = todos.slice(0, 10);
        const section = document.querySelector('.novidades-section');

        // Se não há novidades, esconde a seção inteira
        if (novidades.length === 0) {
            if (section) section.style.display = 'none';
            return;
        } else {
            if (section) section.style.display = 'block';
        }

        const gradientes = [
            'linear-gradient(135deg, #1e3a8a, #1e40af)',
            'linear-gradient(135deg, #312e81, #3730a3)',
            'linear-gradient(135deg, #4c1d95, #5b21b6)',
            'linear-gradient(135deg, #701a75, #86198f)',
            'linear-gradient(135deg, #831843, #9d174d)'
        ];

        track.innerHTML = novidades.map((item, index) => {
            const isDigital = item.type === 'digital';
            // Usa a capa do livro se existir; se não, usa gradiente padrão do sistema
            const bg = item.capa_url 
                ? `url('${esc(item.capa_url)}') center/cover no-repeat` 
                : 'linear-gradient(135deg, var(--accent-bg), var(--surface))';
            
            return `
                <div class="digital-hero carousel-slide" style="flex: 0 0 100%; margin-bottom: 0;">
                    <div class="hero-content">
                        <h2 class="hero-title">${esc(item.titulo)}</h2>
                        <p class="hero-author">por ${esc(item.autor)}</p>
                        ${item.sinopse ? `
                            <p class="hero-desc" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; max-height: 4.5em;">
                                ${esc(item.sinopse)}
                            </p>
                        ` : ''}
                        <div class="hero-actions">
                            <button class="btn btn-primary" onclick="${isDigital ? `mostrarTela('acervoDigitalScreen'); carregarAcervoDigital(1);` : `mostrarTela('livrosScreen'); carregarLivros(1);`}">
                                ${isDigital ? 'Acessar Digital' : 'Ver no Acervo'}
                            </button>
                        </div>
                    </div>
                    <div class="hero-bg" style="background: ${bg};"></div>
                </div>
            `;
        }).join('');

        renderDots(novidades.length);
        
        // Reinicia o auto-play: cancela o intervalo anterior e cria um novo
        if (window.carouselInterval) clearInterval(window.carouselInterval);
        window.carouselInterval = setInterval(() => {
            moveCarousel(1);
        }, 5000);

    } catch (error) {
        console.error('Erro ao carregar novidades:', error);
        track.innerHTML = `<div style="padding:40px; text-align:center; color:var(--danger);">
            <p>Não foi possível carregar as novidades.</p>
            <p style="font-size:0.8rem; opacity:0.7; margin-top:10px;">${esc(error.message)}</p>
        </div>`;
    }
}

/*
    Renderiza os pontinhos de navegação do carrossel.
    Cria um botão por slide; o primeiro começa ativo (classe 'active').
    Ao clicar em um pontinho, o carrossel vai direto para aquele slide.
*/
function renderDots(count) {
    const dotsContainer = document.getElementById('carouselDots');
    if (!dotsContainer) return;
    
    dotsContainer.innerHTML = Array.from({ length: count }, (_, i) => 
        `<button class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`
    ).join('');
}

/*
    Navega diretamente para um slide específico pelo seu índice.
    Chamada quando o usuário clica em um dos pontinhos de navegação.
*/
function goToSlide(index) {
    carouselIndex = index;
    updateCarousel();
}

/*
    Avança ou retrocede o carrossel pela quantidade indicada.
    direction: +1 para avançar, -1 para voltar.
    O carrossel é circular: ao passar do último slide, volta para o primeiro.
*/
function moveCarousel(direction) {
    const track = document.getElementById('novidadesTrack');
    const slides = track.querySelectorAll('.carousel-slide');
    if (!slides.length) return;

    carouselIndex += direction;

    if (carouselIndex < 0) carouselIndex = slides.length - 1;
    if (carouselIndex >= slides.length) carouselIndex = 0;

    updateCarousel();
}

/*
    Aplica a posição atual do carrossel visualmente.
    Usa translateX para mover o trilho de slides (cada slide ocupa 100% da largura).
    Também atualiza os pontinhos: o pontinho ativo reflete o slide atual.
*/
function updateCarousel() {
    const track = document.getElementById('novidadesTrack');
    const dots = document.querySelectorAll('.carousel-dot');
    
    track.style.transform = `translateX(-${carouselIndex * 100}%)`;
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === carouselIndex);
    });
}

/*
    Gerencia o clique em um botão da sidebar.
    Executa a ação associada ao item clicado e marca o botão como ativo.
    Botões com skipActive (tema, sair) não são marcados como ativos.
    event.stopPropagation evita que o clique se propague e feche a sidebar no mobile.
*/
function handleSidebarClick(item, button, event) {
    const sidebar = document.querySelector('.sidebar');
    const isMobile = window.innerWidth <= 900;
    
    event.stopPropagation();
    
    if (item.action) {
        item.action();
        
        if (!item.skipActive) {
            // Remove destaque de todos os botões e aplica no clicado
            document.querySelectorAll('.side-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            button.classList.add('active');
        }
    }
}

/*
    Expande a sidebar no mobile para mostrar os textos dos botões.
    No desktop a expansão é feita apenas por CSS (hover).
*/
function expandSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebarExpanded = true;
    sidebar.classList.add('expanded');
}

/*
    Recolhe a sidebar no mobile.
    Também limpa o estado do item que estava expandido.
*/
function collapseSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebarExpanded = false;
    sidebar.classList.remove('expanded');
    currentExpandedItem = null;
}

/*
    Detecta clique fora da sidebar em dispositivos móveis.
    Se o usuário clicar em qualquer lugar fora da sidebar enquanto ela está aberta,
    ela é recolhida automaticamente.
*/
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const isClickInsideSidebar = sidebar.contains(e.target);
    
    if (!isClickInsideSidebar && sidebarExpanded && window.innerWidth <= 900) {
        collapseSidebar();
    }
});

/*
    Atualiza a posição visual do carrossel quando a janela é redimensionada.
    Usa debounce para não executar a cada pixel de redimensionamento.
    Só executa se a tela inicial (menuScreen) estiver ativa.
*/
window.addEventListener('resize', debounce(() => {
    if (document.getElementById('menuScreen').classList.contains('active')) {
        updateCarousel();
    }
}, 200));
