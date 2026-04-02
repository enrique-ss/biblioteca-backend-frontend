/* ============================================================
   ESPAÇO LITERÁRIO INFANTIL - Lógica Gamificada (Smart Backend)
   ============================================================ */

// Estado global do jogo infantil
let infantilState = {
    currentAge: null,
    currentCategory: null,
    currentLesson: null,
    userLevel: 1,
    userXP: 0,
    userHearts: 5,
    userEnergy: 100,
    completedLessons: new Set(),
    quizStep: 0,
    quizCorrect: 0
};

// Dados carregados do backend
let INFANTIL_BACKEND_DATA = null;

/**
 * Busca os dados do espaço literário no servidor
 */
async function fetchInfantilData() {
    try {
        const response = await api('/infantil/data');
        INFANTIL_BACKEND_DATA = response;
        console.log('✅ Dados do Espaço Literário carregados do backend.');
        return true;
    } catch (error) {
        console.error('❌ Erro ao buscar dados do Espaço Literário:', error);
        if (typeof exibirAlerta === 'function') {
            exibirAlerta('Erro ao carregar conteúdo pedagógico.', 'danger');
        }
        return false;
    }
}

/**
 * Utilitário para formatar texto com "Accent Words"
 * Transforma *palavra* em <span class="accent-word">palavra</span>
 */
function formatAccentText(text) {
    if (!text) return '';
    return text.replace(/\*([^*]+)\*/g, '<span class="accent-word">$1</span>');
}

/**
 * Seleciona a faixa etária e inicializa a jornada
 */
async function selectAge(age) {
    if (!INFANTIL_BACKEND_DATA) {
        const success = await fetchInfantilData();
        if (!success) return;
    }

    infantilState.currentAge = age;
    const data = INFANTIL_BACKEND_DATA[age];
    
    // Atualizar navbar
    const avatarEl = document.getElementById('infantil-avatar');
    if (avatarEl) avatarEl.textContent = data.avatar;
    
    const nameEl = document.getElementById('infantil-user-name');
    if (nameEl) nameEl.textContent = currentUser.nome.split(' ')[0]; // Apenas primeiro nome

    // Transição de telas
    document.getElementById('screen-age').classList.add('hidden');
    document.getElementById('content-after-age').classList.remove('hidden');
    
    showInfantilScreen('home');
    loadCategories();
}

/**
 * Inicializa ou Reinicia o Espaço Infantil
 */
async function initializeInfantilSpace() {
    // Resetar navegação
    infantilState.currentAge = null;
    infantilState.currentCategory = null;
    infantilState.currentLesson = null;
    
    document.getElementById('content-after-age').classList.add('hidden');
    document.getElementById('screen-age').classList.remove('hidden');
    
    document.querySelectorAll('.infantil-screen').forEach(screen => {
        screen.classList.add('hidden');
    });

    // Pré-carregamento dos dados se necessário
    if (!INFANTIL_BACKEND_DATA) {
        fetchInfantilData();
    }
}

function loadCategories() {
    const data = INFANTIL_BACKEND_DATA[infantilState.currentAge];
    const grid = document.getElementById('infantil-cat-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    data.categories.forEach(category => {
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.innerHTML = `
            <div style="font-size: 3.5rem; margin-bottom: 20px;">${category.icon}</div>
            <h3 style="color: ${category.color}; margin-bottom: 12px; font-family:'Cinzel', serif;">${category.name}</h3>
            <p style="opacity: 0.8; font-size: 0.9rem;">Explore este mundo literário e ganhe XP!</p>
        `;
        card.onclick = () => selectCategory(category);
        grid.appendChild(card);
    });
}

function selectCategory(category) {
    infantilState.currentCategory = category;
    const titleEl = document.getElementById('infantil-lesson-cat-title');
    if (titleEl) {
        titleEl.innerHTML = `<span style="margin-right:10px">${category.icon}</span> ${category.name}`;
    }
    showInfantilScreen('lessons');
    loadLessons();
}

