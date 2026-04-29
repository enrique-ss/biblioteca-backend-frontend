const supabase = require('../database');

/**
 * InfantilController: O coração do "Espaço Literário".
 * Gerencia todo o conteúdo pedagógico, lições, quizzes e o sistema de gamificação (XP, Níveis e Vidas).
 */
class InfantilController {

  /**
   * Banco de dados local com todo o conteúdo educacional.
   * Contém as lições divididas por faixa etária, com textos explicativos e perguntas de quiz.
   */
  getFullData = () => {
    return {
      infantil: {
        greeting: "Olá, Pequeno Leitor! 📚",
        avatar: "🌱",
        // Categorias para crianças pequenas
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
              description: "Os *contos* são como pequenas janelas para mundos *mágicos*. Eles são histórias curtas que podemos ler rapidinho, mas que ficam no nosso coração por muito tempo!",
              footer: "Prepare-se para descobrir como as histórias são construídas!",
              highlights: [
                { icon: '🌅', title: 'O Começo', text: 'Aqui conhecemos quem são os *personagens* e em qual *lugar* especial a história acontece.' },
                { icon: '😮', title: 'O Problema', text: 'Toda história legal tem um *desafio*. É o momento em que algo diferente acontece e muda tudo!' },
                { icon: '🎉', title: 'O Grande Final', text: 'É o desfecho! Onde descobrimos como os personagens resolveram o mistério ou venceram o *desafio*.' },
                { icon: '✨', title: 'A Magia', text: 'Muitos contos usam a *imaginação* para criar seres incríveis e lugares que só existem nos sonhos.' }
              ],
              funFact: "Você sabia? O conto mais antigo do mundo tem mais de *4 mil anos* e veio do antigo Egito!",
              quiz: [
                { q: "O que é um conto?", opts: ["Um livro enorme", "Uma história curta com começo, meio e fim", "Uma música", "Um poema longo"], a: 1 },
                { q: "O que é uma fábula?", opts: ["Uma história sem fim", "Um conto com animais que ensinam uma lição", "Um poema de amor", "Um livro de receitas"], a: 1 },
                { q: "Qual é a parte do conto em que o problema é resolvido?", opts: ["O início", "O conflito", "O desfecho", "O título"], a: 2 }
              ]
            },
            {
              id: 'inf_c2', title: 'Fábulas de Esopo', icon: '🦊', requiredLevel: 2,
              description: "*Esopo* foi um grande contador de histórias na *Grécia Antiga*. Ele percebeu que podia ensinar coisas importantes usando animais que falam e agem como gente!",
              meta: "Séc. VI a.C. • Grécia Antiga",
              highlights: [
                { icon: '🐢', title: 'A Lebre e a Tartaruga', text: 'Nesta história, aprendemos que o *esforço constante* e a humildade vencem a arrogância. *Devagar se vai longe*!' },
                { icon: '🍇', title: 'A Raposa e as Uvas', text: 'A raposa não conseguiu as uvas e disse que estavam verdes. Isso ensina que não devemos *desprezar* o que não conseguimos ter.' },
                { icon: '🐺', title: 'O Pastor Mentiroso', text: 'Um menino que sempre mentia sobre o lobo. Quando o lobo apareceu de verdade, ninguém acreditou. A lição? A *honestidade* é tudo.' },
                { icon: '🐜', title: 'A Cigarra e a Formiga', text: 'Enquanto a cigarra só cantava, a formiga trabalhava. Aprendemos a importância de se *preparar para o futuro*.' }
              ],
              funFact: "Esopo era um escravo que conquistou sua liberdade justamente por causa de sua *sabedoria* e de suas histórias incríveis!",
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
              description: "A *poesia* é a arte de pintar com as palavras. Escrever não apenas para informar, mas para fazer o coração *sentir* a música que existe no papel.",
              highlights: [
                { icon: '🎶', title: 'O Ritmo', text: 'É o batimento cardíaco do poema! As palavras são escolhidas para terem um *som* que parece uma canção.' },
                { icon: '🔤', title: 'A Rima', text: 'Quando o final das palavras combina, criando uma *harmonia* gostosa de ouvir e recitar.' },
                { icon: '📝', title: 'Versos e Estrofes', text: 'Cada linha é um verso, e o grupinho de linhas forma uma estrofe. É como se fossem os *degraus* de uma escada mágica.' }
              ],
              funFact: "Antigamente, as poesias eram sempre cantadas com um instrumento chamado *Lira*. Por isso dizemos que a poesia é lírica!",
              quiz: [
                { q: "O que é uma rima na poesia?", opts: ["Um erro de escrita", "Quando palavras terminam com o mesmo som", "Um tipo de pontuação", "Uma cor"], a: 1 },
                { q: "O que chamamos de 'verso' em um poema?", opts: ["O título", "Cada linha do poema", "O autor", "A moral"], a: 1 },
                { q: "O ritmo na poesia é parecido com:", opts: ["Uma receita", "Uma música", "Um mapa", "Uma equação"], a: 1 }
              ]
            }
          ],
          classicos: [
            {
              id: 'inf_cl1', title: 'Contos de Andersen', icon: '❄️', requiredLevel: 1,
              description: "Hans Christian Andersen transformou seus sentimentos em contos que o mundo inteiro lê. Ele amava criar seres *mágicos*!",
              meta: "1805–1875 • Dinamarca",
              highlights: [
                { icon: '🦢', title: 'O Patinho Feio', text: 'Uma história poderosa sobre *aceitação*. Mostra que todos temos nossa própria beleza.' },
                { icon: '🌊', title: 'A Pequena Sereia', text: 'Diferente do filme, o conto original fala sobre o desejo de ter uma *alma* e o sacrifício por amor.' },
                { icon: '❄️', title: 'A Rainha da Neve', text: 'Uma aventura épica sobre a *amizade* verdadeira que consegue derreter até o coração mais gelado do mundo.' }
              ],
              funFact: "Andersen era tão famoso que viajava por toda a Europa para contar suas histórias para *Reis e Rainhas*!",
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
              description: "Cora era uma doceira que vivia em uma casa antiga em *Goiás*. Escrevia sobre as coisas simples da vida: fogão a lenha, becos e *pessoas simples*.",
              meta: "1889—1985 • Goiás, Brasil",
              highlights: [
                { icon: '👵', title: 'Sabedoria', text: 'Ela provou que a *educação* e a arte não têm idade. Publicou seu primeiro grande livro aos *76 anos*!' },
                { icon: '✍️', title: 'Poesia do Cotidiano', text: 'Suas palavras transformavam coisas comuns em momentos de pura *magia literária*.' },
                { icon: '🏘️', title: 'Os Becos de Goiás', text: 'Cora amava sua terra natal e descrevia as ruas de pedra com um *carinho* único.' }
              ],
              funFact: "Cora Coralina não terminou a escola, mas se tornou uma das maiores doutoras da literatura brasileira!",
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
        avatar: "🚀",
        // Categorias para adolescentes
        categories: [
          { id: 'contos', name: 'Contos Brasileiros', icon: '🏜️', color: 'var(--accent)' },
          { id: 'poesia', name: 'Poesia Moderna', icon: '🎭', color: '#6a5ae0' }
        ],
        lessons: {
          contos: [
            {
              id: 'ij_c1', title: 'Contos do Brasil', icon: '🏜️', requiredLevel: 1,
              description: "A literatura brasileira é um caldeirão de culturas. Nossos contos viajam do sertão seco às cidades grandes com muita *brasilidade*!",
              highlights: [
                { icon: '🌳', title: 'Raízes Indígenas', text: 'Muitas de nossas histórias vêm das lendas que explicam a *natureza*.' },
                { icon: '🌵', title: 'O Sertão Profundo', text: 'Escritores como Guimarães Rosa transformaram o interior do Brasil em um lugar de *mistério e filosofia*.' },
                { icon: '🏙️', title: 'A Crônica Urbana', text: 'Mostra como a vida nas grandes cidades também pode ser cheia de *histórias emocionantes*.' }
              ],
              funFact: "Machado de Assis, nosso maior escritor, começou escrevendo contos em jornais!",
              quiz: [
                { q: "O que torna os contos brasileiros especiais?", opts: ["Só falam de reis", "Misturam culturas indígenas, africanas e europeias", "São todos iguais", "Só falam de animais"], a: 1 },
                { q: "Qual é um tema comum nos contos brasileiros?", opts: ["Castelos medievais", "Sertão e caatinga", "Ninjas", "Dragões"], a: 1 }
              ]
            }
          ],
          poesia: [
            {
              id: 'ij_p1', title: 'Lira dos Vinte Anos', icon: '🎭', requiredLevel: 1,
              description: "Álvares de Azevedo foi o maior poeta do nosso *Ultrarromantismo*. Sua poesia fala de sonhos, mistérios e melancolia.",
              meta: "1831—1852 • São Paulo, Brasil",
              highlights: [
                { icon: '🌙', title: 'O Lado Sombrio', text: 'Sua poesia explora temas como a *noite*, o mistério e o sonho.' },
                { icon: '💔', title: 'Sentimentalismo', text: 'A expressão máxima dos *sentimentos* juvenis entre o amor idealizado e a tristeza.' }
              ],
              funFact: "Ele morreu com apenas 20 anos, mas deixou uma obra que influenciou gerações de poetas!",
              quiz: [
                { q: "Quem foi o autor de 'Lira dos Vinte Anos'?", opts: ["Casimiro de Abreu", "Álvares de Azevedo", "Castro Alves", "Machado de Assis"], a: 1 },
                { q: "Qual era a principal característica de sua poesia?", opts: ["Realismo", "Ultrarromantismo e melancolia", "Poesia social", "Modernismo"], a: 1 }
              ]
            }
          ]
        }
      },
      preadolescente: {
        greeting: "Olá, Crítico Literário! 📚",
        avatar: "🎓",
        // Categorias para jovens críticos
        categories: [
          { id: 'teoria', name: 'Teoria Literária', icon: '📖', color: 'var(--accent)' },
          { id: 'brasileira', name: 'Literatura Brasileira', icon: '🦜', color: '#00d68f' }
        ],
        lessons: {
          teoria: [
            {
              id: 'pa_t1', title: 'Teoria Literária', icon: '📖', requiredLevel: 1,
              description: "A teoria literária nos dá as *lentes* para enxergar o que está escondido nas entrelinhas de um livro.",
              highlights: [
                { icon: '📚', title: 'Estruturalismo', text: 'Analisa como o texto é montado, como se fosse a *engenharia* de uma ponte feita de palavras.' },
                { icon: '👤', title: 'Psicanálise', text: 'Investiga os desejos e medos dos *personagens*, tratando-os como se fossem pessoas reais.' }
              ],
              funFact: "A teoria literária moderna decidiu tratar a literatura como algo *científico* no início do século XX!",
              quiz: [
                { q: "O que é teoria literária?", opts: ["Só ler livros", "Estudo dos princípios para analisar obras", "Escrever poesia", "Fazer resumos"], a: 1 },
                { q: "Qual abordagem foca na estrutura do texto?", opts: ["Psicanálise", "Estruturalismo", "Marxismo", "Feminismo"], a: 1 }
              ]
            }
          ],
          brasileira: [
            {
              id: 'pa_b1', title: 'O Realismo de Machado', icon: '🎩', requiredLevel: 1,
              description: "Machado de Assis revolucionou a literatura brasileira ao focar na *psicologia* humana e na ironia social.",
              meta: "1839—1908 • Rio de Janeiro",
              highlights: [
                { icon: '🔍', title: 'Análise Psicológica', text: 'Ele não descrevia apenas o exterior, mas o que os personagens *pensavam* de verdade.' },
                { icon: '😏', title: 'Ironia Machadiana', text: 'Uma forma elegante de criticar a sociedade carioca com muito *humor ácido*.' }
              ],
              funFact: "Machado foi um dos fundadores da *Academia Brasileira de Letras*!",
              quiz: [
                { q: "Qual era a característica do Realismo de Machado?", opts: ["Falar de fadas", "Análise psicológica e ironia", "Aventuras no mar", "Poesia religiosa"], a: 1 },
                { q: "Onde Machado de Assis nasceu?", opts: ["São Paulo", "Rio de Janeiro", "Goiás", "Minas Gerais"], a: 1 }
              ]
            }
          ]
        }
      }
    };
  };

