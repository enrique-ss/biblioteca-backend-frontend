/* ============================================================
   ESPAÇO LITERÁRIO INFANTIL - Lógica Gamificada
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

// Dados educativos por faixa etária
const INFANTIL_DATA = {
    infantil: {
        greeting: "Olá, Pequeno Leitor! 📚",
        banner: "🌸 Março é o Mês da Mulher: conheça escritoras incríveis!",
        avatar: "🌱",
        categories: [
            { id: 'contos', name: 'Contos e Fábulas', icon: '🐺', color: 'var(--accent)' },
            { id: 'poesia', name: 'Poesia', icon: '🎵', color: '#6a5ae0' },
            { id: 'classicos', name: 'Clássicos Infantis', icon: '📖', color: '#00d68f' },
            { id: 'escritoras', name: 'Escritoras do Brasil', icon: '✍️', color: 'var(--infantil-primary)' }
        ],
        lessons: {
            contos: [
                {
                    id: 'inf_c1', title: 'O que são Contos?', icon: '📜', requiredLevel: 1,
                    content: `<div style="font-size:3rem; margin-bottom:15px">📜</div><h3 style="font-family:'Cinzel',serif; color:var(--accent)">Contos: Histórias Curtas e Mágicas!</h3><div style="text-align:left;margin-top:15px"><p>Um conto é uma história curta com começo, meio e fim. São ótimas para ler de uma vez só!</p><h3>Partes de um conto:</h3><ul><li>🌅 Início: apresenta os personagens e o lugar</li><li>😮 Conflito: algo acontece e cria um problema</li><li>🎉 Desfecho: o problema é resolvido (ou não!)</li></ul><h3>Tipos de conto:</h3><ul><li>🐺 Contos de fadas: com magia e encantamento</li><li>🦊 Fábulas: com animais que ensinam uma lição</li><li>👻 Contos de assombração: cheios de mistério</li></ul></div>`,
                    quiz: [
                        { q: "O que é um conto?", opts: ["Um livro enorme", "Uma história curta com começo, meio e fim", "Uma música", "Um poema longo"], a: 1 },
                        { q: "O que é uma fábula?", opts: ["Uma história sem fim", "Um conto com animais que ensinam uma lição", "Um poema de amor", "Um livro de receitas"], a: 1 },
                        { q: "Qual é a parte do conto em que o problema é resolvido?", opts: ["O início", "O conflito", "O desfecho", "O título"], a: 2 }
                    ]
                },
                {
                    id: 'inf_c2', title: 'Fábulas de Esopo', icon: '🦊', requiredLevel: 2,
                    content: `<div style="font-size:3rem; margin-bottom:15px">🦊</div><h3 style="font-family:'Cinzel',serif; color:var(--accent)">Esopo: O Pai das Fábulas</h3><div style="text-align:left;margin-top:15px"><div style="background: rgba(106, 90, 224, 0.1); padding: 15px; border-radius: 10px; margin: 15px 0;"><strong>Esopo (séc. VI a.C.: Grécia Antiga)</strong></div><p>Esopo foi um escravo grego que criou histórias com animais para ensinar lições de vida. Suas fábulas são contadas até hoje!</p><h3>Fábulas famosas:</h3><ul><li>🐢 A Lebre e a Tartaruga: devagar se vai longe</li><li>🍇 A Raposa e as Uvas: quem não pode, diz que não quer</li><li>🐺 O Pastorzinho Mentiroso: quem mente perde a confiança</li><li>🐜 A Cigarra e a Formiga: trabalhe hoje para amanhã</li></ul></div>`,
                    quiz: [
                        { q: "Quem foi Esopo?", opts: ["Um rei grego", "Um escravo grego que criou fábulas", "Um guerreiro romano", "Um deus grego"], a: 1 },
                        { q: "Qual é a lição da fábula 'A Lebre e a Tartaruga'?", opts: ["Que lebres são melhores", "Que devagar se vai longe", "Que tartarugas são rápidas", "Que corridas são divertidas"], a: 1 },
                        { q: "O que é a moral de uma fábula?", opts: ["O nome dos personagens", "A lição de vida que a história ensina", "O lugar onde passa", "O título do livro"], a: 1 }
                    ]
                }
            ],
            poesia: [
                {
                    id: 'inf_p1', title: 'O que é Poesia?', icon: '🎵', requiredLevel: 1,
                    content: `<div style="font-size:3rem; margin-bottom:15px">🎵</div><h3 style="font-family:'Cinzel',serif; color:var(--accent)">Poesia: Palavras que Cantam!</h3><div style="text-align:left;margin-top:15px"><p>A poesia é uma forma de escrever usando palavras que soam bonitas, com ritmo e rima!</p><h3>Elementos da poesia:</h3><ul><li>🎶 Ritmo: o "balanço" das palavras, como uma música</li><li>🔤 Rima: quando palavras terminam com o mesmo som</li><li>📝 Verso: cada linha do poema</li><li>📖 Estrofe: um grupo de versos</li></ul><h3>Exemplo de rima:</h3><ul><li>"O gato subiu no telhado / e ficou todo molhado"</li></ul></div>`,
                    quiz: [
                        { q: "O que é uma rima na poesia?", opts: ["Um erro de escrita", "Quando palavras terminam com o mesmo som", "Um tipo de pontuação", "Uma cor"], a: 1 },
                        { q: "O que chamamos de 'verso' em um poema?", opts: ["O título", "Cada linha do poema", "O autor", "A moral"], a: 1 },
                        { q: "O ritmo na poesia é parecido com:", opts: ["Uma receita", "Uma música", "Um mapa", "Uma equação"], a: 1 }
                    ]
                }
            ],
            classicos: [
                {
                    id: 'inf_cl1', title: 'Contos de Hans Christian Andersen', icon: '❄️', requiredLevel: 1,
                    content: `<div style="font-size:3rem; margin-bottom:15px">❄️</div><h3 style="font-family:'Cinzel',serif; color:var(--accent)">Andersen: O Contador de Histórias Tristes e Mágicas</h3><div style="text-align:left;margin-top:15px"><div style="background: rgba(0, 214, 143, 0.1); padding: 15px; border-radius: 10px; margin: 15px 0;"><strong>Hans Christian Andersen (1805–1875): Dinamarca</strong></div><p>Hans Christian Andersen foi um escritor dinamarquês que criou contos mágicos e emocionantes lidos no mundo todo!</p><h3>Contos famosos:</h3><ul><li>❄️ A Rainha da Neve: aventura no gelo eterno</li><li>🦢 Os Cisnes Selvagens: amor e sacrifício</li><li>🌊 A Pequena Sereia: amor no fundo do mar</li><li>🎭 O Patinho Feio: quem parece diferente pode ser especial</li></ul></div>`,
                    quiz: [
                        { q: "De que país era Hans Christian Andersen?", opts: ["Brasil", "França", "Dinamarca", "Inglaterra"], a: 2 },
                        { q: "Qual é a lição do conto 'O Patinho Feio'?", opts: ["Que patos são maus", "Quem parece diferente pode ser especial", "Que cisnes são feios", "Que a aparência não muda"], a: 1 },
                        { q: "Qual personagem vive no fundo do mar nos contos de Andersen?", opts: ["A Rainha da Neve", "O Patinho", "A Pequena Sereia", "Cinderela"], a: 2 }
                    ]
                }
            ],
            escritoras: [
                {
                    id: 'inf_e1', title: 'Cora Coralina', icon: '🌸', requiredLevel: 1,
                    content: `<div style="font-size:3rem; margin-bottom:15px">🌸</div><h3 style="font-family:'Cinzel',serif; color:var(--accent)">Cora Coralina: A Poetisa dos Becos</h3><div style="text-align:left;margin-top:15px"><div style="background: rgba(255, 82, 99, 0.1); padding: 15px; border-radius: 10px; margin: 15px 0;"><strong>Cora Coralina (1889–1985): Goiás, Brasil</strong></div><p>Cora Coralina foi uma escritora e poetisa brasileira que nasceu em Goiás. Ela escrevia desde jovem, mas só publicou seu primeiro livro aos 76 anos!</p><h3>O que ela nos ensina:</h3><ul><li>Nunca é tarde para realizar seus sonhos</li><li>A vida simples tem muita poesia</li><li>Escrevia sobre mulheres, crianças e o cotidiano</li><li>Sua cidade natal, Goiás Velho, inspirava seus becos e histórias</li></ul></div>`,
                    quiz: [
                        { q: "Onde Cora Coralina nasceu?", opts: ["São Paulo", "Goiás", "Rio de Janeiro", "Bahia"], a: 1 },
                        { q: "Com quantos anos ela publicou seu primeiro livro?", opts: ["Com 10 anos", "Com 20 anos", "Aos 76 anos", "Nunca publicou"], a: 2 },
                        { q: "O que mais inspirava Cora Coralina?", opts: ["Grandes cidades", "O cotidiano e sua cidade natal", "Viagens internacionais", "Histórias de reis"], a: 1 }
                    ]
                }
            ]
        }
    },
    infantojuvenil: {
        greeting: "Olá, Grande Leitor! 📚",
        banner: "🌟 Explore autores incríveis e descubra novos mundos!",
        avatar: "🚀",
        categories: [
            { id: 'contos', name: 'Contos Brasileiros', icon: '🏜️', color: 'var(--accent)' },
            { id: 'poesia', name: 'Poesia Moderna', icon: '🎭', color: '#6a5ae0' },
            { id: 'classicos', name: 'Clássicos Universais', icon: '🌍', color: '#00d68f' },
            { id: 'escritoras', name: 'Mulheres na Literatura', icon: '✒️', color: 'var(--infantil-primary)' }
        ],
        lessons: {
            contos: [
                {
                    id: 'ij_c1', title: 'Contos Brasileiros', icon: '🏜️', requiredLevel: 1,
                    content: `<div style="font-size:3rem; margin-bottom:15px">🏜️</div><h3 style="font-family:'Cinzel',serif; color:var(--accent)">Contos que Falam do Brasil</h3><div style="text-align:left;margin-top:15px"><p>Os contos brasileiros misturam culturas indígenas, africanas e europeias para criar histórias uniques!</p><h3>Temas brasileiros:</h3><ul><li>🌳 Sertão e caatinga</li><li>🏖️ Praias e cidades litorâneas</li><li>🏙️ Vida urbana moderna</li><li>🌾 Cultura rural e tradições</li></ul></div>`,
                    quiz: [
                        { q: "O que torna os contos brasileiros especiais?", opts: ["Só falam de reis", "Misturam culturas indígenas, africanas e europeias", "São todos iguais", "Só falam de animais"], a: 1 },
                        { q: "Qual é um tema comum nos contos brasileiros?", opts: ["Castelos medievais", "Sertão e caatinga", "Ninjas", "Dragões"], a: 1 }
                    ]
                }
            ]
        }
    },
    preadolescente: {
        greeting: "Olá, Crítico Literário! 📚",
        banner: "🔭 Mergulhe fundo na teoria e na literatura mundial!",
        avatar: "🎓",
        categories: [
            { id: 'teoria', name: 'Teoria Literária', icon: '📖', color: 'var(--accent)' },
            { id: 'brasileira', name: 'Literatura Brasileira', icon: '🇧🇷', color: '#00d68f' },
            { id: 'mundial', name: 'Literatura Mundial', icon: '🌎', color: '#6a5ae0' },
            { id: 'contemporanea', name: 'Literatura Contemporânea', icon: '🚀', color: 'var(--infantil-primary)' }
        ],
        lessons: {
            teoria: [
                {
                    id: 'pa_t1', title: 'O que é Teoria Literária?', icon: '📖', requiredLevel: 1,
                    content: `<div style="font-size:3rem; margin-bottom:15px">📖</div><h3 style="font-family:'Cinzel',serif; color:var(--accent)">Teoria Literária: Entendendo a Literatura</h3><div style="text-align:left;margin-top:15px"><p>Teoria literária é o estudo dos princípios e métodos para analisar obras literárias.</p><h3>Principais abordagens:</h3><ul><li>📚 Estruturalismo: foco na estrutura do texto</li><li>👤 Psicanálise: análise dos personagens</li><li>🌍 Marxismo: contexto social e econômico</li><li>👩‍🦰 Feminismo: representação de gênero</li></ul></div>`,
                    quiz: [
                        { q: "O que é teoria literária?", opts: ["Só ler livros", "Estudo dos princípios para analisar obras", "Escrever poesia", "Fazer resumos"], a: 1 },
                        { q: "Qual abordagem foca na estrutura do texto?", opts: ["Psicanálise", "Estruturalismo", "Marxismo", "Feminismo"], a: 1 }
                    ]
                }
            ]
        }
    }
};

// Funções principais
function selectAge(age) {
    infantilState.currentAge = age;
    const data = INFANTIL_DATA[age];
    
    // Atualizar navbar
    const avatarEl = document.getElementById('infantil-avatar');
    if (avatarEl) avatarEl.textContent = data.avatar;
    
    // Esconder tela de seleção e mostrar conteúdo após idade
    document.getElementById('screen-age').classList.add('hidden');
    document.getElementById('content-after-age').classList.remove('hidden');
    
    // Mostrar tela inicial
    showInfantilScreen('home');
    
    // Carregar categorias
    loadCategories();
}

// Função para inicializar o espaço infantil
function initializeInfantilSpace() {
    // Resetar estado
    infantilState.currentAge = null;
    infantilState.currentCategory = null;
    infantilState.currentLesson = null;
    
    // Esconder conteúdo após idade
    document.getElementById('content-after-age').classList.add('hidden');
    
    // Mostrar apenas a tela de seleção de faixa etária
    document.getElementById('screen-age').classList.remove('hidden');
    
    // Esconder todas as telas infantis dentro do conteúdo
    document.querySelectorAll('.infantil-screen').forEach(screen => {
        screen.classList.add('hidden');
    });
}

function loadCategories() {
    const data = INFANTIL_DATA[infantilState.currentAge];
    const grid = document.getElementById('infantil-cat-grid');
    
    grid.innerHTML = '';
    
    data.categories.forEach(category => {
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 15px;">${category.icon}</div>
            <h3 style="color: ${category.color}; margin-bottom: 10px;">${category.name}</h3>
            <p style="opacity: 0.9;">Explore este mundo literário!</p>
        `;
        card.onclick = () => selectCategory(category);
        grid.appendChild(card);
    });
}

function selectCategory(category) {
    infantilState.currentCategory = category;
    document.getElementById('infantil-lesson-cat-title').innerHTML = `<span>${category.icon}</span> ${category.name}`;
    showInfantilScreen('lessons');
    loadLessons();
}

function loadLessons() {
    const data = INFANTIL_DATA[infantilState.currentAge];
    const container = document.getElementById('infantil-lesson-list-container');
    
    container.innerHTML = '';
    
    const lessons = data.lessons[infantilState.currentCategory.id] || [];
    
    lessons.forEach(lesson => {
        const isCompleted = infantilState.completedLessons.has(lesson.id);
        const isLocked = lesson.requiredLevel > infantilState.userLevel;
        
        const card = document.createElement('div');
        card.className = `glass-card ${isLocked ? 'locked' : ''}`;
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2rem;">${lesson.icon}</div>
                <div style="flex: 1;">
                    <h4 style="margin-bottom: 5px;">${lesson.title}</h4>
                    <p style="opacity: 0.8; font-size: 0.9rem;">
                        ${isLocked ? `🔒 Nível ${lesson.requiredLevel} necessário` : 
                          isCompleted ? '✅ Concluído' : '📖 Disponível'}
                    </p>
                </div>
                ${isCompleted ? '<div style="font-size: 1.5rem;">⭐</div>' : ''}
            </div>
        `;
        
        if (!isLocked) {
            card.onclick = () => selectLesson(lesson);
        }
        
        container.appendChild(card);
    });
}

function selectLesson(lesson) {
    infantilState.currentLesson = lesson;
    document.getElementById('infantil-content-body').innerHTML = lesson.content;
    showInfantilScreen('content');
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
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 30px; height: 30px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-weight: bold;">
                    ${String.fromCharCode(65 + index)}
                </div>
                <span>${option}</span>
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
    
    // Desabilitar todos os cards
    const allCards = document.querySelectorAll('#infantil-quiz-options .glass-card');
    allCards.forEach(card => {
        card.style.pointerEvents = 'none';
        if (card === cardElement) {
            card.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
    });
    
    // Mostrar resposta correta
    if (!isCorrect) {
        allCards[question.a].classList.add('correct');
    }
    
    if (isCorrect) {
        infantilState.quizCorrect++;
    }
    
    // Próxima pergunta após 2 segundos
    setTimeout(() => {
        infantilState.quizStep++;
        loadQuizQuestion();
    }, 2000);
}

function showQuizResult() {
    const lesson = infantilState.currentLesson;
    const percentage = (infantilState.quizCorrect / lesson.quiz.length) * 100;
    const passed = percentage >= 50;
    
    let icon, title, desc, xpGain, hpGain;
    
    if (passed) {
        icon = '🎉';
        title = 'Parabéns!';
        desc = `Você acertou ${infantilState.quizCorrect} de ${lesson.quiz.length} perguntas!`;
        
        // Calcular recompensas (só na primeira conclusão)
        if (!infantilState.completedLessons.has(lesson.id)) {
            xpGain = 30 + (infantilState.quizCorrect * 10);
            hpGain = infantilState.quizCorrect >= 2 ? 1 : 0;
            
            infantilState.completedLessons.add(lesson.id);
            updateUserData(xpGain, hpGain);
        } else {
            xpGain = 0;
            hpGain = 0;
        }
    } else {
        icon = '📚';
        title = 'Continue Estudando!';
        desc = `Você acertou ${infantilState.quizCorrect} de ${lesson.quiz.length} perguntas. Tente novamente!`;
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
        
        // Verificar nível
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
        
        infantilState.completedLessons.add(lesson.id);
        updateUI();
    }
    
    showInfantilScreen('result');
}

function updateUserData(xpGain, hpGain) {
    // Esta função foi incorporada ao showQuizResult para simplificar o fluxo
}

function updateUI() {
    const levelEl = document.getElementById('infantil-user-level');
    const xpTextEl = document.getElementById('infantil-xp-text');
    const xpBarEl = document.getElementById('infantil-xp-bar');
    const livesEl = document.getElementById('infantil-lives');
    
    if (levelEl) levelEl.textContent = infantilState.userLevel;
    if (xpTextEl) xpTextEl.textContent = `${infantilState.userXP}/${infantilState.userLevel * 100} XP`;
    
    if (xpBarEl) {
        const xpPercentage = (infantilState.userXP / (infantilState.userLevel * 100)) * 100;
        xpBarEl.style.width = `${xpPercentage}%`;
    }
    
    if (livesEl) {
        livesEl.textContent = infantilState.userHearts;
    }
}

function changeAge() {
    initializeInfantilSpace();
}

function showInfantilScreen(screen) {
    // Esconder todas as telas infantis
    document.querySelectorAll('.infantil-screen').forEach(s => {
        s.classList.add('hidden');
    });
    
    // Mostrar tela solicitada
    document.getElementById(`screen-${screen}-infantil`).classList.remove('hidden');
    
    // Atualizar banner se for a tela home
    if (screen === 'home') {
        const data = INFANTIL_DATA[infantilState.currentAge];
        document.getElementById('infantil-hero-greeting').textContent = data.greeting;
        document.getElementById('infantil-march-banner-text').textContent = data.banner;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar o espaço infantil com todas as telas escondidas
    initializeInfantilSpace();
    
    // Carregar dados salvos (se existirem)
    const savedState = localStorage.getItem('infantilState');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        infantilState = { ...infantilState, ...parsed };
        infantilState.completedLessons = new Set(parsed.completedLessons || []);
    }
    
    updateUI();
    
    // Salvar estado periodicamente
    setInterval(() => {
        const stateToSave = {
            ...infantilState,
            completedLessons: Array.from(infantilState.completedLessons)
        };
        localStorage.setItem('infantilState', JSON.stringify(stateToSave));
    }, 5000);
    
    // Regenerar energia e vidas
    setInterval(() => {
        if (infantilState.userEnergy < 100) {
            infantilState.userEnergy = Math.min(100, infantilState.userEnergy + 1);
            updateUI();
        }
    }, 60000); // +1 energia por minuto
    
    setInterval(() => {
        if (infantilState.userHearts < 5) {
            infantilState.userHearts++;
            updateUI();
        }
    }, 3600000); // +1 vida por hora
});
