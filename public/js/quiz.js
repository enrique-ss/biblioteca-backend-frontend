// Gerenciamento de Quiz Literário e Progresso (Gamificação)

const XP_POR_NIVEL = [0, 100, 250, 450, 700, 1000, 1400, 1850, 2350, 2900, 3500];

// Estado atual do quiz na sessão do usuário
let estadoQuiz = { 
    grupoIdade: null, 
    xp: 0, 
    nivel: 1, 
    hp: 5, 
    catAtual: null, 
    licaoAtual: null, 
    passoQuiz: 0, 
    contagemAcertos: 0, 
    licoesConcluidas: [] 
};

let dadosQuizAtivos = null;

// Banco de dados local com conteúdos didáticos e perguntas
const BANCO_DADOS_QUIZ = {
    infantil: { 
        saudacao: 'Infantil (6–8 anos)', 
        categorias: [
            { id: 'contos', name: 'Contos e Fábulas', icon: '🐺', feminista: false },
            { id: 'poesia', name: 'Poesia', icon: '🎵', feminista: false },
            { id: 'classicos', name: 'Clássicos Infantis', icon: '📖', feminista: false },
            { id: 'escritoras', name: 'Escritoras do Brasil', icon: '✍️', feminista: true }
        ], 
        licoes: {
            contos: [
                {
                    id: 'inf_c1',
                    title: 'O que são Contos?',
                    icon: '📜',
                    req: 1,
                    content: '<h1>📜</h1><h2>Contos: Histórias Curtas e Mágicas!</h2><p>Um conto é uma história curta com começo, meio e fim.</p><h3>Partes de um conto</h3><ul><li>🌅 Início: apresenta os personagens e o lugar</li><li>😮 Conflito: algo acontece e cria um problema</li><li>🎉 Desfecho: o problema é resolvido (ou não!)</li></ul><h3>Tipos de conto</h3><ul><li>🐺 Contos de fadas: com magia e encantamento</li><li>🦊 Fábulas: com animais que ensinam uma lição</li><li>👻 Contos de assombração: cheios de mistério</li></ul>',
                    perguntas: [
                        { q: "O que é um conto?", opts: ["Um livro enorme", "Uma história curta com começo, meio e fim", "Uma música", "Um poema longo"], a: 1 },
                        { q: "O que é uma fábula?", opts: ["Uma história sem fim", "Um conto com animais que ensinam uma lição", "Um poema de amor", "Um livro de receitas"], a: 1 },
                        { q: "Qual é a parte onde o problema é resolvido?", opts: ["O início", "O conflito", "O desfecho", "O título"], a: 2 }
                    ]
                },
                {
                    id: 'inf_c2',
                    title: 'Fábulas de Esopo',
                    icon: '🦊',
                    req: 2,
                    content: '<h1>🦊</h1><h2>Esopo: O Pai das Fábulas</h2><div class="quiz-author-box"><span class="quiz-author-name">Esopo (séc. VI a.C. — Grécia Antiga)</span></div><p>Esopo foi um escravo grego que criou histórias com animais para ensinar lições de vida.</p><h3>Fábulas famosas</h3><ul><li>🐢 A Lebre e a Tartaruga: devagar se vai longe</li><li>🍇 A Raposa e as Uvas: quem não pode, diz que não quer</li><li>🐺 O Pastorzinho Mentiroso: quem mente perde a confiança</li><li>🐜 A Cigarra e a Formiga: trabalhe hoje para amanhã</li></ul>',
                    perguntas: [
                        { q: "Quem foi Esopo?", opts: ["Um filósofo", "Um poeta", "Um escravo grego", "Um imperador romano"], a: 1 },
                        { q: "O que as fábulas ensinam?", opts: ["Nada", "Como ser rico", "Lições morais", "Como cozinhar bem"], a: 2 }
                    ]
                }
            ]
        }
    },
    infantojuvenil: { 
        saudacao: 'Infanto-Juvenil (9–11 anos)', 
        categorias: [
            { id: 'generos', name: 'Gêneros Literários', icon: '📚', feminista: false },
            { id: 'autores', name: 'Grandes Autores', icon: '🖊️', feminista: false },
            { id: 'movimentos', name: 'Movimentos Literários', icon: '🏛️', feminista: false },
            { id: 'escritoras', name: 'Literatura Feminina', icon: '✍️', feminista: true }
        ], 
        licoes: {
            generos: [
                {
                    id: 'ij_g1',
                    title: 'Prosa e Poesia',
                    icon: '📝',
                    req: 1,
                    content: '<h1>📝</h1><h2>As Duas Grandes Formas da Literatura</h2><p>Toda literatura se divide em prosa e poesia.</p>',
                    perguntas: [
                        { q: "Diferença entre prosa e poesia?", opts: ["Nenhuma", "Prosa é contínua; poesia é em versos", "Prosa é mais curta", "Poesia é mais antiga"], a: 1 },
                        { q: "Qual é um gênero em prosa?", opts: ["Soneto", "Romance", "Haiku", "Ode"], a: 1 },
                        { q: "O que caracteriza a poesia?", opts: ["Rima obrigatória", "Ritmo, versos e emoção concentrada", "É sempre longa", "Só trata de amor"], a: 1 }
                    ]
                },
                {
                    id: 'ij_g2',
                    title: 'Conto, Crônica e Romance',
                    icon: '📖',
                    req: 2,
                    content: '<h1>📖</h1><h2>Subgêneros da Prosa</h2><h3>Conto</h3><ul><li>História curta, um único conflito</li></ul><h3>Crônica</h3><ul><li>Texto curto sobre o cotidiano</li></ul><h3>Romance</h3><ul><li>Narrativa longa e complexa</li></ul>',
                    perguntas: [
                        { q: "Característica principal do conto?", opts: ["É muito longo", "Curto, único conflito central", "Muitos personagens", "Sempre humorístico"], a: 1 },
                        { q: "Onde é comum encontrar crônicas?", opts: ["Enciclopédias", "Jornais e revistas", "Dicionários", "Bulas"], a: 1 },
                        { q: "O que diferencia o romance?", opts: ["É sempre bonito", "Longo, muitos personagens e subtramas", "Sempre sobre amor", "Menos de 10 páginas"], a: 1 }
                    ]
                }
            ]
        }
    },
    preadolescente: { 
        saudacao: 'Pré-Adolescente (11–14 anos)', 
        categorias: [
            { id: 'teoria', name: 'Teoria Literária', icon: '🔬', feminista: false },
            { id: 'autores', name: 'Cânone Brasileiro', icon: '🏛️', feminista: false },
            { id: 'mundial', name: 'Literatura Mundial', icon: '🌎', feminista: false },
            { id: 'escritoras', name: 'Literatura Feminista', icon: '✍️', feminista: true }
        ], 
        licoes: {
            teoria: [
                {
                    id: 'pa_t1',
                    title: 'Narrador e Ponto de Vista',
                    icon: '👁️',
                    req: 1,
                    content: '<h1>👁️</h1><h2>Quem Conta a História?</h2><p>O narrador é a voz que conta a história.</p><h3>Tipos de narrador</h3><ul><li>🙋 1ª pessoa: participa da história</li><li>👤 3ª pessoa onisciente: sabe tudo</li><li>👀 3ª pessoa observador: só descreve</li></ul><p>O narrador NÃO é o autor!</p>',
                    perguntas: [
                        { q: "Narrador em 1ª pessoa?", opts: ["Quem escreveu o livro", "A voz que diz 'eu' e participa", "Personagem secundário", "O vilão"], a: 1 },
                        { q: "Narrador onisciente?", opts: ["Só vê de fora", "Sabe tudo, inclusive pensamentos", "Está dentro da história", "Não sabe o futuro"], a: 1 },
                        { q: "Narrador e autor são a mesma pessoa?", opts: ["Sim, sempre", "Não: o autor cria o narrador como personagem", "Às vezes", "Só em poesia"], a: 1 }
                    ]
                },
                {
                    id: 'pa_t2',
                    title: 'Intertextualidade',
                    icon: '🕸️',
                    req: 2,
                    content: '<h1>🕸️</h1><h2>Quando Textos Conversam Entre Si</h2><p>Intertextualidade é quando um texto referencia outro.</p>',
                    perguntas: [
                        { q: "O que é intertextualidade?", opts: ["Erro de escrita", "Quando um texto dialoga com outro", "Tipo de pontuação", "Índice do livro"], a: 1 },
                        { q: "O que é paródia?", opts: ["Cópia idêntica", "Imitação para criticar ou fazer humor", "Tradução", "Resumo"], a: 1 },
                        { q: "Por que a intertextualidade é importante?", opts: ["Não é", "Mostra que a literatura é uma conversa entre autores", "Serve para plagiar", "Para enganar leitores"], a: 1 }
                    ]
                }
            ]
        }
    }
};