  /**
   * Coleta todo o progresso do usuário logado (XP, Nível, Vidas) e o conteúdo disponível.
   * Filtra as respostas corretas do quiz para que o usuário não as veja no código-fonte antes de responder.
   */
  getData = async (req, res) => {
    try {
      const userId = req.usuario?.id;
      if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });

      // Busca dados de gamificação
      const { data: user } = await supabase
        .from('usuarios')
        .select('infantil_xp, infantil_level, infantil_hearts')
        .eq('id', userId)
        .single();

      // Busca quais lições o usuário já completou com sucesso
      const { data: completedLessonsRecords } = await supabase
        .from('usuarios_leicoes_infantis')
        .select('leicao_id')
        .eq('usuario_id', userId);
      
      const completedLessons = (completedLessonsRecords || []).map(r => r.leicao_id);

      const fullData = this.getFullData();
      
      /**
       * Segurança: Limpa as respostas ("a") dos objetos do quiz.
       * Isso impede que usuários curiosos descubram o gabarito inspecionando a rede.
       */
      const removeAnswers = (obj) => {
        for (const age in obj) {
          if (obj[age].lessons) {
            for (const cat in obj[age].lessons) {
              obj[age].lessons[cat].forEach((lesson) => {
                if (lesson.quiz) {
                  lesson.quiz.forEach((q) => delete q.a);
                }
              });
            }
          }
        }
      };

