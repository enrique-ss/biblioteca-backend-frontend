import { Response } from 'express';
import { RequisicaoAutenticada } from '../middlewares/auth';
import db from '../database';

// Regras de Gamificação: Níveis de experiência
const XP_POR_NIVEL = [0, 100, 250, 450, 700, 1000, 1400, 1850, 2350, 2900, 3500];

// Banco de Dados Central de Conteúdo e Perguntas (Regra de Negócio Crítica)
const BANCO_DADOS_QUIZ: any = {
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

/**
 * Controlador do Quiz: Gerencia a gamificação e o progresso (Centralizando Regras de Negócio).
 */
export class QuizController {

    // Retorna o banco de conteúdos SEM as respostas corretas (segurança)
    buscarBanco = async (req: RequisicaoAutenticada, res: Response) => {
        const bancoSeguro = JSON.parse(JSON.stringify(BANCO_DADOS_QUIZ));
        
        // Remove a propriedade 'a' (answer) de todas as perguntas para o frontend não saber a resposta
        for (const faixa in bancoSeguro) {
            for (const cat in bancoSeguro[faixa].licoes) {
                bancoSeguro[faixa].licoes[cat].forEach((licao: any) => {
                    licao.perguntas.forEach((p: any) => delete p.a);
                });
            }
        }
        res.json(bancoSeguro);
    };

    // Recupera a ficha de progresso do aluno logado
    buscarProgresso = async (req: RequisicaoAutenticada, res: Response) => {
        try {
            const usuarioId = req.usuario!.id;
            const registro = await db('quiz_progresso').where({ usuario_id: usuarioId }).first();

            if (!registro) {
                return res.json({ xp: 0, level: 1, hp: 5, completedLessons: [] });
            }

            res.json({
                xp: registro.xp,
                level: registro.level,
                hp: registro.hp,
                completedLessons: JSON.parse(registro.completed_lessons || '[]'),
            });
        } catch (erro) {
            res.status(500).json({ error: 'Não foi possível carregar seu progresso no quiz.' });
        }
    };

    // PROCESSA O RESULTADO (A principal Regra de Negócio que estava no Frontend)
    submeterLicao = async (req: RequisicaoAutenticada, res: Response) => {
        try {
            const usuarioId = req.usuario!.id;
            const { licaoId, respostasUsuario } = req.body;

            // 1. Localiza a lição no servidor para conferir as respostas reais
            let licaoOriginal: any = null;
            for (const faixa in BANCO_DADOS_QUIZ) {
                for (const cat in BANCO_DADOS_QUIZ[faixa].licoes) {
                    const l = BANCO_DADOS_QUIZ[faixa].licoes[cat].find((item: any) => item.id === licaoId);
                    if (l) { licaoOriginal = l; break; }
                }
                if (licaoOriginal) break;
            }

            if (!licaoOriginal) return res.status(404).json({ error: 'Lição não mapeada no servidor.' });

            // 2. Valida as respostas e gera o feedback
            let acertos = 0;
            const feedback = licaoOriginal.perguntas.map((p: any, i: number) => {
                const acertou = respostasUsuario[i] === p.a;
                if (acertou) acertos++;
                return { acertou, respostaCorreta: p.a };
            });

            // 3. Carrega o estado atual para calcular a evolução
            let progresso = await db('quiz_progresso').where({ usuario_id: usuarioId }).first();
            if (!progresso) progresso = { xp: 0, level: 1, hp: 5, completed_lessons: '[]' };

            const licoesConcluidas = JSON.parse(progresso.completed_lessons || '[]');
            const totalPerguntas = licaoOriginal.perguntas.length;
            const venceu = acertos >= Math.ceil(totalPerguntas * 0.6); // Regra: mínimo 60%
            const primeiraVez = !licoesConcluidas.includes(licaoId);

            let xpGanhos = 0;
            let hpGanho = 0;
            let hpPerdido = totalPerguntas - acertos; // Perde 1 de HP por cada erro individual

            let novoXp = progresso.xp;
            let novoHp = Math.max(0, progresso.hp - hpPerdido);
            let novoLevel = progresso.level;

            if (venceu && primeiraVez) {
                // Recompensa apenas na primeira vez que completa a lição
                xpGanhos = acertos * 50;
                novoXp += xpGanhos;
                
                // Recupera vida baseado no desempenho (até o limite de 5)
                hpGanho = Math.min(acertos, 5 - novoHp);
                if (novoHp > 0) novoHp = Math.min(5, novoHp + hpGanho);
                
                licoesConcluidas.push(licaoId);
            }

            // 4. Calcula o novo Nível baseado no XP acumulado
            for (let i = XP_POR_NIVEL.length - 1; i >= 0; i--) {
                if (novoXp >= XP_POR_NIVEL[i]) {
                    novoLevel = i + 1;
                    break;
                }
            }

            // 5. Persiste as mudanças
            const novosDados = {
                xp: novoXp,
                level: novoLevel,
                hp: novoHp,
                completed_lessons: JSON.stringify(licoesConcluidas),
                updated_at: db.fn.now()
            };

            if (progresso.id) {
                await db('quiz_progresso').where({ usuario_id: usuarioId }).update(novosDados);
            } else {
                await db('quiz_progresso').insert({ usuario_id: usuarioId, ...novosDados });
            }

            // 6. Retorna o veredito para a UI renderizar
            res.json({
                venceu,
                acertos,
                total: totalPerguntas,
                xpGanhos,
                hpGanho,
                hpPerdido,
                novoXp,
                novoLevel,
                novoHp,
                subiuDeNivel: novoLevel > progresso.level,
                feedback,
                primeiraVez
            });

        } catch (erro) {
            console.error('Erro ao processar quiz:', erro);
            res.status(500).json({ error: 'Erro fatal ao salvar seu progresso.' });
        }
    };
}