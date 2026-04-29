/*
    FUNDO 3D E ANIMAÇÕES DE INTERFACE.
    Este arquivo é responsável por toda a camada visual animada do sistema:

    1. Fundo 3D com Three.js: partículas flutuantes em forma de estrela e patinha de gato
       que giram lentamente atrás de todo o conteúdo, criando profundidade e elegância.
    2. Animações de transição entre telas usando GSAP: efeito de entrada suave quando
       o usuário navega de uma seção para outra.
    3. Animação de entrada das linhas de tabela: cada linha aparece deslizando da esquerda.

    As partículas mudam de cor dourada (tema escuro) para verde (tema claro) automaticamente.
*/

/*
    Gera uma textura Canvas em forma de estrela de 4 pontas.
    O Canvas é desenhado usando curvas quadráticas (quadraticCurveTo)
    que criam a silhueta arredondada de uma estrela clássica.
    A textura é entregue ao Three.js para usar como sprite das partículas.
*/
function criarTexturaEstrela() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Blur leve para suavizar as bordas da estrela e torná-la mais etérea
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

/*
    Gera uma textura Canvas em forma de patinha de gato.
    Composta por: uma almofada central (elipse grande) e 4 dedos (elipses menores).
    Cada dedo tem leve rotação para parecer mais natural.
    É usada como sprite de partículas especiais espalhadas pelo fundo.
*/
function criarTexturaPatinha() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    // Almofada central: elipse larga na parte inferior
    ctx.beginPath();
    ctx.ellipse(64, 80, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // Quatro dedos dispostos em arco acima da almofada
    ctx.beginPath();
    ctx.ellipse(35, 45, 10, 15, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(55, 30, 10, 15, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(75, 30, 10, 15, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(95, 45, 10, 15, 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

/*
    Inicializa o fundo 3D animado usando a biblioteca Three.js.
    Cria uma cena com três camadas de estrelas (pequenas, médias e grandes)
    mais uma camada de patinhas sutis espalhadas pelo espaço.
    As partículas giram lentamente e oscilam para dar sensação de profundidade.
    Se Three.js não estiver carregado, a função sai silenciosamente.
*/
function inicializarFundo3D() {
    const canvas = document.getElementById('threeCanvas');
    if (!canvas || typeof THREE === 'undefined') {
        return;
    }

    const cena = new THREE.Scene();
    cena.background = null; // Fundo transparente para ver o CSS por baixo
    
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Limita o pixel ratio a 2 para não sobrecarregar GPUs de telas de alta resolução
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const grupoParticulas = new THREE.Group();
    const texturaEstrela = criarTexturaEstrela();
    const temaEhClaro = document.documentElement.getAttribute('data-theme') === 'light';

    /*
        Três camadas de estrelas com tamanhos e opacidades crescentes.
        A variação cria a ilusão de profundidade (estrelas menores = mais longe).
        Quantidade reduzida para manter a elegância sem poluir visualmente.
    */
    const camadas = [
        { total: 200, size: 0.15, opacity: 0.7 }, 
        { total: 150, size: 0.25, opacity: 0.8 }, 
        { total: 100, size: 0.40, opacity: 0.9 }  
    ];

    const materiais = [];

    camadas.forEach(camada => {
        const geometria = new THREE.BufferGeometry();
        const posArray = new Float32Array(camada.total * 3);
        
        for(let i = 0; i < camada.total * 3; i += 3) {
            posArray[i]   = (Math.random() - 0.5) * 45;     // eixo X: largura
            posArray[i+1] = (Math.random() - 0.5) * 35;     // eixo Y: altura
            posArray[i+2] = (Math.random() - 0.5) * 30 - 10; // eixo Z: profundidade
        }
        
        geometria.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const material = new THREE.PointsMaterial({
            size: camada.size,
            // Dourado no tema escuro, verde no tema claro
            color: temaEhClaro ? 0x2D6A4F : 0xD4AF37,
            transparent: true,
            opacity: camada.opacity, 
            map: texturaEstrela,
            depthWrite: false,
            // AdditiveBlending no escuro: as partículas brilham sobre si mesmas
            blending: temaEhClaro ? THREE.NormalBlending : THREE.AdditiveBlending,
            sizeAttenuation: true 
        });
        
        materiais.push({ mat: material, camada: camada });
        const mesh = new THREE.Points(geometria, material);
        grupoParticulas.add(mesh);
    });

    // Adiciona 40 patinhas espalhadas pelo fundo, mais sutis e maiores que as estrelas
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
    
    /*
        Observa mudanças no atributo data-theme do <html>.
        Quando o usuário alterna entre escuro e claro, atualiza a cor
        e o modo de mistura (blending) de todas as partículas em tempo real.
    */
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

    /*
        Loop de animação do Three.js.
        requestAnimationFrame garante que a animação rode em sincronia com
        a taxa de atualização da tela (60fps ou mais), sem desperdiçar processamento.
        O grupo gira lentamente (drift) e cada camada oscila levemente (profundidade).
    */
    function animar() {
        requestAnimationFrame(animar);
        const tempoDecorrido = relogio.getElapsedTime();

        // Rotação de drift: movimento suave e contínuo do conjunto de partículas
        grupoParticulas.rotation.y = tempoDecorrido * 0.006;
        grupoParticulas.rotation.x = tempoDecorrido * 0.004;

        // Micro-oscilação senoidal por camada: cria sensação de "respiração" e profundidade
        grupoParticulas.children.forEach((camada, i) => {
            camada.position.z = Math.sin(tempoDecorrido * 0.15 + i) * 1.5;
            camada.position.x = Math.cos(tempoDecorrido * 0.1 + i) * 0.8;
        });

        renderer.render(cena, camera);
    }
    
    animar();

    // Atualiza tamanho do canvas e proporção da câmera quando a janela é redimensionada
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

/*
    Anima a entrada de uma tela usando GSAP.
    A tela começa levemente abaixo e transparente, e sobe ao lugar correto.
    Os cartões internos (auth-card, menu-card, etc.) aparecem com um pequeno
    atraso escalonado (stagger), criando um efeito de cascata visual.
    Se GSAP não estiver carregado, a função sai sem erro.
*/
function animarTransicaoTela(idTela) {
    if (typeof gsap === 'undefined') {
        return;
    }

    const elementoTela = document.getElementById(idTela);
    if (!elementoTela) {
        return;
    }

    // Cancela animações anteriores na mesma tela para evitar conflitos
    gsap.killTweensOf(elementoTela);
    
    // A tela sobe 15px e aparece com 0.5s de duração
    gsap.fromTo(elementoTela, 
        { opacity: 0, scale: 0.98, y: 15 },
        { duration: 0.5, opacity: 1, scale: 1, y: 0, ease: "power2.out", clearProps: "all" }
    );

    const elementosUI = elementoTela.querySelectorAll('.auth-card, .menu-card, .stats-chart-card, .quiz-age-card, .perfil-info');
    
    if (elementosUI.length > 0) {
        // Cartões internos aparecem com efeito de mola (back.out) e atraso de 80ms entre cada um
        gsap.fromTo(elementosUI, 
            { opacity: 0, y: 50, rotationX: 10 }, 
            { duration: 0.9, opacity: 1, y: 0, rotationX: 0, stagger: 0.08, ease: "back.out(1.2)", delay: 0.1 }
        );
    }
}

/*
    Anima a entrada das linhas de uma tabela após o carregamento dos dados.
    Cada linha desliza da esquerda com um atraso de 30ms entre elas,
    dando a sensação de que os dados estão "chegando" progressivamente.
    Linhas de carregamento (loading-row) são ignoradas.
*/
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

/*
    Inicia o fundo 3D assim que o HTML termina de carregar.
    DOMContentLoaded garante que o elemento <canvas> já existe no DOM
    antes de tentar acessá-lo.
*/
window.addEventListener('DOMContentLoaded', () => {
    inicializarFundo3D();
});
