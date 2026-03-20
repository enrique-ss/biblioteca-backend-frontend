// ── QUIZ ──────────────────────────────────────────────────────────────────────

const QUIZ_XP_PER_LEVEL = [0,100,250,450,700,1000,1400,1850,2350,2900,3500];

let quizState = { ageGroup:null, xp:0, level:1, hp:5, currentCat:null, currentLesson:null, quizStep:0, correctCount:0, completedLessons:[] };
let quizData  = null;

const QUIZ_DATA = {
    infantil: { 
        greeting:'Infantil (6–8 anos)', 
        categories:[
            {id:'contos',name:'Contos e Fábulas',icon:'🐺',feminist:false},
            {id:'poesia',name:'Poesia',icon:'🎵',feminist:false},
            {id:'classicos',name:'Clássicos Infantis',icon:'📖',feminist:false},
            {id:'escritoras',name:'Escritoras do Brasil',icon:'✍️',feminist:true}
        ], 
        lessons: {
            contos:[
                {
                    id:'inf_c1',
                    title:'O que são Contos?',
                    icon:'📜',
                    req:1,
                    content:'<h1>📜</h1><h2>Contos: Histórias Curtas e Mágicas!</h2><p>Um conto é uma história curta com começo, meio e fim.</p><h3>Partes de um conto</h3><ul><li>🌅 Início: apresenta os personagens e o lugar</li><li>😮 Conflito: algo acontece e cria um problema</li><li>🎉 Desfecho: o problema é resolvido (ou não!)</li></ul><h3>Tipos de conto</h3><ul><li>🐺 Contos de fadas: com magia e encantamento</li><li>🦊 Fábulas: com animais que ensinam uma lição</li><li>👻 Contos de assombração: cheios de mistério</li></ul>',
                    quiz:[
                        {q:"O que é um conto?",opts:["Um livro enorme","Uma história curta com começo, meio e fim","Uma música","Um poema longo"],a:1},
                        {q:"O que é uma fábula?",opts:["Uma história sem fim","Um conto com animais que ensinam uma lição","Um poema de amor","Um livro de receitas"],a:1},
                        {q:"Qual é a parte onde o problema é resolvido?",opts:["O início","O conflito","O desfecho","O título"],a:2}
                    ]
                },
                {
                    id:'inf_c2',
                    title:'Fábulas de Esopo',
                    icon:'🦊',
                    req:2,
                    content:'<h1>🦊</h1><h2>Esopo: O Pai das Fábulas</h2><div class="quiz-author-box"><span class="quiz-author-name">Esopo (séc. VI a.C. — Grécia Antiga)</span></div><p>Esopo foi um escravo grego que criou histórias com animais para ensinar lições de vida.</p><h3>Fábulas famosas</h3><ul><li>🐢 A Lebre e a Tartaruga: devagar se vai longe</li><li>🍇 A Raposa e as Uvas: quem não pode, diz que não quer</li><li>🐺 O Pastorzinho Mentiroso: quem mente perde a confiança</li><li>🐜 A Cigarra e a Formiga: trabalhe hoje para amanhã</li></ul>',
                    quiz:[
                        {q:"Quem foi Esopo?",opts:["Um filósofo","Um poeta","Um escravo grego","Um imperador romano"],a:1},
                        {q:"O que as fábulas ensinam?",opts:["Nada","Como ser rico","Lições morais","Como cozinhar bem"],a:2}
                    ]
                }
            ]
        }
    },
    infantojuvenil: { 
        greeting:'Infanto-Juvenil (9–11 anos)', 
        categories:[
            {id:'generos',name:'Gêneros Literários',icon:'📚',feminist:false},
            {id:'autores',name:'Grandes Autores',icon:'🖊️',feminist:false},
            {id:'movimentos',name:'Movimentos Literários',icon:'🏛️',feminist:false},
            {id:'escritoras',name:'Literatura Feminina',icon:'✍️',feminist:true}
        ], 
        lessons: {
            generos:[
                {
                    id:'ij_g1',
                    title:'Prosa e Poesia',
                    icon:'📝',
                    req:1,
                    content:'<h1>📝</h1><h2>As Duas Grandes Formas da Literatura</h2><p>Toda literatura se divide em prosa e poesia.</p>',
                    quiz:[
                        {q:"Diferença entre prosa e poesia?",opts:["Nenhuma","Prosa é contínua; poesia é em versos","Prosa é mais curta","Poesia é mais antiga"],a:1},
                        {q:"Qual é um gênero em prosa?",opts:["Soneto","Romance","Haiku","Ode"],a:1},
                        {q:"O que caracteriza a poesia?",opts:["Rima obrigatória","Ritmo, versos e emoção concentrada","É sempre longa","Só trata de amor"],a:1}
                    ]
                },
                {
                    id:'ij_g2',
                    title:'Conto, Crônica e Romance',
                    icon:'📖',
                    req:2,
                    content:'<h1>📖</h1><h2>Subgêneros da Prosa</h2><h3>Conto</h3><ul><li>História curta, um único conflito</li></ul><h3>Crônica</h3><ul><li>Texto curto sobre o cotidiano</li></ul><h3>Romance</h3><ul><li>Narrativa longa e complexa</li></ul>',
                    quiz:[
                        {q:"Característica principal do conto?",opts:["É muito longo","Curto, único conflito central","Muitos personagens","Sempre humorístico"],a:1},
                        {q:"Onde é comum encontrar crônicas?",opts:["Enciclopédias","Jornais e revistas","Dicionários","Bulas"],a:1},
                        {q:"O que diferencia o romance?",opts:["É sempre bonito","Longo, muitos personagens e subtramas","Sempre sobre amor","Menos de 10 páginas"],a:1}
                    ]
                }
            ]
        }
    },
    preadolescente: { 
        greeting:'Pré-Adolescente (11–14 anos)', 
        categories:[
            {id:'teoria',name:'Teoria Literária',icon:'🔬',feminist:false},
            {id:'autores',name:'Cânone Brasileiro',icon:'🏛️',feminist:false},
            {id:'mundial',name:'Literatura Mundial',icon:'🌎',feminist:false},
            {id:'escritoras',name:'Literatura Feminista',icon:'✍️',feminist:true}
        ], 
        lessons: {
            teoria:[
                {
                    id:'pa_t1',
                    title:'Narrador e Ponto de Vista',
                    icon:'👁️',
                    req:1,
                    content:'<h1>👁️</h1><h2>Quem Conta a História?</h2><p>O narrador é a voz que conta a história.</p><h3>Tipos de narrador</h3><ul><li>🙋 1ª pessoa: participa da história</li><li>👤 3ª pessoa onisciente: sabe tudo</li><li>👀 3ª pessoa observador: só descreve</li></ul><p>O narrador NÃO é o autor!</p>',
                    quiz:[
                        {q:"Narrador em 1ª pessoa?",opts:["Quem escreveu o livro","A voz que diz 'eu' e participa","Personagem secundário","O vilão"],a:1},
                        {q:"Narrador onisciente?",opts:["Só vê de fora","Sabe tudo, inclusive pensamentos","Está dentro da história","Não sabe o futuro"],a:1},
                        {q:"Narrador e autor são a mesma pessoa?",opts:["Sim, sempre","Não: o autor cria o narrador como personagem","Às vezes","Só em poesia"],a:1}
                    ]
                },
                {
                    id:'pa_t2',
                    title:'Intertextualidade',
                    icon:'🕸️',
                    req:2,
                    content:'<h1>🕸️</h1><h2>Quando Textos Conversam Entre Si</h2><p>Intertextualidade é quando um texto referencia outro.</p>',
                    quiz:[
                        {q:"O que é intertextualidade?",opts:["Erro de escrita","Quando um texto dialoga com outro","Tipo de pontuação","Índice do livro"],a:1},
                        {q:"O que é paródia?",opts:["Cópia idêntica","Imitação para criticar ou fazer humor","Tradução","Resumo"],a:1},
                        {q:"Por que a intertextualidade é importante?",opts:["Não é","Mostra que a literatura é uma conversa entre autores","Serve para plagiar","Para enganar leitores"],a:1}
                    ]
                }
            ]
        }
    }
};

