/*
    FUNDO ANIMADO COM EMOJIS.
    Este arquivo é responsável pela camada visual animada do sistema:

    1. Fundo animado com emojis sólidos (estrelas ⭐ e patinhas 🐾)
       que flutuam suavemente atrás de todo o conteúdo
    2. Animações de transição entre telas usando GSAP: efeito de entrada suave quando
       o usuário navega de uma seção para outra.
    3. Animação de entrada das linhas de tabela: cada linha aparece deslizando da esquerda.

    Os emojis mudam de cor dourada (tema escuro) para verde (tema claro) automaticamente.
*/

/*
    Inicializa o fundo animado com emojis sólidos.
    Cria múltiplas camadas de emojis flutuantes com diferentes tamanhos e velocidades.
    Usa CSS puro para melhor performance e compatibilidade.
*/
function inicializarFundoAnimado() {
    const canvas = document.getElementById('threeCanvas');
    if (!canvas) {
        console.log('Canvas threeCanvas não encontrado');
        return;
    }

    console.log('Inicializando fundo animado com emojis...');
    
    // Limpa qualquer conteúdo existente
    canvas.innerHTML = '';
    
    // Configuração do canvas
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    canvas.style.overflow = 'hidden';

    // 20 estrelas espalhadas
    const camadas = [
        { emoji: '⭐', count: 20, sizeRange: [18, 28], speedRange: [0.3, 1], opacity: 0.6 }
    ];

    const temaEhClaro = document.documentElement.getAttribute('data-theme') === 'light';
    const corBase = temaEhClaro ? '#2D6A4F' : '#D4AF37';

    // Cria cada camada de estrelas
    camadas.forEach(camada => {
        console.log(`Criando ${camada.count} estrelas da camada`);
        for (let i = 0; i < camada.count; i++) {
            criarEstrelaFlutuante(canvas, camada, corBase);
        }
    });
    
    console.log(`Total de ${camadas.reduce((sum, camada) => sum + camada.count, 0)} estrelas criadas`);

    // Observa mudanças de tema
    const observadorTema = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                console.log('=== MUTAÇÃO DETECTADA ===');
                console.log('Tema mudou, atualizando cores das estrelas...');
                console.log('Atributo antigo:', mutation.oldValue);
                console.log('Atributo novo:', document.documentElement.getAttribute('data-theme'));
                atualizarCoresEmojis();
            }
        });
    });
    
    observadorTema.observe(document.documentElement, { 
        attributes: true, 
        attributeOldValue: true 
    });
}

/*
    Cria uma estrela individual com movimento similar ao Three.js original
*/
function criarEstrelaFlutuante(container, camada, cor) {
    const estrela = document.createElement('div');
    estrela.innerHTML = `
        <svg width="30" height="30" viewBox="0 0 30 30" style="display: block;">
            <path d="M15 2 L18.5 10 L27 11 L21 17 L22.5 25.5 L15 21 L7.5 25.5 L9 17 L3 11 L11.5 10 Z" 
                  fill="${cor}" 
                  stroke="none" />
        </svg>
    `;
    estrela.style.position = 'absolute';
    estrela.style.fontSize = `${Math.random() * (camada.sizeRange[1] - camada.sizeRange[0]) + camada.sizeRange[0]}px`;
    estrela.style.opacity = camada.opacity;
    estrela.style.pointerEvents = 'none';
    estrela.style.userSelect = 'none';
    
    // Posição inicial aleatória mais espalhada
    const startX = (Math.random() - 0.5) * 90; // -45 a 45 (mais espalhado)
    const startY = (Math.random() - 0.5) * 90; // -45 a 45 (mais espalhado)
    const startZ = Math.random() * 10; // Profundidade simples
    estrela.style.left = `${50 + startX}%`; // Centralizado com alcance maior
    estrela.style.top = `${50 + startY}%`;
    estrela.style.zIndex = Math.floor(startZ); // Profundidade simulada
    
    // Movimento aleatório tipo espaço (cada estrela com sua própria direção)
    const speedX = (Math.random() - 0.5) * 0.02; // Movimento X aleatório e lento
    const speedY = (Math.random() - 0.5) * 0.02; // Movimento Y aleatório e lento
    const rotationSpeed = Math.random() * 0.001 + 0.0005; // Rotação suave
    let currentX = startX;
    let currentY = startY;
    let rotation = 0;
    
    // Animação contínua
    function animar(currentTime) {
        // Movimento aleatório e suave tipo flutuação no espaço
        const time = currentTime * 0.0001;
        
        // Adiciona movimento aleatório suave
        currentX += speedX + Math.sin(time * 2) * 0.01;
        currentY += speedY + Math.cos(time * 3) * 0.01;
        
        // Rotação suave da estrela
        rotation += rotationSpeed;
        
        // Wrap around nas bordas (reaparece do lado oposto)
        if (currentX > 50) currentX = -50;
        if (currentX < -50) currentX = 50;
        if (currentY > 50) currentY = -50;
        if (currentY < -50) currentY = 50;
        
        estrela.style.left = `${50 + currentX}%`;
        estrela.style.top = `${50 + currentY}%`;
        estrela.style.transform = `rotate(${rotation}rad)`;
        
        requestAnimationFrame(animar);
    }
    
    container.appendChild(estrela);
    animar(0);
}

