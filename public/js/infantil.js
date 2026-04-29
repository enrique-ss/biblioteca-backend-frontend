/*
    ESPÁÇO LITERÁRIO INFANTIL: sistema gamificado de aprendizado.
    Funciona como um mini-RPG educacional inspirado no Duolingo:
    - O usuário escolhe uma faixa etária (3-5, 6-8 ou 9-12 anos)
    - Navega por categorias de conteúdo (ex: animais, natureza, história)
    - Lê lições com destaques e curiosidades
    - Responde a um quiz de múltipla escolha validado pelo servidor
    - Ganha XP e sobe de nível; perde corações por erros

    Todo o conteúdo pedagógico vem do servidor (/infantil/data).
    A validação das respostas também é feita no servidor,
    impedindo que o usuário trapaceie inspecionando o código do navegador.
*/

/*
    Estado global do espaço infantil.
    Mantém em memória tudo que o usuário está fazendo neste momento:
    faixa etária, categoria, lição atual, progresso do quiz e pontuação.
*/
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

// Cache dos dados pedagógicos retornados pelo servidor
let INFANTIL_BACKEND_DATA = null;

/*
    Busca do servidor todos os dados pedagógicos e o perfil do usuário.
    Só executa se o usuário estiver autenticado (token presente).
    Após carregar, sincroniza o estado local (XP, nível, vidas, lições concluídas)
    para continuar de onde o usuário parou na última visita.
*/
async function fetchInfantilData() {
    if (!token) return false;
    
    try {
        const response = await api('/infantil/data');
        INFANTIL_BACKEND_DATA = response.infantil;
        
        // Sincroniza estado inicial
        if (response.userProfile) {
            infantilState.userXP = response.userProfile.xp;
            infantilState.userLevel = response.userProfile.level;
            infantilState.userHearts = response.userProfile.hearts;
            infantilState.xpPercentage = response.userProfile.xpPercentage;
            infantilState.completedLessons = new Set(response.userProfile.completedLessons || []);
            updateUI();
        }
        
        console.log('✅ Dados do Espaço Literário carregados (Smart Backend).');
        return true;
    } catch (error) {
        console.error('❌ Erro ao buscar dados do Espaço Literário:', error);
        if (typeof exibirAlerta === 'function') {
            exibirAlerta(error.message || 'Erro ao carregar conteúdo pedagógico.', 'danger');
        }
        return false;
    }
}

/*
    Formata o texto de descrição de lições substituindo palavras entre *asteriscos*
    por <span class="accent-word"> para destacá-las visualmente.
    Exemplo: "*Monteiro Lobato* criou o Sítio" → destaca o nome do autor.
*/
function formatAccentText(text) {
    if (!text) return '';
    return text.replace(/\*([^*]+)\*/g, '<span class="accent-word">$1</span>');
}