      removeAnswers(fullData);

      // Cálculos matemáticos para a barra de progresso (porcentagem do nível)
      const xp = user?.infantil_xp || 0;
      const level = user?.infantil_level || 1;
      const xpPercentage = (xp / (level * 100)) * 100;

      res.json({
        userProfile: {
          xp: xp,
          level: level,
          hearts: user?.infantil_hearts || 5,
          completedLessons: completedLessons,
          xpPercentage: xpPercentage
        },
        infantil: fullData
      });
    } catch (error) {
      console.error('Erro ao buscar dados infantis:', error);
      res.status(500).json({ error: 'Erro interno ao carregar o Espaço Literário.' });
    }
  };

  /**
   * Verifica se o usuário acertou uma pergunta específica do quiz.
   * Se errar, o servidor diminui uma "Vida" (Coração) do banco de dados.
   */
  validateAnswer = async (req, res) => {
    try {
      const userId = req.usuario?.id;
      const { lessonId, questionIndex, selectedIndex } = req.body;

      if (!userId) return res.status(401).json({ error: 'Não autorizado.' });

      const fullData = this.getFullData();
      let foundQuestion = null;

      // Localiza a questão no banco de dados completo (que tem as respostas)
      for (const age in fullData) {
        for (const cat in fullData[age].lessons) {
          const lesson = fullData[age].lessons[cat].find((l) => l.id === lessonId);
          if (lesson && lesson.quiz[questionIndex]) {
            foundQuestion = lesson.quiz[questionIndex];
            break;
          }
        }
        if (foundQuestion) break;
      }

      if (!foundQuestion) return res.status(404).json({ error: 'Questão não encontrada.' });

      // Comparação: a opção escolhida pelo usuário é a correta?
      const isCorrect = selectedIndex === foundQuestion.a;
      
      const { data: user } = await supabase.from('usuarios').select('*').eq('id', userId).single();
      
      if (!user) {
        return res.status(401).json({ error: 'Sua conta não foi encontrada. Por favor, faça login novamente.' });
      }

      let currentHearts = user.infantil_hearts;

      // Penalidade por erro: tira uma vida
      if (!isCorrect) {
        currentHearts = Math.max(0, currentHearts - 1);
        await supabase.from('usuarios').update({ infantil_hearts: currentHearts }).eq('id', userId);
      }

      res.json({
        isCorrect,
        hearts: currentHearts,
        gameOver: currentHearts <= 0
      });

    } catch (error) {
      console.error('❌ Erro no backend (validateAnswer):', error);
      res.status(500).json({ error: 'Erro interno ao validar resposta.' });
    }
  };

  /**
   * Finaliza o quiz e entrega as recompensas de XP e Nível.
   * Calcula se o usuário passou de fase e se ganhou novas vidas.
   */
  finishQuiz = async (req, res) => {
    try {
      const userId = req.usuario?.id;
      const { lessonId, correctCount, totalQuestions, gameOverByHearts } = req.body;

      if (!userId) return res.status(401).json({ error: 'Acesso negado.' });

      // Regra: precisa acertar pelo menos metade para passar
      const percentage = (correctCount / totalQuestions) * 100;
      const passed = percentage >= 50 && !gameOverByHearts;
      
      const { data: user } = await supabase.from('usuarios').select('*').eq('id', userId).single();
      
      if (!user) {
        return res.status(401).json({ error: 'Sua conta não foi encontrada. Por favor, faça login novamente.' });
      }

      // Verifica se é a primeira vez que ele termina essa lição
      const { data: completedRecord } = await supabase
        .from('usuarios_leicoes_infantis')
        .select('*')
        .eq('usuario_id', userId)
        .eq('leicao_id', lessonId)
        .single();

      let xpGain = 0;
      let hpGain = 0;
      let icon, title, desc;

      if (gameOverByHearts) {
        icon = '💔';
        title = 'Vidas Esgotadas!';
        desc = 'Você perdeu todas as suas vidas. Releia a lição com atenção e tente novamente!';
      } else if (passed) {
        icon = '🎉';
        title = 'Excelente Trabalho!';
        desc = `Você acertou ${correctCount} de ${totalQuestions} perguntas e provou sua sabedoria!`;
        
        if (!completedRecord) {
          xpGain = 50; // XP cheio por primeira vitória
          hpGain = correctCount === totalQuestions ? 1 : 0; // Ganha vida se gabaritar
          await supabase.from('usuarios_leicoes_infantis').insert({ usuario_id: userId, leicao_id: lessonId });
        } else {
          xpGain = 10; // XP reduzido se estiver apenas revisando
        }
      } else {
        icon = '📖';
        title = 'Quase lá!';
        desc = `Você acertou ${correctCount} de ${totalQuestions}. Tente novamente para ganhar XP!`;
      }

      // Lógica de Subida de Nível: a cada 100 * Nível XP o usuário sobe
      let newXP = user.infantil_xp + xpGain;
      let newLevel = user.infantil_level;
      let newHearts = Math.min(5, user.infantil_hearts + hpGain);

      while (newXP >= (newLevel * 100)) {
        newXP -= (newLevel * 100);
        newLevel++;
      }

      // Salva o novo progresso conquistado
      await supabase.from('usuarios').update({
        infantil_xp: newXP,
        infantil_level: newLevel,
        infantil_hearts: newHearts
      }).eq('id', userId);

      res.json({
        result: { icon, title, desc, xpGain, hpGain },
        userProfile: { xp: newXP, level: newLevel, hearts: newHearts }
      });

    } catch (error) {
      console.error('❌ Erro no backend (finishQuiz):', error);
      res.status(500).json({ error: 'Erro interno ao processar recompensas.' });
    }
  };

  /**
   * Sincroniza o progresso manualmente (reserva para funções futuras).
   */
  saveProgress = async (req, res) => {
    try {
      const userId = req.usuario?.id;
      if (!userId) return res.status(401).json({ error: 'Acesso negado.' });

      const { xp, level, hearts } = req.body;

      await supabase.from('usuarios').update({
        infantil_xp: xp || 0,
        infantil_level: level || 1,
        infantil_hearts: typeof hearts !== 'undefined' ? hearts : 5
      }).eq('id', userId);

      res.json({ message: '✅ Dados sincronizados.' });
    } catch (error) {
      console.error('❌ Erro no backend (saveProgress):', error);
      res.status(500).json({ error: 'Erro ao sincronizar progresso.' });
    }
  };
}

module.exports = new InfantilController();