// Inicializa o sistema de quiz
function inicializarQuiz() {
    if (estadoQuiz.grupoIdade) {
        exibirPainelQuiz('quizHome');
    } else {
        exibirPainelQuiz('quizAgeSelect');
    }
}

// Troca entre os painéis visuais do quiz
function exibirPainelQuiz(id) {
    const paineis = ['quizAgeSelect', 'quizHome', 'quizLessons', 'quizContent', 'quizQuestions', 'quizResult'];
    
    paineis.forEach(p => {
        const el = document.getElementById(p);
        if (el) {
            el.style.display = 'none';
        }
    });

    const alvo = document.getElementById(id);
    if (alvo) {
        alvo.style.display = 'block';
    }
}

// Seleciona a faixa etária do usuário e carrega seu progresso
async function selecionarFaixaEtaria(grupo) {
    estadoQuiz.grupoIdade = grupo;
    dadosQuizAtivos = BANCO_DADOS_QUIZ[grupo];

    try {
        const progresso = await api('/quiz');
        estadoQuiz.xp = progresso.xp ?? 0;
        estadoQuiz.nivel = progresso.level ?? 1;
        estadoQuiz.hp = progresso.hp ?? 5;
        estadoQuiz.licoesConcluidas = progresso.completedLessons ?? [];
    } catch (erro) {
        // Silencioso se o usuário ainda não tiver perfil de quiz
    }

    const tituloHome = document.getElementById('quizHomeTitle');
    tituloHome.innerHTML = `🎓 <span>Quiz</span> — ${esc(dadosQuizAtivos.saudacao)}`;

    renderizarCategoriasQuiz();
    atualizarStatusQuiz();
    exibirPainelQuiz('quizHome');
}

