// Gerador de textura de estrela para as partículas
function criarTexturaEstrela() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(64, 4); 
    ctx.quadraticCurveTo(64, 64, 124, 64); 
    ctx.quadraticCurveTo(64, 64, 64, 124); 
    ctx.quadraticCurveTo(64, 64, 4, 64); 
    ctx.quadraticCurveTo(64, 64, 64, 4); 
    ctx.fill();
    
    return new THREE.CanvasTexture(canvas);
}

// Inicializa o fundo 3D com Three.js
function inicializarFundo3D() {
    const canvas = document.getElementById('threeCanvas');
    if (!canvas || typeof THREE === 'undefined') {
        return;
    }

    const cena = new THREE.Scene();
    cena.background = null; 
    
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Grupo para conter todas as partículas (efeito de poeira dourada)
    const grupoParticulas = new THREE.Group();
    const texturaEstrela = criarTexturaEstrela();
    const temaEhClaro = document.documentElement.getAttribute('data-theme') === 'light';

    // Configurações das camadas de partículas
    const camadas = [
        { total: 1200, tamClaro: 0.04, tamEscuro: 0.02 }, 
        { total: 1100, tamClaro: 0.06, tamEscuro: 0.035 }, 
        { total: 1200, tamClaro: 0.08, tamEscuro: 0.055 }  
    ];

    const materiais = [];

    camadas.forEach(camada => {
        const geometria = new THREE.BufferGeometry();
        const posArray = new Float32Array(camada.total * 3);
        
        for(let i = 0; i < camada.total * 3; i += 3) {
            posArray[i]   = (Math.random() - 0.5) * 14;      
            posArray[i+1] = (Math.random() - 0.5) * 12;      
            posArray[i+2] = (Math.random() - 0.5) * 6 - 2;   
        }
        
        geometria.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const material = new THREE.PointsMaterial({
            size: temaEhClaro ? camada.tamClaro : camada.tamEscuro,
            color: temaEhClaro ? 0x0D6EFD : 0xD4AF37,
            transparent: true,
            opacity: temaEhClaro ? 0.85 : 0.6,
            map: texturaEstrela,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        materiais.push({ mat: material, camada: camada });
        const mesh = new THREE.Points(geometria, material);
        grupoParticulas.add(mesh);
    });

    cena.add(grupoParticulas);
    
    // Observador para atualizar cores do fundo quando o tema mudar
    const observadorTema = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                const ehClaro = document.documentElement.getAttribute('data-theme') === 'light';
                materiais.forEach(m => {
                    const novaCor = ehClaro ? 0x0D6EFD : 0xD4AF37;
                    const novaOpacidade = ehClaro ? 0.85 : 0.6;
                    const novoTamanho = ehClaro ? m.camada.tamClaro : m.camada.tamEscuro;
                    
                    m.mat.color.setHex(novaCor);
                    m.mat.opacity = novaOpacidade;
                    m.mat.size = novoTamanho;
                    m.mat.needsUpdate = true;
                });
            }
        });
    });
    
    observadorTema.observe(document.documentElement, { attributes: true });

    // Interação com mouse removido para estabilidade do fundo
    const relogio = new THREE.Clock();

    function animar() {
        requestAnimationFrame(animar);
        const tempoDecorrido = relogio.getElapsedTime();

        // Rotação cinematográfica lenta (velocidade reduzida para maior calma)
        grupoParticulas.rotation.y = tempoDecorrido * 0.01;
        grupoParticulas.rotation.x = tempoDecorrido * 0.01;

        renderer.render(cena, camera);
    }
    
    animar();

    // Redimensionamento responsivo
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Animação de transição entre telas usando GSAP
function animarTransicaoTela(idTela) {
    if (typeof gsap === 'undefined') {
        return;
    }

    const elementoTela = document.getElementById(idTela);
    if (!elementoTela) {
        return;
    }

    // Mata animações anteriores para evitar conflitos
    gsap.killTweensOf(elementoTela);
    
    // Entrada principal do container
    gsap.fromTo(elementoTela, 
        { opacity: 0, scale: 0.98, y: 15 },
        { duration: 0.5, opacity: 1, scale: 1, y: 0, ease: "power2.out", clearProps: "all" }
    );

    // Efeito de surgimento escalonado para cartões e elementos internos
    const elementosUI = elementoTela.querySelectorAll('.auth-card, .menu-card, .stats-chart-card, .quiz-age-card, .perfil-info');
    
    if (elementosUI.length > 0) {
        gsap.fromTo(elementosUI, 
            { opacity: 0, y: 50, rotationX: 10 }, 
            { duration: 0.9, opacity: 1, y: 0, rotationX: 0, stagger: 0.08, ease: "back.out(1.2)", delay: 0.1 }
        );
        
        // Tilt interativo desativado para estabilidade visual
    }
}

// Animação de entrada das linhas de tabelas
function animarLinhasTabela(idTbody) {
    if (typeof gsap === 'undefined') {
        return;
    }
    
    const tbody = document.getElementById(idTbody);
    if (!tbody) {
        return;
    }

    const linhas = tbody.querySelectorAll('tr:not(.loading-row)');
    if (linhas.length > 0) {
        gsap.fromTo(linhas,
            { opacity: 0, x: -15 },
            { duration: 0.4, opacity: 1, x: 0, stagger: 0.03, ease: "power2.out", clearProps: "all" }
        );
    }
}

// Inicializa o fundo ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    inicializarFundo3D();
});