/*
    Atualiza as cores dos emojis quando o tema muda
*/
function atualizarCoresEmojis() {
    const canvas = document.getElementById('threeCanvas');
    if (!canvas) return;
    
    const temaAtual = document.documentElement.getAttribute('data-theme');
    console.log(`Tema atual detectado: ${temaAtual}`);
    
    const temaEhClaro = temaAtual === 'light';
    const corBase = temaEhClaro ? '#2D6A4F' : '#D4AF37';
    
    console.log(`Cor base definida: ${corBase} (tema ${temaEhClaro ? 'claro' : 'escuro'})`);
    
    const emojis = canvas.querySelectorAll('div');
    console.log(`Encontrados ${emojis.length} estrelas para atualizar`);
    
    emojis.forEach((emoji, index) => {
        // Atualiza o fill do SVG dentro da estrela
        const svg = emoji.querySelector('svg path');
        if (svg) {
            svg.setAttribute('fill', corBase);
            console.log(`Estrela ${index + 1} atualizada para cor: ${corBase}`);
        }
    });
    
    console.log('Todas as estrelas foram atualizadas!');
}

/*
    Animação de entrada suave para telas usando GSAP.
    Aplica efeito de fade-in e deslizamento vertical quando uma tela se torna ativa.
*/
function animarTransicaoTela(id) {
    const tela = document.getElementById(id);
    if (!tela || typeof gsap === 'undefined') return;

    // Reset para estado inicial
    gsap.set(tela, {
        opacity: 0,
        y: 30,
        scale: 0.98
    });

    // Animação de entrada
    gsap.to(tela, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
        clearProps: 'transform'
    });
}

/*
    Animação de entrada para linhas de tabela.
    Cada linha aparece deslizando da esquerda com leve opacidade.
*/
function animarEntradaTabela() {
    if (typeof gsap === 'undefined') return;

    gsap.utils.toArray('tbody tr').forEach((linha, index) => {
        gsap.from(linha, {
            opacity: 0,
            x: -50,
            duration: 0.4,
            delay: index * 0.05,
            ease: 'power2.out',
            clearProps: 'transform'
        });
    });
}

/*
    Animação para cards do acervo digital e físico.
    Efeito de entrada em cascata com escala e rotação sutis.
*/
function animarEntradaCards() {
    if (typeof gsap === 'undefined') return;

    gsap.utils.toArray('.digital-card, .menu-card').forEach((card, index) => {
        gsap.from(card, {
            opacity: 0,
            scale: 0.9,
            y: 20,
            duration: 0.5,
            delay: index * 0.08,
            ease: 'back.out(1.2)',
            clearProps: 'transform'
        });
    });
}

/*
    Animação para notificações e alertas.
    Efeito de slide-in da direita com bounce suave.
*/
function animarEntradaNotificacoes() {
    if (typeof gsap === 'undefined') return;

    gsap.utils.toArray('.notification-card, .activity-item').forEach((item, index) => {
        gsap.from(item, {
            opacity: 0,
            x: 100,
            duration: 0.4,
            delay: index * 0.06,
            ease: 'power2.out',
            clearProps: 'transform'
        });
    });
}

/*
    Inicializa todas as animações quando o DOM estiver pronto.
*/
document.addEventListener('DOMContentLoaded', () => {
    // Inicia o fundo animado
    inicializarFundoAnimado();
    
    // Animações específicas por tela
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('screen') && target.classList.contains('active')) {
                    // Animação de entrada da tela
                    animarTransicaoTela(target.id);
                    
                    // Animações específicas baseadas no ID da tela
                    setTimeout(() => {
                        switch(target.id) {
                            case 'livrosScreen':
                            case 'acervoDigitalScreen':
                                animarEntradaCards();
                                break;
                            case 'alugueisScreen':
                            case 'historicoScreen':
                                animarEntradaTabela();
                                break;
                            case 'notificacoesScreen':
                                animarEntradaNotificacoes();
                                break;
                        }
                    }, 100);
                }
            }
        });
    });
    
    // Observa todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
        observer.observe(screen, { attributes: true });
    });
});

/*
    Redimensiona o canvas quando a janela muda
*/
window.addEventListener('resize', () => {
    const canvas = document.getElementById('threeCanvas');
    if (canvas) {
        // As posições percentuais dos emojis se ajustam automaticamente
    }
});