function trocarFaixaEtaria() {
    estadoQuiz.grupoIdade = null;
    dadosQuizAtivos = null;
    exibirPainelQuiz('quizAgeSelect');
}

// Atualiza as barras de XP e corações na interface
function atualizarStatusQuiz() {
    document.getElementById('quizLevelVal').textContent = estadoQuiz.nivel;
    document.getElementById('quizHpVal').textContent = '❤️'.repeat(estadoQuiz.hp) + '🖤'.repeat(Math.max(0, 5 - estadoQuiz.hp));

    const indiceNivel = estadoQuiz.nivel - 1;
    const xpInicio = XP_POR_NIVEL[indiceNivel] ?? 0;
    const xpFim = XP_POR_NIVEL[indiceNivel + 1] ?? 9999;
    
    const progressoXp = estadoQuiz.xp - xpInicio;
    const totalXpNivel = xpFim - xpInicio;
    const percentual = Math.min((progressoXp / totalXpNivel) * 100, 100);

    document.getElementById('quizXpFill').style.width = percentual + '%';
    document.getElementById('quizXpText').textContent = `${progressoXp} / ${totalXpNivel} XP`;
}

// Renderiza os cards das categorias literárias
function renderizarCategoriasQuiz() {
    const grid = document.getElementById('quizCatGrid');
    grid.innerHTML = dadosQuizAtivos.categorias.map(c => `
        <div class="quiz-cat-card ${c.feminista ? 'feminist' : ''}" onclick="abrirCategoriaQuiz('${c.id}')">
            <span class="quiz-cat-icon">${c.icon}</span>
            <div class="quiz-cat-title">${esc(c.name)}</div>
            ${c.feminista ? '<div style="font-size:var(--fs-xs);color:var(--crimson);margin-top:4px;">🌸 Especial Mês da Mulher</div>' : ''}
        </div>`).join('');
}