/*
    Salva a faixa etária escolhida e navega para a tela de categorias.
    Se os dados do servidor ainda não foram carregados, busca-os primeiro.
    Atualiza o avatar e o primeiro nome do usuário na navbar do espaço infantil.
*/
async function selectAge(age) {
    if (!INFANTIL_BACKEND_DATA) {
        const success = await fetchInfantilData();
        if (!success) return;
    }

    infantilState.currentAge = age;
    const data = INFANTIL_BACKEND_DATA[age];
    
    // Atualiza navbar
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

/*
    Reinicia o espaço infantil voltando à tela de seleção de faixa etária.
    Limpa a navegação atual para que o usuário possa recomeduçar do zero.
    Chamada ao entrar no espaço ou ao clicar em "Mudar Faixa Etária".
*/
async function initializeInfantilSpace() {
    // Reseta navegação
    infantilState.currentAge = null;
    infantilState.currentCategory = null;
    infantilState.currentLesson = null;
    
    document.getElementById('content-after-age').classList.add('hidden');
    document.getElementById('screen-age').classList.remove('hidden');
    
    document.querySelectorAll('.infantil-screen').forEach(screen => {
        screen.classList.add('hidden');
    });
}

/*
    Renderiza os cards de categorias disponíveis para a faixa etária selecionada.
    Cada card exibe ícone, nome e uma descrição motivacional.
    Ao clicar, navega para a lista de lições da categoria.
*/
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

/*
    Salva a categoria escolhida no estado e navega para a tela de lições.
    O título da tela é atualizado com ícone e nome da categoria.
*/
function selectCategory(category) {
    infantilState.currentCategory = category;
    const titleEl = document.getElementById('infantil-lesson-cat-title');
    if (titleEl) {
        titleEl.innerHTML = `<span style="margin-right:10px">${category.icon}</span> ${category.name}`;
    }
    showInfantilScreen('lessons');
    loadLessons();
}

/*
    Renderiza a lista de lições da categoria atual.
    Lições que exigem um nível maior que o do usuário aparecem bloqueadas (locked).
    Lições concluídas exibem um ✅ e o texto "Lição Concluída".
*/
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

/*
    Exibe o conteúdo completo de uma lição:
    - Cabeçalho com ícone e título
    - Descrição principal com palavras em destaque
    - Grid de destaques (highlights) com ícones e textos breves
    - Caixa "Você sabia?" (funFact) se disponível
    - Botão para iniciar o quiz
*/
function selectLesson(lesson) {
    infantilState.currentLesson = lesson;
    const body = document.getElementById('infantil-content-body');
    if (!body) return;

    // Cancela animações anteriores
    if (window.gsap) {
        gsap.killTweensOf("#infantil-content-body *");
    }

    // Constrói HTML
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
    
    // Animações removidas
}

/*
    Inicia o quiz da lição atual.
    Reseta o passo e o contador de acertos antes de exibir a primeira questão.
*/
function startQuiz() {
    if (!infantilState.currentLesson) return;
    
    infantilState.quizStep = 0;
    infantilState.quizCorrect = 0;
    showInfantilScreen('quiz');
    loadQuizQuestion();
}

/*
    Carrega e exibe a questão atual do quiz.
    Atualiza a barra de progresso e o contador (ex: "2/5").
    Cada opção é um card clicavel com letra identificadora (A, B, C...).
    Quando não há mais questões, chama showQuizResult.
*/
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

/*
    Envia a resposta escolhida ao servidor para validação.
    A validação no servidor (e não no browser) garante a integridade do jogo:
    nenhum usuário pode trapacear inspecionando o HTML.
    Bloqueia os demais cards durante a validação para evitar cliques duplos.
    Se errar: remove uma vida. Se perder todas (gameOver): mostra resultado imediatamente.
    Se acertar ou ainda ter vidas: avança para a próxima questão após 1,8s.
*/
async function selectQuizOption(selectedIndex, cardElement) {
    const lesson = infantilState.currentLesson;
    
    try {
        // Bloqueia novas seleções
        const allCards = document.querySelectorAll('#infantil-quiz-options .glass-card');
        allCards.forEach(card => card.style.pointerEvents = 'none');

        // Pergunta ao servidor
        const result = await api('/infantil/validate-answer', {
            method: 'POST',
            body: JSON.stringify({
                lessonId: lesson.id,
                questionIndex: infantilState.quizStep,
                selectedIndex: selectedIndex
            })
        });

        const isCorrect = result.isCorrect;
        cardElement.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        // Atualiza vidas
        infantilState.userHearts = result.hearts;
        updateUI();

        if (isCorrect) {
            infantilState.quizCorrect++;
        }

        if (result.gameOver) {
            setTimeout(() => showQuizResult(true), 1500);
            return;
        }

        setTimeout(() => {
            infantilState.quizStep++;
            loadQuizQuestion();
        }, 1800);

    } catch (error) {
        console.error('❌ Erro ao validar resposta:', error);
        exibirAlerta(error.message || 'Erro ao validar resposta no servidor.', 'danger');
    }
}

/*
    Finaliza o quiz e busca do servidor o resultado calculado.
    O servidor calcula XP ganho, corações recuperados e título de performance
    com base na porcentagem de acertos e no contexto do usuário.
    Após receber o resultado, atualiza o estado local e exibe a tela de recompensa.
*/
async function showQuizResult(gameOverByHearts = false) {
    const lesson = infantilState.currentLesson;

    try {
        const response = await api('/infantil/finish-quiz', {
            method: 'POST',
            body: JSON.stringify({
                lessonId: lesson.id,
                correctCount: infantilState.quizCorrect,
                totalQuestions: lesson.quiz.length,
                gameOverByHearts: gameOverByHearts
            })
        });

        const { result, userProfile } = response;

        // Renderiza resultado do servidor
        document.getElementById('infantil-result-icon').textContent = result.icon;
        document.getElementById('infantil-result-title').textContent = result.title;
        document.getElementById('infantil-result-desc').textContent = result.desc;
        document.getElementById('infantil-xp-gain').textContent = result.xpGain;
        document.getElementById('infantil-hp-gain').textContent = result.hpGain;

        // Atualiza estado local
        infantilState.userXP = userProfile.xp;
        infantilState.userLevel = userProfile.level;
        infantilState.userHearts = userProfile.hearts;
        
        if (result.xpGain > 0) {
            infantilState.completedLessons.add(lesson.id);
        }

        updateUI();
        showInfantilScreen('result');

    } catch (error) {
        console.error('❌ Erro ao finalizar quiz:', error);
        exibirAlerta(error.message || 'Erro ao processar recompensas.', 'danger');
    }
}

/*
    Persiste o progresso do usuário no banco de dados do servidor.
    Chamada após cada lição concluída e periodicamente para regeneração de vidas.
    O parâmetro completedLessonId marca a lição específica como concluída no servidor.
*/
async function syncProgress(completedLessonId = null) {
    try {
        await api('/infantil/save-progress', {
            method: 'POST',
            body: JSON.stringify({
                xp: infantilState.userXP,
                level: infantilState.userLevel,
                hearts: infantilState.userHearts,
                completedLessonId: completedLessonId
            })
        });
        console.log('☁️ Progresso sincronizado com o servidor.');
    } catch (error) {
        console.error('❌ Erro ao sincronizar progresso:', error);
    }
}

/*
    Atualiza os elementos visuais da navbar do espaço infantil:
    - Nível atual do usuário
    - XP atual vs. XP necessário para o próximo nível (barra de progresso)
    - Número de corações restantes
*/
function updateUI() {
    const levelEl = document.getElementById('infantil-user-level');
    const xpTextEl = document.getElementById('infantil-xp-text');
    const xpBarEl = document.getElementById('infantil-xp-bar');
    const livesEl = document.getElementById('infantil-lives');

    const level = infantilState.userLevel || 1;
    const xp = infantilState.userXP || 0;
    const nextLevelXP = level * 100;
    const percentage = Math.min(100, (xp / nextLevelXP) * 100);

    if (levelEl) levelEl.textContent = String(level);
    if (xpTextEl) xpTextEl.textContent = `${xp}/${nextLevelXP}`;

    if (xpBarEl) {
        xpBarEl.style.width = `${percentage}%`;
    }

    if (livesEl) livesEl.textContent = String(infantilState.userHearts);
}

// Volta para a seleção de faixa etária, reiniciando a navegação
function changeAge() {
    initializeInfantilSpace();
}

/*
    Oculta todas as telas do espaço infantil e exibe apenas a solicitada.
    Quando a tela é 'home', atualiza a saudacao com o texto vindo do servidor
    (personalizado por faixa etária, ex: "Olá, aventureiro!" para 6-8 anos).
*/
function showInfantilScreen(screen) {
    document.querySelectorAll('.infantil-screen').forEach(s => s.classList.add('hidden'));
    
    const target = document.getElementById(`screen-${screen}-infantil`);
    if (target) {
        target.classList.remove('hidden');
        
        if (screen === 'home' && INFANTIL_BACKEND_DATA) {
            const firstName = currentUser.nome ? currentUser.nome.split(' ')[0] : 'Leitor';
            document.getElementById('infantil-hero-greeting').innerHTML = `Olá, <span>${firstName}</span>!`;
        }
    }
}

/*
    Inicializa o espaço infantil ao carregar a página.
    Também configura a regeneração automática de corações:
    a cada 6 horas, se o usuário tiver menos de 5 vidas, recupera uma.
    O progresso atualizado é salvo no servidor automaticamente.
*/
document.addEventListener('DOMContentLoaded', () => {
    initializeInfantilSpace();
    
    // Regeneração de vidas
    setInterval(() => {
        if (infantilState.userHearts < 5) {
            infantilState.userHearts++;
            updateUI();
            // Regeneração simplificada no front
        api('/infantil/save-progress', {
            method: 'POST',
            body: JSON.stringify({
                hearts: infantilState.userHearts,
                xp: infantilState.userXP,
                level: infantilState.userLevel
            })
        }).catch(() => {});
        }
    }, 1000 * 60 * 60 * 6);
});
