import { Response } from 'express';
import db from '../database';
import { RequisicaoAutenticada } from '../middlewares/auth';

/**
 * Controlador de Acervo: Gerencia Livros e seus Exemplares físicos.
 */
export class LivroController {

  /**
   * Gera uma localização fictícia (Corredor e Prateleira) para novos livros.
   */
  private gerarLocalizacaoAutomatica() {
    const corredores = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const prateleiras = ['1', '2', '3', '4', '5'];
    
    return {
      corredor: corredores[Math.floor(Math.random() * corredores.length)],
      prateleira: prateleiras[Math.floor(Math.random() * prateleiras.length)]
    };
  }

  /**
   * Função Auxiliar: Recalcula os contadores de exemplares de um livro
   * sempre que uma cópia é adicionada, removida ou alterada fisicamente.
   */
  private recalcularContadores = async (livroId: number) => {
    // Busca as contagens em paralelo no banco de dados para maior eficiência
    const [totalFisico, totalDisponivel] = await Promise.all([
      // Apenas exemplares que NÃO foram marcados como 'perdido'
      db('exemplares').where({ livro_id: livroId }).whereNot({ condicao: 'perdido' }).count('id as total').first() as Promise<any>,
      // Apenas exemplares que estão de fato na prateleira ('disponivel')
      db('exemplares').where({ livro_id: livroId, disponibilidade: 'disponivel' }).count('id as disponiveis').first() as Promise<any>
    ]);

    const numTotal = Number(totalFisico.total);
    const numDisponivel = Number(totalDisponivel.disponiveis);

    // Atualiza o registro do Livro "Pai" com os novos números consolidados
    await db('livros').where({ id: livroId }).update({
      exemplares: numTotal,
      exemplares_disponiveis: numDisponivel,
      // Se não houver nenhum disponível, o status global muda para 'alugado'
      status: numDisponivel > 0 ? 'disponivel' : 'alugado'
    });
  };

  // Listagem de livros com filtros avançados
  listar = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { status, busca, page, limit, sort, order } = req.query;

      // Sanitização de paginação e ordenação
      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      const colunasPermitidas = ['titulo', 'autor', 'genero', 'ano_lancamento', 'status', 'created_at'];
      const colunaOrdenacao = colunasPermitidas.includes(String(sort)) ? String(sort) : 'titulo';
      const direcaoOrdenacao = order === 'desc' ? 'desc' : 'asc';

      let consulta = db('livros').whereNull('deleted_at');

      // Filtro por disponibilidade rápida
      if (status === 'disponivel') {
        consulta = consulta.where('exemplares_disponiveis', '>', 0);
      } else if (status === 'alugado') {
        consulta = consulta.where({ status: 'alugado' });
      }