// Lista as lições de uma categoria selecionada
function abrirCategoriaQuiz(id) {
    estadoQuiz.catAtual = id;
    const categoria = dadosQuizAtivos.categorias.find(c => c.id === id);
    const licoes = dadosQuizAtivos.licoes[id] || [];

    document.getElementById('quizLessonCatTitle').innerHTML = `${categoria.icon} <span>${esc(categoria.name)}</span>`;
    
    document.getElementById('quizLessonList').innerHTML = licoes.map(l => {
        const bloqueada = estadoQuiz.nivel < l.req;
        const concluida = estadoQuiz.licoesConcluidas.includes(l.id);
        
        const classeStatus = bloqueada ? 'locked' : (concluida ? 'done' : '');
        const textoStatus = bloqueada ? '🔒 Nível ' + l.req : (concluida ? '🏆' : '→');

        return `
            <div class="quiz-lesson-item ${classeStatus}" onclick="abrirLicaoQuiz('${l.id}')">
                <span>${l.icon} ${esc(l.title)}${concluida ? ' ✓' : ''}</span>
                <span class="lesson-status">${textoStatus}</span>
            </div>`;
    }).join('');

    exibirPainelQuiz('quizLessons');
}

// Abre o conteúdo didático de uma lição
function abrirLicaoQuiz(id) {
    const licao = dadosQuizAtivos.licoes[estadoQuiz.catAtual].find(l => l.id === id);
    
    if (estadoQuiz.nivel < licao.req) {
        exibirAlerta(`Esta lição requer Nível ${licao.req}. Continue estudando!`, 'warning');
        return;
    }

    estadoQuiz.licaoAtual = licao;
    document.getElementById('quizContentTitle').innerHTML = `${licao.icon} <span>${esc(licao.title)}</span>`;
    document.getElementById('quizContentBody').innerHTML = licao.content;
    
    exibirPainelQuiz('quizContent');
}

// Inicia a sequência de perguntas após ler o conteúdo
function iniciarPerguntasQuiz() {
    estadoQuiz.passoQuiz = 0;
    estadoQuiz.contagemAcertos = 0;
    exibirPainelQuiz('quizQuestions');
    renderizarPerguntaQuiz();
}

// Renderiza a pergunta atual na tela
function renderizarPerguntaQuiz() {
    const pergunta = estadoQuiz.licaoAtual.perguntas[estadoQuiz.passoQuiz];
    const total = estadoQuiz.licaoAtual.perguntas.length;

    document.getElementById('quizStepText').textContent = `${estadoQuiz.passoQuiz + 1}/${total}`;
    document.getElementById('quizProgressFill').style.width = ((estadoQuiz.passoQuiz / total) * 100) + '%';
    document.getElementById('quizQuestion').textContent = pergunta.q;
    
    document.getElementById('quizOptions').innerHTML = pergunta.opts.map((opcao, i) => `
        <button class="quiz-opt-btn" onclick="processarRespostaQuiz(${i})">${esc(opcao)}</button>`).join('');
}