function loadLessons() {
    const data = INFANTIL_BACKEND_DATA[infantilState.currentAge];
    const container = document.getElementById('infantil-lesson-list-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const lessons = data.lessons[infantilState.currentCategory.id] || [];
    
    lessons.forEach(lesson => {
        const isCompleted = infantilState.completedLessons.has(lesson.id);
        const isLocked = (lesson.requiredLevel || 1) > infantilState.userLevel;
        
        const card = document.createElement('div');
        card.className = `glass-card ${isLocked ? 'locked' : ''}`;
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 24px;">
                <div style="font-size: 2.2rem; background: var(--surface-2); padding: 12px; border-radius: 12px;">${lesson.icon}</div>
                <div style="flex: 1;">
                    <h4 style="margin-bottom: 5px; font-size: 1.1rem; color: var(--text);">${lesson.title}</h4>
                    <p style="opacity: 0.7; font-size: 0.85rem; font-weight: 600;">
                        ${isLocked ? `🔒 Bloqueado: Nível ${lesson.requiredLevel}` : 
                          isCompleted ? '⭐ Lição Concluída' : '📖 Ler Lição'}
                    </p>
                </div>
                ${isCompleted ? '<div style="font-size: 1.5rem; filter: saturate(1.5);">✅</div>' : ''}
            </div>
        `;
        
        if (!isLocked) {
            card.onclick = () => selectLesson(lesson);
        }
        
        container.appendChild(card);
    });
}

/**
 * Renderiza o conteúdo da lição no estilo MODERNO (Substitui listas por cards e accents)
 */
function selectLesson(lesson) {
    infantilState.currentLesson = lesson;
    const body = document.getElementById('infantil-content-body');
    if (!body) return;

    // Garante que animações anteriores sejam canceladas antes de injetar novo HTML
    if (window.gsap) {
        gsap.killTweensOf("#infantil-content-body *");
    }

    // Construção do HTML Moderno (V2 - Premium)
    let html = `
        <div class="lesson-content-modern">
            <header class="lesson-header-modern">
                <span class="lesson-icon-large">${lesson.icon}</span>
                <h2 class="lesson-title-modern">${lesson.title}</h2>
                ${lesson.meta ? `<span class="lesson-info-meta">${lesson.meta}</span>` : ''}
                <p class="lesson-description-modern">${formatAccentText(lesson.description)}</p>
            </header>
            
            ${lesson.highlights && lesson.highlights.length > 0 ? `
                <div class="lesson-highlights-grid">
                    ${lesson.highlights.map(h => `
                        <div class="lesson-highlight-card">
                            <div class="highlight-icon">${h.icon}</div>
                            <div class="highlight-content">
                                <h4>${h.title}</h4>
                                <p>${formatAccentText(h.text)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${lesson.funFact ? `
                <div class="lesson-fun-fact">
                    <div class="fun-fact-icon">💡</div>
                    <div class="fun-fact-content">
                        <h5>Você sabia?</h5>
                        <p>${formatAccentText(lesson.funFact)}</p>
                    </div>
                </div>
            ` : ''}

            <button class="btn btn-primary btn-action" onclick="startQuiz()">
                Estou Pronta/Pronto!
            </button>
        </div>
    `;

    body.innerHTML = html;
    showInfantilScreen('content');
    
    // Animações removidas para testes de visibilidade
}

function startQuiz() {
    if (!infantilState.currentLesson) return;
    
    infantilState.quizStep = 0;
    infantilState.quizCorrect = 0;
    showInfantilScreen('quiz');
    loadQuizQuestion();
}

function loadQuizQuestion() {
    const lesson = infantilState.currentLesson;
    const question = lesson.quiz[infantilState.quizStep];
    
    if (!question) {
        showQuizResult();
        return;
    }
    
    document.getElementById('infantil-quiz-question').textContent = question.q;
    document.getElementById('infantil-quiz-step-text').textContent = `${infantilState.quizStep + 1}/${lesson.quiz.length}`;
    
    const progress = ((infantilState.quizStep + 1) / lesson.quiz.length) * 100;
    document.getElementById('infantil-quiz-progress-bar').style.width = `${progress}%`;
    
    const optionsGrid = document.getElementById('infantil-quiz-options');
    optionsGrid.innerHTML = '';
    
    question.opts.forEach((option, index) => {
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--surface-2); display: flex; align-items: center; justify-content: center; font-weight: 800; font-family:'Cinzel', serif; border: 1px solid var(--border);">
                    ${String.fromCharCode(65 + index)}
                </div>
                <span style="font-weight: 500;">${option}</span>
            </div>
        `;
        card.onclick = () => selectQuizOption(index, card);
        optionsGrid.appendChild(card);
    });
}

function selectQuizOption(selectedIndex, cardElement) {
    const lesson = infantilState.currentLesson;
    const question = lesson.quiz[infantilState.quizStep];
    const isCorrect = selectedIndex === question.a;
    
    const allCards = document.querySelectorAll('#infantil-quiz-options .glass-card');
    allCards.forEach(card => {
        card.style.pointerEvents = 'none';
        if (card === cardElement) {
            card.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
    });
    
    if (!isCorrect) {
        infantilState.userHearts--;
        updateUI();
        
        if (infantilState.userHearts <= 0) {
            setTimeout(() => {
                showQuizResult(true); // Flag de game over por falta de vidas
            }, 1000);
            return;
        }
    }
    
    if (isCorrect) {
        infantilState.quizCorrect++;
    }
    
    setTimeout(() => {
        infantilState.quizStep++;
        loadQuizQuestion();
    }, 1800);
}

function showQuizResult(gameOverByHearts = false) {
    const lesson = infantilState.currentLesson;
    const percentage = (infantilState.quizCorrect / lesson.quiz.length) * 100;
    const passed = percentage >= 50 && !gameOverByHearts;
    
    let icon, title, desc, xpGain, hpGain;
    
    if (gameOverByHearts) {
        icon = '💔';
        title = 'Vidas Esgotadas!';
        desc = 'Você perdeu todas as suas vidas. Releia a lição com atenção e tente novamente para ganhar XP!';
        xpGain = 0;
        hpGain = 0;
    } else if (passed) {
        icon = '🎉';
        title = 'Excelente Trabalho!';
        desc = `Você acertou ${infantilState.quizCorrect} de ${lesson.quiz.length} perguntas e demonstrou ser um ótimo leitor!`;
        
        if (!infantilState.completedLessons.has(lesson.id)) {
            xpGain = 50; // Regra de negócio: 50 XP por lição nova
            hpGain = infantilState.quizCorrect === lesson.quiz.length ? 1 : 0;
            infantilState.completedLessons.add(lesson.id);
        } else {
            xpGain = 10; // Bônus por repetir
            hpGain = 0;
        }
    } else {
        icon = '📖';
        title = 'Quase lá!';
        desc = `Você acertou ${infantilState.quizCorrect} de ${lesson.quiz.length}. Releia a lição com atenção e tente novamente!`;
        xpGain = 0;
        hpGain = 0;
    }
    
    document.getElementById('infantil-result-icon').textContent = icon;
    document.getElementById('infantil-result-title').textContent = title;
    document.getElementById('infantil-result-desc').textContent = desc;
    document.getElementById('infantil-xp-gain').textContent = xpGain;
    document.getElementById('infantil-hp-gain').textContent = hpGain;
    
    if (passed) {
        infantilState.userXP += xpGain;
        infantilState.userHearts = Math.min(5, infantilState.userHearts + hpGain);
        
        const xpForNextLevel = infantilState.userLevel * 100;
        if (infantilState.userXP >= xpForNextLevel) {
            infantilState.userLevel++;
            infantilState.userXP = infantilState.userXP - xpForNextLevel;
            
            const levelUpBox = document.getElementById('infantil-level-up-box');
            const newLevelText = document.getElementById('infantil-new-level');
            if (levelUpBox) levelUpBox.classList.remove('hidden');
            if (newLevelText) newLevelText.textContent = `Nível ${infantilState.userLevel}`;
        } else {
            const levelUpBox = document.getElementById('infantil-level-up-box');
            if (levelUpBox) levelUpBox.classList.add('hidden');
        }
        
        updateUI();
    }
    
    showInfantilScreen('result');
}

function updateUI() {
    const levelEl = document.getElementById('infantil-user-level');
    const xpTextEl = document.getElementById('infantil-xp-text');
    const xpBarEl = document.getElementById('infantil-xp-bar');
    const livesEl = document.getElementById('infantil-lives');
    
    if (levelEl) levelEl.textContent = infantilState.userLevel;
    if (xpTextEl) xpTextEl.textContent = `${infantilState.userXP}/${infantilState.userLevel * 100}`;
    
    if (xpBarEl) {
        const xpPercentage = (infantilState.userXP / (infantilState.userLevel * 100)) * 100;
        xpBarEl.style.width = `${xpPercentage}%`;
    }
    
    if (livesEl) livesEl.textContent = infantilState.userHearts;
}

function changeAge() {
    initializeInfantilSpace();
}

function showInfantilScreen(screen) {
    document.querySelectorAll('.infantil-screen').forEach(s => s.classList.add('hidden'));
    
    const target = document.getElementById(`screen-${screen}-infantil`);
    if (target) {
        target.classList.remove('hidden');
        
        if (screen === 'home' && INFANTIL_BACKEND_DATA) {
            const data = INFANTIL_BACKEND_DATA[infantilState.currentAge];
            document.getElementById('infantil-hero-greeting').textContent = data.greeting;
        }
    }
}

// Inicialização e Persistência
document.addEventListener('DOMContentLoaded', () => {
    initializeInfantilSpace();
    
    const savedState = localStorage.getItem('infantilState');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        infantilState = { ...infantilState, ...parsed };
        infantilState.completedLessons = new Set(parsed.completedLessons || []);
    }
    
    updateUI();
    
    // Auto-save a cada 10 segundos
    setInterval(() => {
        const stateToSave = {
            ...infantilState,
            completedLessons: Array.from(infantilState.completedLessons)
        };
        localStorage.setItem('infantilState', JSON.stringify(stateToSave));
    }, 10000);
    
    // Regeneração de Vidas (1 a cada 6 horas)
    setInterval(() => {
        if (infantilState.userHearts < 5) {
            infantilState.userHearts++;
            updateUI();
        }
    }, 1000 * 60 * 60 * 6);
});