      // Filtro de busca textual (Título, Autor ou Gênero)
      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        const queryTermo = `%${termoBusca}%`;
        consulta = consulta.where(builder =>
          builder.whereILike('titulo', queryTermo)
            .orWhereILike('autor', queryTermo)
            .orWhereILike('genero', queryTermo)
        );
      }

      // Executa consulta dos dados e contagem total simultaneamente
      const [registros, contagem] = await Promise.all([
        consulta.clone().select('*').orderBy(colunaOrdenacao, direcaoOrdenacao).limit(limite).offset(deslocamento),
        consulta.clone().count('id as total')
      ]);

      const listaLivros = registros as any[];
      const totalGeral = Number(contagem[0].total);

      // Agrupa informações de condição física para cada livro na lista
      const idsLivros = listaLivros.map(r => r.id);
      let mapaCondicoes: Record<string, any> = {};

      if (idsLivros.length > 0) {
        const resumoCondicoes = await db('exemplares')
          .whereIn('livro_id', idsLivros)
          .select('livro_id', 'condicao')
          .count('id as qtd')
          .groupBy('livro_id', 'condicao');

        for (const item of resumoCondicoes as any[]) {
          const idStr = String(item.livro_id);
          if (!mapaCondicoes[idStr]) {
            mapaCondicoes[idStr] = {};
          }
          mapaCondicoes[idStr][item.condicao as string] = Number(item.qtd);
        }
      }

      // Formata o retorno final com os contadores de condição
      const dadosFormatados = listaLivros.map(livro => ({
        ...livro,
        resumo_condicao: mapaCondicoes[String(livro.id)] ?? {}
      }));

      res.json({ 
        data: dadosFormatados, 
        total: totalGeral, 
        page: pagina, 
        limit: limite, 
        pages: Math.ceil(totalGeral / limite) 
      });
    } catch (erro) {
      console.error('Erro ao listar livros:', erro);
      res.status(500).json({ error: 'Erro ao carregar o acervo de livros.' });
    }
  };

  // Retorna os exemplares físicos vinculados a um livro específico
  listarExemplares = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { id } = req.params;

      const livro = await db('livros').where({ id }).whereNull('deleted_at').first();
      if (!livro) return res.status(404).json({ error: 'Livro não encontrado.' });

      const exemplares = await db('exemplares')
        .where({ livro_id: id })
        .select('id', 'codigo', 'disponibilidade', 'condicao', 'observacao', 'created_at')
        .orderBy('id', 'asc');

      // Enriquece os exemplares com informações do último empréstimo (histórico)
      const listaEnriquecida = await Promise.all(
        exemplares.map(async (ex) => {
          const ultimoAluguel = await db('alugueis')
            .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
            .where({ 'alugueis.exemplar_id': ex.id })
            .select(
              'alugueis.id as aluguel_id',
              'usuarios.nome as usuario',
              'alugueis.data_aluguel',
              'alugueis.data_prevista_devolucao as prazo',
              'alugueis.status as status_aluguel'
            )
            .orderBy('alugueis.id', 'desc')
            .first();
            
          return { ...ex, ultimo_aluguel: ultimoAluguel || null };
        })
      );

      res.json({ 
        livro: { id: livro.id, titulo: livro.titulo, autor: livro.autor }, 
        exemplares: listaEnriquecida 
      });
    } catch (erro) {
      console.error('Erro ao listar exemplares:', erro);
      res.status(500).json({ error: 'Erro ao carregar exemplares físicos.' });
    }
  };

  // Atualiza manualmente o estado ou disponibilidade de uma cópia física
  atualizarExemplar = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { exemplar_id } = req.params;
      const { status, condicao, observacao } = req.body;

      const exemplarOriginal = await db('exemplares').where({ id: exemplar_id }).first();
      if (!exemplarOriginal) return res.status(404).json({ error: 'Exemplar não encontrado.' });

      const atualizacoes: any = { observacao: observacao?.trim() || null };

      // Validação e lógica de alteração de Condição Física
      if (condicao !== undefined) {
        const permitidos = ['bom', 'danificado', 'perdido'];
        if (!permitidos.includes(condicao)) {
          return res.status(400).json({ error: 'Condição física deve ser: bom, danificado ou perdido.' });
        }
        
        atualizacoes.condicao = condicao;
        
        // Regra Automática: Se o exemplar foi perdido fisicamente, ele deixa de estar disponível para empréstimo
        if (condicao === 'perdido') {
          atualizacoes.disponibilidade = 'perdido';
        } else if (exemplarOriginal.disponibilidade === 'perdido') {
          // Se estava marcado como perdido e mudou para bom/danificado, volta a ficar disponível biblioteca
          atualizacoes.disponibilidade = 'disponivel';
        }
      }

      // Validação de alteração de Disponibilidade (Uso logístico)
      if (status !== undefined) {
        const permitidos = ['disponivel', 'emprestado', 'indisponivel', 'perdido'];
        if (!permitidos.includes(status)) {
          return res.status(400).json({ error: 'Disponibilidade deve ser: disponivel, emprestado, indisponivel ou perdido.' });
        }

        // Bloqueio de Segurança: Não permite "disponibilizar" um exemplar que está em mãos de um aluno sem o fluxo de devolução
        if (exemplarOriginal.disponibilidade === 'emprestado' && status === 'disponivel') {
          return res.status(400).json({ error: 'Para devolver este livro à prateleira, use a tela de devolução de empréstimos.' });
        }

        // Bloqueio de Segurança: Exemplares perdidos fisicamente não podem ser marcados como disponíveis na prateleira
        const condicaoFinal = atualizacoes.condicao || exemplarOriginal.condicao;
        if (status === 'disponivel' && condicaoFinal === 'perdido') {
          return res.status(400).json({ error: 'Não é possível disponibilizar um exemplar que consta como perdido no inventário.' });
        }
        
        atualizacoes.disponibilidade = status;
      }

      await db('exemplares').where({ id: exemplar_id }).update(atualizacoes);

      // Garante que os números totais do livro estejam sincronizados após a mudança
      await this.recalcularContadores(exemplarOriginal.livro_id);

      const exemplarAtualizado = await db('exemplares').where({ id: exemplar_id }).first();
      res.json({ message: '✅ Inventário atualizado com sucesso!', exemplar: exemplarAtualizado });
    } catch (erro) {
      console.error('Erro ao atualizar exemplar:', erro);
      res.status(500).json({ error: 'Erro ao atualizar dados do exemplar físico.' });
    }
  };

  // Cadastro de novo livro com geração automática de exemplares iniciais
  cadastrar = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { titulo, autor, ano_lancamento, genero, isbn, exemplares } = req.body;

      if (!titulo?.trim() || !autor?.trim()) {
        return res.status(400).json({ error: 'Título e Autor são campos obrigatórios.' });
      }

      const anoNum = parseInt(ano_lancamento);
      const anoAtual = new Date().getFullYear();
      if (isNaN(anoNum) || anoNum < 500 || anoNum > anoAtual + 1) {
        return res.status(400).json({ error: `Ano de lançamento inválido.` });
      }

      const qtdExemplares = Math.min(999, Math.max(1, parseInt(exemplares) || 1));
      const localizacao = this.gerarLocalizacaoAutomatica();

      // Executa a operação dentro de uma Transação para garantir integridade (Livro + Exemplares)
      await db.transaction(async (trx) => {
        const [novoLivroId] = await trx('livros').insert({
          titulo: titulo.trim(),
          autor: autor.trim(),
          ano_lancamento: anoNum,
          genero: genero?.trim() || 'Não Informado',
          isbn: isbn?.trim() || null,
          corredor: localizacao.corredor,
          prateleira: localizacao.prateleira,
          exemplares: qtdExemplares,
          exemplares_disponiveis: qtdExemplares,
          status: 'disponivel'
        });

        // Cria as cópias físicas individuais
        const listaExemplares = Array.from({ length: qtdExemplares }, (_, i) => ({
          livro_id: novoLivroId,
          codigo: `EX-${novoLivroId}-${String(i + 1).padStart(3, '0')}`,
          disponibilidade: 'disponivel',
          condicao: 'bom'
        }));
        
        await trx('exemplares').insert(listaExemplares);
      });

      res.status(201).json({
        message: '✅ Livro e exemplares cadastrados com sucesso!',
        localizacao: `Corredor ${localizacao.corredor}, Prateleira ${localizacao.prateleira}`
      });
    } catch (erro) {
      console.error('Erro ao cadastrar livro:', erro);
      res.status(500).json({ error: 'Falha ao incluir livro no acervo.' });
    }
  };

  // Edição de informações básicas e ajuste no volume de exemplares
  editar = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { id } = req.params;
      const { titulo, autor, ano_lancamento, genero, isbn, exemplares } = req.body;

      const livroOriginal = await db('livros').where({ id }).whereNull('deleted_at').first();
      if (!livroOriginal) return res.status(404).json({ error: 'Livro não encontrado.' });

      const dadosParaMudar: any = {};
      
      if (titulo !== undefined) dadosParaMudar.titulo = titulo.trim();
      if (autor !== undefined) dadosParaMudar.autor = autor.trim();
      if (genero !== undefined) dadosParaMudar.genero = genero.trim() || 'Não Informado';
      if (isbn !== undefined) dadosParaMudar.isbn = isbn.trim() || null;
      if (ano_lancamento !== undefined) {
        const ano = parseInt(ano_lancamento);
        if (!isNaN(ano)) dadosParaMudar.ano_lancamento = ano;
      }

      // Gestão de Inventário Dinâmica: Aumentar ou diminuir cópias físicas
      if (exemplares !== undefined) {
        const novaQtd = Math.max(1, parseInt(exemplares) || 1);
        const diferenca = novaQtd - livroOriginal.exemplares;

        if (diferenca > 0) {
          // Adiciona as novas cópias
          const { maxId } = await db('exemplares').where({ livro_id: id }).max('id as maxId').first() as any;
          const novosExemplares = Array.from({ length: diferenca }, (_, i) => ({
            livro_id: Number(id),
            codigo: `EX-${id}-${String(Number(maxId) + i + 1).padStart(3, '0')}`,
            disponibilidade: 'disponivel',
            condicao: 'bom'
          }));
          await db('exemplares').insert(novosExemplares);
        } else if (diferenca < 0) {
          // Remove as cópias excedentes (apenas se estiverem disponíveis na biblioteca)
          const absDiff = Math.abs(diferenca);
          const exemplaresDeletaveis = await db('exemplares')
            .where({ livro_id: id, disponibilidade: 'disponivel' })
            .limit(absDiff)
            .select('id');

          if (exemplaresDeletaveis.length < absDiff) {
            return res.status(400).json({
              error: `Redução negada: existem apenas ${exemplaresDeletaveis.length} cópias disponíveis no momento. Outras estão em empréstimo.`
            });
          }

          await db('exemplares').whereIn('id', exemplaresDeletaveis.map(e => e.id)).del();
        }

        // Força a atualização dos contadores após o ajuste
        await this.recalcularContadores(Number(id));
      }

      if (Object.keys(dadosParaMudar).length > 0) {
        await db('livros').where({ id }).update(dadosParaMudar);
      }

      res.json({ message: '✅ Informações do livro atualizadas com sucesso!' });
    } catch (erro) {
      console.error('Erro ao editar livro:', erro);
      res.status(500).json({ error: 'Erro ao processar alterações no livro.' });
    }
  };

  // Exclusão lógica (Soft Delete) do livro
  remover = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { id } = req.params;

      const livro = await db('livros').where({ id }).whereNull('deleted_at').first();
      if (!livro) return res.status(404).json({ error: 'Livro não encontrado.' });

      // Verificação de Segurança: Não permite remover se houver empréstimos ativos ou atrasados
      const [{ totalAtivos }] = await db('alugueis')
        .where({ livro_id: id })
        .whereIn('status', ['ativo', 'atrasado'])
        .count('id as totalAtivos');

      if (Number(totalAtivos) > 0) {
        return res.status(400).json({ 
          error: `❌ Bloqueio: Este livro possui ${totalAtivos} empréstimo(s) pendente(s) de devolução.` 
        });
      }

      // Marca como deletado (não apaga do banco por questões de histórico financeiro/estatístico)
      await db('livros').where({ id }).update({ deleted_at: new Date() });
      res.json({ message: '✅ Livro removido permanentemente do catálogo público.' });
    } catch (erro) {
      console.error('Erro ao remover livro:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar remover o livro.' });
    }
  };
}