function quizInit() { quizState.ageGroup ? quizShowPanel('quizHome') : quizShowPanel('quizAgeSelect'); }

function quizShowPanel(id) {
    ['quizAgeSelect','quizHome','quizLessons','quizContent','quizQuestions','quizResult']
        .forEach(p => { const el = document.getElementById(p); if (el) el.style.display = 'none'; });
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
}

async function quizSelectAge(group) {
    quizState.ageGroup = group;
    quizData = QUIZ_DATA[group];
    try {
        const p = await api('/quiz');
        quizState.xp = p.xp ?? 0; quizState.level = p.level ?? 1;
        quizState.hp = p.hp ?? 5; quizState.completedLessons = p.completedLessons ?? [];
    } catch {}
    document.getElementById('quizHomeTitle').innerHTML = `🎓 <span>Quiz</span> — ${esc(quizData.greeting)}`;
    quizRenderCategories(); quizUpdateStatus(); quizShowPanel('quizHome');
}

function quizChangeAge() { quizState.ageGroup = null; quizData = null; quizShowPanel('quizAgeSelect'); }

function quizUpdateStatus() {
    document.getElementById('quizLevelVal').textContent = quizState.level;
    document.getElementById('quizHpVal').textContent = '❤️'.repeat(quizState.hp) + '🖤'.repeat(Math.max(0, 5 - quizState.hp));
    const lvlIdx = quizState.level - 1;
    const xpStart = QUIZ_XP_PER_LEVEL[lvlIdx] ?? 0;
    const xpEnd   = QUIZ_XP_PER_LEVEL[lvlIdx + 1] ?? 9999;
    const pct = Math.min(((quizState.xp - xpStart) / (xpEnd - xpStart)) * 100, 100);
    document.getElementById('quizXpFill').style.width = pct + '%';
    document.getElementById('quizXpText').textContent = `${quizState.xp - xpStart} / ${xpEnd - xpStart} XP`;
}

