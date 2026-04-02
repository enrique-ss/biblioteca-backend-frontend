import { Request, Response } from 'express';

export class InfantilController {
  
  public getData = async (req: Request, res: Response) => {
    const data = {
      infantil: {
        greeting: "Olá, Pequeno Leitor! 📚",
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
              description: "A *poesia* é a arte de pintar com as palavras. É quando escrevemos não apenas para informar, mas para fazer o coração *sentir* a música que existe no papel.",
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
              description: "Hans Christian Andersen nasceu na *Dinamarca* e transformou seus sentimentos em contos que o mundo inteiro lê até hoje. Ele amava criar seres *mágicos*!",
              meta: "1805–1875 • Dinamarca",
              highlights: [
                { icon: '🦢', title: 'O Patinho Feio', text: 'Uma história poderosa sobre *aceitação*. Mostra que todos temos nossa própria beleza, mesmo que demore a aparecer.' },
                { icon: '🌊', title: 'A Pequena Sereia', text: 'Diferente do filme, o conto original fala sobre o desejo de ter uma *alma* e o sacrifício por quem amamos.' },
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
              description: "Cora era uma doceira que vivia em uma casa antiga no interior de *Goiás*. Ela escrevia sobre as coisas simples da vida: o fogão a lenha, os becos e as *pessoas simples*.",
              meta: "1889—1985 • Goiás, Brasil",
              highlights: [
                { icon: '👵', title: 'Sabedoria', text: 'Ela provou que a *educação* e a arte não têm idade. Publicou seu primeiro grande livro aos *76 anos*!' },
                { icon: '✍️', title: 'Poesia do Cotidiano', text: 'Suas palavras transformavam coisas comuns, como fazer um doce, em momentos de pura *magia literária*.' },
                { icon: '🏘️', title: 'Os Becos de Goiás', text: 'Cora amava sua terra natal e descrevia as ruas de pedra com um *carinho* que transbordava em seus poemas.' }
              ],
              funFact: "Cora Coralina não terminou a escola, mas se tornou uma das maiores doutoras da literatura brasileira por causa de seu *talento puro*!",
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
        categories: [
          { id: 'contos', name: 'Contos Brasileiros', icon: '🏜️', color: 'var(--accent)' },
          { id: 'poesia', name: 'Poesia Moderna', icon: '🎭', color: '#6a5ae0' }
        ],
        lessons: {
          contos: [
            {
              id: 'ij_c1', title: 'Contos do Brasil', icon: '🏜️', requiredLevel: 1,
              description: "A literatura brasileira é um caldeirão de culturas. Nossos contos viajam do sertão seco às cidades grandes, sempre com muita *brasilidade*!",
              highlights: [
                { icon: '🌳', title: 'Raízes Indígenas', text: 'Muitas de nossas histórias vêm das lendas que explicam a *natureza* e a criação do mundo.' },
                { icon: '🌵', title: 'O Sertão Profundo', text: 'Escritores como Guimarães Rosa transformaram o interior do Brasil em um lugar de *mistério e filosofia*.' },
                { icon: '🏙️', title: 'A Crônica Urbana', text: 'Mostra como a vida nas grandes cidades também pode ser cheia de *histórias emocionantes* e humanas.' }
              ],
              funFact: "Machado de Assis, nosso maior escritor, começou escrevendo contos em jornais antes de se tornar o mestre que conhecemos!",
              quiz: [
                { q: "O que torna os contos brasileiros especiais?", opts: ["Só falam de reis", "Misturam culturas indígenas, africanas e europeias", "São todos iguais", "Só falam de animais"], a: 1 },
                { q: "Qual é um tema comum nos contos brasileiros?", opts: ["Castelos medievais", "Sertão e caatinga", "Ninjas", "Dragões"], a: 1 }
              ]
            }
          ],
          poesia: [
            {
              id: 'ij_p1', title: 'Lira dos Vinte Anos', icon: '🎭', requiredLevel: 1,
              description: "Álvares de Azevedo foi o maior poeta do nosso *Ultrarromantismo*. Sua poesia fala de sonhos, mistérios e uma melancolia profunda.",
              meta: "1831—1852 • São Paulo, Brasil",
              highlights: [
                { icon: '🌙', title: 'O Lado Sombrio', text: 'Sua poesia explora temas como a *noite*, o mistério e o sonho, típicos da segunda geração romântica.' },
                { icon: '💔', title: 'Sentimentalismo', text: 'A expressão máxima dos *sentimentos* juvenis, entre o amor idealizado e a tristeza.' }
              ],
              funFact: "Ele morreu com apenas 20 anos, mas deixou uma obra tão importante que influenciou gerações de poetas brasileiros!",
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
        categories: [
          { id: 'teoria', name: 'Teoria Literária', icon: '📖', color: 'var(--accent)' },
          { id: 'brasileira', name: 'Literatura Brasileira', icon: '🇧🇷', color: '#00d68f' }
        ],
        lessons: {
          teoria: [
            {
              id: 'pa_t1', title: 'Teoria Literária', icon: '📖', requiredLevel: 1,
              description: "A teoria literária nos dá as *lentes* para enxergar o que está escondido nas entrelinhas de um livro. É a ciência de *interpretar* a arte!",
              highlights: [
                { icon: '📚', title: 'Estruturalismo', text: 'Analisa como o texto é montado, como se fosse a *engenharia* de uma ponte feita de palavras.' },
                { icon: '👤', title: 'Psicanálise', text: 'Investiga os desejos e medos dos *personagens*, tratando-os como se fossem pessoas reais com subconsciente.' },
                { icon: '🌍', title: 'Sociocrítica', text: 'Mostra como o momento *histórico* e a sociedade influenciam o que o autor escreveu.' }
              ],
              funFact: "A teoria literária moderna começou pra valer no início do século XX, quando estudiosos decidiram tratar a literatura como algo *científico*!",
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
                { icon: '😏', title: 'Ironia Machadiana', text: 'Uma forma elegante de criticar a sociedade carioca do século XIX com muito *humor ácido*.' }
              ],
              funFact: "Machado foi um dos fundadores da *Academia Brasileira de Letras* e seu primeiro presidente!",
              quiz: [
                { q: "Qual era a principal característica do Realismo de Machado?", opts: ["Falar de fadas", "Análise psicológica e ironia", "Aventuras no mar", "Poesia religiosa"], a: 1 },
                { q: "Onde Machado de Assis nasceu?", opts: ["São Paulo", "Rio de Janeiro", "Goiás", "Minas Gerais"], a: 1 }
              ]
            }
          ]
        }
      }
    };

    res.json(data);
  };
}