// Processa a escolha do usuário e dá feedback visual
function processarRespostaQuiz(indice) {
    const pergunta = estadoQuiz.licaoAtual.perguntas[estadoQuiz.passoQuiz];
    const acertou = indice === pergunta.a;
    
    const botoes = document.querySelectorAll('.quiz-opt-btn');
    botoes.forEach(b => b.disabled = true);

    if (acertou) {
        botoes[indice].classList.add('correct');
        estadoQuiz.contagemAcertos++;
    } else {
        botoes[indice].classList.add('wrong');
        botoes[pergunta.a].classList.add('correct');
        
        // Remove um coração se errar
        estadoQuiz.hp = Math.max(0, estadoQuiz.hp - 1);
        atualizarStatusQuiz();
    }

    // Aguarda um momento para o usuário ver a resposta antes de prosseguir
    setTimeout(() => {
        estadoQuiz.passoQuiz++;
        if (estadoQuiz.passoQuiz < estadoQuiz.licaoAtual.perguntas.length) {
            renderizarPerguntaQuiz();
        } else {
            finalizarQuiz();
        }
    }, 1200);
}

// Finaliza a lição, calcula ganhos e salva progresso no servidor
async function finalizarQuiz() {
    const total = estadoQuiz.licaoAtual.perguntas.length;
    const minimoParaPassar = Math.ceil(total * 0.6);
    const venceu = estadoQuiz.contagemAcertos >= minimoParaPassar;
    const primeiraVez = !estadoQuiz.licoesConcluidas.includes(estadoQuiz.licaoAtual.id);
    const nivelAntigo = estadoQuiz.nivel;

    let xpGanhos = 0;
    let hpGanho = 0;

    if (venceu && primeiraVez) {
        // Recompensa generosa na primeira conclusão
        xpGanhos = estadoQuiz.contagemAcertos * 50;
        estadoQuiz.xp += xpGanhos;
        
        // Recupera vida proporcional ao desempenho
        hpGanho = Math.min(estadoQuiz.contagemAcertos, 5 - estadoQuiz.hp);
        estadoQuiz.hp = Math.min(5, estadoQuiz.hp + hpGanho);
        
        estadoQuiz.licoesConcluidas.push(estadoQuiz.licaoAtual.id);
    }

    // Calcula se subiu de nível
    for (let i = XP_POR_NIVEL.length - 1; i >= 0; i--) {
        if (estadoQuiz.xp >= XP_POR_NIVEL[i]) {
            estadoQuiz.nivel = i + 1;
            break;
        }
    }

    const subiuDeNivel = estadoQuiz.nivel > nivelAntigo;

    // Persiste no banco de dados
    try {
        await api('/quiz', {
            method: 'POST',
            body: JSON.stringify({
                xp: estadoQuiz.xp,
                level: estadoQuiz.nivel,
                hp: estadoQuiz.hp,
                completedLessons: estadoQuiz.licoesConcluidas
            })
        });
    } catch (erro) {
        // Silencioso
    }

    // Atualiza a tela de resultados
    document.getElementById('quizResultIcon').textContent = venceu ? '🏆' : '💪';
    document.getElementById('quizResultTitle').textContent = venceu ? 'Missão Cumprida!' : 'Continue Tentando!';
    
    let descricao = `Você acertou ${estadoQuiz.contagemAcertos} de ${total} perguntas.`;
    if (!venceu) {
        descricao += ` Acerte pelo menos ${minimoParaPassar} para passar!`;
    }
    if (venceu && !primeiraVez) {
        descricao += ' (Já completada anteriormente)';
    }

    document.getElementById('quizResultDesc').textContent = descricao;
    document.getElementById('quizXpGain').textContent = xpGanhos;
    document.getElementById('quizHpGain').textContent = hpGanho;

    const boxNivel = document.getElementById('quizLevelUpBox');
    if (subiuDeNivel) {
        document.getElementById('quizNewLevel').textContent = `Nível ${estadoQuiz.nivel}`;
        boxNivel.style.display = 'block';
    } else {
        boxNivel.style.display = 'none';
    }

    atualizarStatusQuiz();
    exibirPainelQuiz('quizResult');
}
