// ==========================================
// BACKGROUND 3D - PARTICLES (Three.js)
// ==========================================

function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(64, 4); // Top point
    ctx.quadraticCurveTo(64, 64, 124, 64); // Top to Right curve
    ctx.quadraticCurveTo(64, 64, 64, 124); // Right to Bottom curve
    ctx.quadraticCurveTo(64, 64, 4, 64); // Bottom to Left curve
    ctx.quadraticCurveTo(64, 64, 64, 4); // Left to Top curve
    ctx.fill();
    
    return new THREE.CanvasTexture(canvas);
}

function initThreeBG() {
    const canvas = document.getElementById('threeCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to let CSS body background show
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create particles (Golden Dust/Embers) to fit the Modern Vintage Library theme
    const particlesGroup = new THREE.Group();
    const starTexture = createStarTexture();
    const isLightInitial = document.documentElement.getAttribute('data-theme') === 'light';

    const layers = [
        { count: 1200, sizeLight: 0.04, sizeDark: 0.02 }, // Small background stars
        { count: 1100, sizeLight: 0.06, sizeDark: 0.035 }, // Medium midground stars
        { count: 1200, sizeLight: 0.08, sizeDark: 0.055 }  // Large foreground stars (Maximum size!)
    ];

    const materials = [];

    layers.forEach(layer => {
        const geo = new THREE.BufferGeometry();
        const posArray = new Float32Array(layer.count * 3);
        for(let i = 0; i < layer.count * 3; i += 3) {
            // Density optimization: pack them into the visible view frustum
            posArray[i]   = (Math.random() - 0.5) * 14;      // X (Width spreading)
            posArray[i+1] = (Math.random() - 0.5) * 12;      // Y (Height spreading)
            posArray[i+2] = (Math.random() - 0.5) * 6 - 2;   // Z (Depth, kept mostly from -5 to +1 to stay in front of the Z=5 camera)
        }
        geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const mat = new THREE.PointsMaterial({
            size: isLightInitial ? layer.sizeLight : layer.sizeDark,
            color: isLightInitial ? 0x0D6EFD : 0xD4AF37,
            transparent: true,
            opacity: isLightInitial ? 0.85 : 0.6,
            map: starTexture,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        materials.push({ mat, layer });
        const mesh = new THREE.Points(geo, mat);
        particlesGroup.add(mesh);
    });

    scene.add(particlesGroup);
    
    // Allow dynamic color updates on theme change
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'data-theme') {
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                materials.forEach(m => {
                    m.mat.color.setHex(isLight ? 0x0D6EFD : 0xD4AF37);
                    m.mat.opacity = isLight ? 0.85 : 0.6;
                    m.mat.size = isLight ? m.layer.sizeLight : m.layer.sizeDark;
                    m.mat.needsUpdate = true;
                });
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });

    // Mouse interaction removed for static background stability

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Slow cinematic rotation (reduced speed for more calmness)
        particlesGroup.rotation.y = elapsedTime * 0.01;
        particlesGroup.rotation.x = elapsedTime * 0.01;

        // Mouse interaction removed for static background stability

        renderer.render(scene, camera);
    }
    
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ==========================================
// UI ANIMATIONS (GSAP)
// ==========================================

// Global function to be called whenever a screen changes (replaces basic display toggle)
function animateScreenTransition(screenId) {
    if (typeof gsap === 'undefined') return;

    const screenEle = document.getElementById(screenId);
    if (!screenEle) return;

    // Reset previous animations to avoid conflicts
    gsap.killTweensOf(screenEle);
    
    // Main Container Entry
    gsap.fromTo(screenEle, 
        { opacity: 0, scale: 0.98, y: 15 },
        { duration: 0.5, opacity: 1, scale: 1, y: 0, ease: "power2.out", clearProps: "all" }
    );

    // Stagger inner grid/cards dynamically
    const uiElements = screenEle.querySelectorAll('.auth-card, .menu-card, .stats-chart-card, .quiz-age-card, .perfil-info');
    if (uiElements.length > 0) {
        gsap.fromTo(uiElements, 
            { opacity: 0, y: 50, rotationX: 10 }, 
            { duration: 0.9, opacity: 1, y: 0, rotationX: 0, stagger: 0.08, ease: "back.out(1.2)", delay: 0.1 }
        );
        
        // UI Tilt disabled for static stability
    }
}

function animateTableRows(tbodyId) {
    if (typeof gsap === 'undefined') return;
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr:not(.loading-row)');
    if (rows.length > 0) {
        gsap.fromTo(rows,
            { opacity: 0, x: -15 },
            { duration: 0.4, opacity: 1, x: 0, stagger: 0.03, ease: "power2.out", clearProps: "all" }
        );
    }
}

// Initialize environment
window.addEventListener('DOMContentLoaded', () => {
    initThreeBG();
});