function quizRenderCategories() {
    document.getElementById('quizCatGrid').innerHTML = quizData.categories.map(c =>
        `<div class="quiz-cat-card ${c.feminist?'feminist':''}" onclick="quizOpenCategory('${c.id}')">
            <span class="quiz-cat-icon">${c.icon}</span>
            <div class="quiz-cat-title">${esc(c.name)}</div>
            ${c.feminist ? '<div style="font-size:var(--fs-xs);color:var(--crimson);margin-top:4px;">🌸 Especial Mês da Mulher</div>' : ''}
        </div>`).join('');
}

function quizOpenCategory(id) {
    quizState.currentCat = id;
    const cat     = quizData.categories.find(c => c.id === id);
    const lessons = quizData.lessons[id] || [];
    document.getElementById('quizLessonCatTitle').innerHTML = `${cat.icon} <span>${esc(cat.name)}</span>`;
    document.getElementById('quizLessonList').innerHTML = lessons.map(l => {
        const locked = quizState.level < l.req;
        const done   = quizState.completedLessons.includes(l.id);
        return `<div class="quiz-lesson-item ${locked?'locked':''} ${done?'done':''}" onclick="quizOpenLesson('${l.id}')">
            <span>${l.icon} ${esc(l.title)}${done?' ✓':''}</span>
            <span class="lesson-status">${locked ? '🔒 Nível '+l.req : (done ? '🏆' : '→')}</span>
        </div>`;
    }).join('');
    quizShowPanel('quizLessons');
}

