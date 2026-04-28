// Gerador de textura de estrela para as partículas
function criarTexturaEstrela() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Aplicar blur leve para manter nitidez
    ctx.filter = 'blur(2px)';
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(64, 4); 
    ctx.quadraticCurveTo(64, 64, 124, 64); 
    ctx.quadraticCurveTo(64, 64, 64, 124); 
    ctx.quadraticCurveTo(64, 64, 4, 64); 
    ctx.quadraticCurveTo(64, 64, 64, 4); 
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Gerador de textura de patinha de gato
function criarTexturaPatinha() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    // Desenho simplificado de patinha (almofada central + 4 dedos)
    // Almofada central
    ctx.beginPath();
    ctx.ellipse(64, 80, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dedos
    ctx.beginPath();
    ctx.ellipse(35, 45, 10, 15, -0.4, 0, Math.PI * 2); // Esquerdo
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(55, 30, 10, 15, -0.1, 0, Math.PI * 2); // Meio-esq
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(75, 30, 10, 15, 0.1, 0, Math.PI * 2);  // Meio-dir
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(95, 45, 10, 15, 0.4, 0, Math.PI * 2);  // Direito
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
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

    // Configurações das camadas de partículas (Quantidade reduzida para elegância)
    // Configurações unificadas para consistência entre temas
    const camadas = [
        { total: 200, size: 0.15, opacity: 0.7 }, 
        { total: 150, size: 0.25, opacity: 0.8 }, 
        { total: 100, size: 0.40, opacity: 0.9 }  
    ];

    const materiais = [];

    // Adiciona as estrelas normais
    camadas.forEach(camada => {
        const geometria = new THREE.BufferGeometry();
        const posArray = new Float32Array(camada.total * 3);
        
        for(let i = 0; i < camada.total * 3; i += 3) {
            posArray[i]   = (Math.random() - 0.5) * 45;      
            posArray[i+1] = (Math.random() - 0.5) * 35;      
            posArray[i+2] = (Math.random() - 0.5) * 30 - 10;   
        }
        
        geometria.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const material = new THREE.PointsMaterial({
            size: camada.size,
            color: temaEhClaro ? 0x2D6A4F : 0xD4AF37,
            transparent: true,
            opacity: camada.opacity, 
            map: texturaEstrela,
            depthWrite: false,
            blending: temaEhClaro ? THREE.NormalBlending : THREE.AdditiveBlending,
            sizeAttenuation: true 
        });
        
        materiais.push({ mat: material, camada: camada });
        const mesh = new THREE.Points(geometria, material);
        grupoParticulas.add(mesh);
    });

    // Adiciona as patinhas espaciais (poucas e sutis)
    const texturaPatinha = criarTexturaPatinha();
    const geoPatinhas = new THREE.BufferGeometry();
    const posPatinhas = new Float32Array(40 * 3);
    for(let i = 0; i < 40 * 3; i += 3) {
        posPatinhas[i]   = (Math.random() - 0.5) * 40;
        posPatinhas[i+1] = (Math.random() - 0.5) * 30;
        posPatinhas[i+2] = (Math.random() - 0.5) * 20 - 5;
    }
    geoPatinhas.setAttribute('position', new THREE.BufferAttribute(posPatinhas, 3));
    const matPatinhas = new THREE.PointsMaterial({
        size: 0.8,
        color: temaEhClaro ? 0x2D6A4F : 0xD4AF37,
        transparent: true,
        opacity: 0.4,
        map: texturaPatinha,
        depthWrite: false,
        blending: temaEhClaro ? THREE.NormalBlending : THREE.AdditiveBlending
    });
    materiais.push({ mat: matPatinhas, camada: { size: 0.8 } });
    const meshPatinhas = new THREE.Points(geoPatinhas, matPatinhas);
    grupoParticulas.add(meshPatinhas);

    cena.add(grupoParticulas);
    
    // Observador para atualizar cores do fundo quando o tema mudar
    const observadorTema = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                const ehClaro = document.documentElement.getAttribute('data-theme') === 'light';
                materiais.forEach(m => {
                    const novaCor = ehClaro ? 0x2D6A4F : 0xD4AF37;
                    const novoBlending = ehClaro ? THREE.NormalBlending : THREE.AdditiveBlending;
                    
                    m.mat.color.setHex(novaCor);
                    m.mat.blending = novoBlending;
                    m.mat.needsUpdate = true;
                });
            }
        });
    });
    
    observadorTema.observe(document.documentElement, { attributes: true });

    const relogio = new THREE.Clock();

    function animar() {
        requestAnimationFrame(animar);
        const tempoDecorrido = relogio.getElapsedTime();

        // Rotação de drift espacial orgânico
        grupoParticulas.rotation.y = tempoDecorrido * 0.006;
        grupoParticulas.rotation.x = tempoDecorrido * 0.004;

        // Micro-oscilação nas camadas para dar sensação de "vida" e profundidade dinâmica
        grupoParticulas.children.forEach((camada, i) => {
            camada.position.z = Math.sin(tempoDecorrido * 0.15 + i) * 1.5;
            camada.position.x = Math.cos(tempoDecorrido * 0.1 + i) * 0.8;
        });

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
