/*
    ANIMAÇÕES DE TRANSIÇÃO E INTERFACE.
    Este arquivo é responsável pelas animações de entrada das telas e dos cards usando GSAP.
*/

/*
    Animação de entrada suave para telas usando GSAP.
*/
function animarTransicaoTela(id) {
    const tela = document.getElementById(id);
    if (!tela || typeof gsap === 'undefined') return;

    // Reset para estado inicial
    gsap.set(tela, {
        opacity: 0
    });

    // Animação de entrada
    gsap.to(tela, {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
        clearProps: 'all'
    });
}

/*
    Animação de entrada para linhas de tabela.
*/
function animarEntradaTabela() {
    if (typeof gsap === 'undefined') return;

    gsap.utils.toArray('tbody tr').forEach((linha, index) => {
        gsap.from(linha, {
            opacity: 0,
            x: -20,
            duration: 0.3,
            delay: index * 0.03,
            ease: 'power2.out',
            clearProps: 'all'
        });
    });
}

/*
    Animação para cards do acervo digital e físico.
*/
function animarEntradaCards() {
    if (typeof gsap === 'undefined') return;

    gsap.utils.toArray('.digital-card, .menu-card').forEach((card, index) => {
        gsap.from(card, {
            opacity: 0,
            y: 10,
            duration: 0.4,
            delay: index * 0.05,
            ease: 'power2.out',
            clearProps: 'all'
        });
    });
}

/*
    Animação para notificações e alertas.
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