function quizOpenLesson(id) {
    const lesson = quizData.lessons[quizState.currentCat].find(l => l.id === id);
    if (quizState.level < lesson.req) { showAlert(`Esta lição requer Nível ${lesson.req}. Continue estudando!`, 'warning'); return; }
    quizState.currentLesson = lesson;
    document.getElementById('quizContentTitle').innerHTML = `${lesson.icon} <span>${esc(lesson.title)}</span>`;
    document.getElementById('quizContentBody').innerHTML  = lesson.content;
    quizShowPanel('quizContent');
}

function quizStartQuiz() { quizState.quizStep = 0; quizState.correctCount = 0; quizShowPanel('quizQuestions'); quizRenderQuestion(); }

function quizRenderQuestion() {
    const q     = quizState.currentLesson.quiz[quizState.quizStep];
    const total = quizState.currentLesson.quiz.length;
    document.getElementById('quizStepText').textContent = `${quizState.quizStep + 1}/${total}`;
    document.getElementById('quizProgressFill').style.width = ((quizState.quizStep / total) * 100) + '%';
    document.getElementById('quizQuestion').textContent = q.q;
    document.getElementById('quizOptions').innerHTML = q.opts.map((o, i) =>
        `<button class="quiz-opt-btn" onclick="quizHandleAnswer(${i})">${esc(o)}</button>`).join('');
}

function quizHandleAnswer(idx) {
    const q       = quizState.currentLesson.quiz[quizState.quizStep];
    const correct = idx === q.a;
    document.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);
    if (correct) { document.querySelectorAll('.quiz-opt-btn')[idx].classList.add('correct'); quizState.correctCount++; }
    else { document.querySelectorAll('.quiz-opt-btn')[idx].classList.add('wrong'); document.querySelectorAll('.quiz-opt-btn')[q.a].classList.add('correct'); quizState.hp = Math.max(0, quizState.hp - 1); quizUpdateStatus(); }
    setTimeout(() => { quizState.quizStep++; quizState.quizStep < quizState.currentLesson.quiz.length ? quizRenderQuestion() : quizFinish(); }, 1200);
}

async function quizFinish() {
    const total      = quizState.currentLesson.quiz.length;
    const minToPass  = Math.ceil(total * 0.6);
    const win        = quizState.correctCount >= minToPass;
    const firstTime  = !quizState.completedLessons.includes(quizState.currentLesson.id);
    const oldLevel   = quizState.level;
    let xpGained = 0, hpGained = 0;
    if (win && firstTime) {
        xpGained = quizState.correctCount * 50; quizState.xp += xpGained;
        hpGained = Math.min(quizState.correctCount, 5 - quizState.hp); quizState.hp = Math.min(5, quizState.hp + hpGained);
        quizState.completedLessons.push(quizState.currentLesson.id);
    }
    for (let i = QUIZ_XP_PER_LEVEL.length - 1; i >= 0; i--) { if (quizState.xp >= QUIZ_XP_PER_LEVEL[i]) { quizState.level = i + 1; break; } }
    const leveledUp = quizState.level > oldLevel;
    try { await api('/quiz', { method:'POST', body: JSON.stringify({ xp:quizState.xp, level:quizState.level, hp:quizState.hp, completedLessons:quizState.completedLessons }) }); } catch {}
    document.getElementById('quizResultIcon').textContent  = win ? '🏆' : '💪';
    document.getElementById('quizResultTitle').textContent = win ? 'Missão Cumprida!' : 'Continue Tentando!';
    let desc = `Você acertou ${quizState.correctCount} de ${total} perguntas.`;
    if (!win) desc += ` Acerte pelo menos ${minToPass} para passar!`;
    if (win && !firstTime) desc += ' (Já completada anteriormente)';
    document.getElementById('quizResultDesc').textContent = desc;
    document.getElementById('quizXpGain').textContent = xpGained;
    document.getElementById('quizHpGain').textContent = hpGained;
    const lvlBox = document.getElementById('quizLevelUpBox');
    if (leveledUp) { document.getElementById('quizNewLevel').textContent = `Nível ${quizState.level}`; lvlBox.style.display = 'block'; } else { lvlBox.style.display = 'none'; }
    quizUpdateStatus(); quizShowPanel('quizResult');
}
