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
                handleSidebarClick(item, botao, e);
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

    // Carrega o carrossel de novidades
    carregarNovidades();
}

let carouselIndex = 0;
async function carregarNovidades() {
    const track = document.getElementById('novidadesTrack');
    if (!track) return;

    try {
        // Busca 10 últimos de cada acervo
        const [resFisico, resDigital] = await Promise.all([
            api('/livros?limit=10'),
            api('/acervo-digital?limit=10')
        ]);

        // Combina e ordena por data de criação
        let todos = [
            ...(resFisico.data || []).map(i => ({ ...i, type: 'fisico' })),
            ...(resDigital.data || []).map(i => ({ ...i, type: 'digital' }))
        ];

        todos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Pega apenas os 10 primeiros
        const novidades = todos.slice(0, 10);
        const section = document.querySelector('.novidades-section');

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
        
        // Auto-play opcional
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

function renderDots(count) {
    const dotsContainer = document.getElementById('carouselDots');
    if (!dotsContainer) return;
    
    dotsContainer.innerHTML = Array.from({ length: count }, (_, i) => 
        `<button class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`
    ).join('');
}

function goToSlide(index) {
    carouselIndex = index;
    updateCarousel();
}

function moveCarousel(direction) {
    const track = document.getElementById('novidadesTrack');
    const slides = track.querySelectorAll('.carousel-slide');
    if (!slides.length) return;

    carouselIndex += direction;

    if (carouselIndex < 0) carouselIndex = slides.length - 1;
    if (carouselIndex >= slides.length) carouselIndex = 0;

    updateCarousel();
}

function updateCarousel() {
    const track = document.getElementById('novidadesTrack');
    const dots = document.querySelectorAll('.carousel-dot');
    
    track.style.transform = `translateX(-${carouselIndex * 100}%)`;
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === carouselIndex);
    });
}

function handleSidebarClick(item, button, event) {
    const sidebar = document.querySelector('.sidebar');
    const isMobile = window.innerWidth <= 900;
    
    // Previne comportamento duplo
    event.stopPropagation();
    
    // Em mobile, navega diretamente sem expandir
    if (item.action) {
        item.action();
        
        // Remove classe active de todos os botões
        document.querySelectorAll('.side-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Adiciona classe active ao botão clicado
        button.classList.add('active');
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

// Atualiza carrossel ao redimensionar
window.addEventListener('resize', debounce(() => {
    if (document.getElementById('menuScreen').classList.contains('active')) {
        updateCarousel();
    }
}, 200));
