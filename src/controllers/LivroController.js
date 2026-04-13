const db = require('../database');

class LivroController {

  gerarLocalizacaoAutomatica(genero, autor) {
    const mapaCorredores = {
      'Literatura': 'L',
      'Ficção Científica': 'F',
      'Programação': 'P',
      'História': 'H',
      'Negócios': 'N',
      'Outros': 'O'
    };
    
    const corredor = mapaCorredores[genero] || 'O';
    
    const inicial = autor ? autor.trim().toUpperCase().charCodeAt(0) : 65;
    let prateleira = '1';
    
    if (inicial >= 65 && inicial <= 69) prateleira = '1';
    else if (inicial >= 70 && inicial <= 74) prateleira = '2';
    else if (inicial >= 75 && inicial <= 79) prateleira = '3';
    else if (inicial >= 80 && inicial <= 84) prateleira = '4';
    else prateleira = '5';
    
    return { corredor, prateleira };
  }

  recalcularContadores = async (livroId) => {
    const [totalFisico, totalDisponivel] = await Promise.all([
      db('exemplares').where({ livro_id: livroId }).whereNot({ condicao: 'perdido' }).whereNull('deleted_at').count('id as total').first(),
      db('exemplares').where({ livro_id: livroId, disponibilidade: 'disponivel' }).whereNull('deleted_at').count('id as disponiveis').first()
    ]);

    const numTotal = Number(totalFisico.total);
    const numDisponivel = Number(totalDisponivel.disponiveis);

    await db('livros').where({ id: livroId }).update({
      exemplares: numTotal,
      exemplares_disponiveis: numDisponivel,
      status: numDisponivel > 0 ? 'disponivel' : 'alugado'
    });
  };

  listar = async (req, res) => {
    try {
      const { status, busca, page, limit, sort, order, categoria, ano, condicao } = req.query;

      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      const colunasPermitidas = ['titulo', 'autor', 'genero', 'ano_lancamento', 'status', 'created_at'];
      const colunaOrdenacao = colunasPermitidas.includes(String(sort)) ? String(sort) : 'titulo';
      const direcaoOrdenacao = order === 'desc' ? 'desc' : 'asc';

      let consulta = db('livros').whereNull('deleted_at');

      if (status === 'disponivel') {
        consulta = consulta.where('exemplares_disponiveis', '>', 0);
      } else if (status === 'alugado') {
        consulta = consulta.where({ status: 'alugado' });
      }

      if (condicao && String(condicao).trim()) {
        consulta = consulta.whereExists(function() {
          this.select('*')
            .from('exemplares')
            .whereRaw('exemplares.livro_id = livros.id')
            .where('condicao', String(condicao).trim())
            .whereNull('deleted_at');
        });
      }

      if (categoria && String(categoria).trim()) {
        consulta = consulta.whereILike('genero', String(categoria).trim());
      }

      if (ano && String(ano).trim()) {
        consulta = consulta.where('ano_lancamento', parseInt(String(ano)));
      }

      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        const queryTermo = `%${termoBusca}%`;
        consulta = consulta.where(builder =>
          builder.whereILike('titulo', queryTermo)
            .orWhereILike('autor', queryTermo)
            .orWhereILike('genero', queryTermo)
            .orWhereRaw('CAST(ano_lancamento AS CHAR) LIKE ?', [queryTermo])
        );
      }

      const [registros, contagem] = await Promise.all([
        consulta.clone().select('*').orderBy(colunaOrdenacao, direcaoOrdenacao).limit(limite).offset(deslocamento),
        consulta.clone().count('id as total')
      ]);

      const totalGeral = Number(contagem[0].total);

      let latestBook = null;
      if (pagina === 1 && !busca && !categoria && !ano && !status) {
        const latest = await db('livros')
          .whereNull('deleted_at')
          .orderBy('created_at', 'desc')
          .first();
        latestBook = latest;
      }

      const idsLivros = registros.map(r => r.id);
      let mapaCondicoes = {};

      if (idsLivros.length > 0) {
        const resumoCondicoes = await db('exemplares')
          .whereIn('livro_id', idsLivros)
          .whereNull('deleted_at')
          .select('livro_id', 'condicao')
          .count('id as qtd')
          .groupBy('livro_id', 'condicao');

        for (const item of resumoCondicoes) {
          const idStr = String(item.livro_id);
          if (!mapaCondicoes[idStr]) {
            mapaCondicoes[idStr] = {};
          }
          mapaCondicoes[idStr][item.condicao] = Number(item.qtd);
        }
      }

      const dadosFormatados = registros.map(livro => ({
        ...livro,
        resumo_condicao: mapaCondicoes[String(livro.id)] ?? {}
      }));

      res.json({ 
        data: dadosFormatados, 
        pages: Math.ceil(totalGeral / limite),
        latest_book: latestBook
      });
    } catch (erro) {
      console.error('Erro ao listar livros:', erro);
      res.status(500).json({ error: 'Erro ao carregar o acervo de livros.' });
    }
  };

  carregarFiltros = async (req, res) => {
    try {
      const categorias = await db('livros')
        .whereNull('deleted_at')
        .select('genero')
        .distinct()
        .orderBy('genero', 'asc');

      const anos = await db('livros')
        .whereNull('deleted_at')
        .select('ano_lancamento')
        .distinct()
        .orderBy('ano_lancamento', 'desc');

      const listaCategorias = categorias.map((c) => c.genero || 'Não Informado');
      const listaAnos = anos.map((a) => a.ano_lancamento).filter(Boolean);

      res.json({
        categorias: listaCategorias,
        anos: listaAnos
      });
    } catch (erro) {
      console.error('Erro ao carregar filtros:', erro);
      res.status(500).json({ error: 'Erro ao carregar filtros.' });
    }
  };

  listarExemplares = async (req, res) => {
    try {
      const { id } = req.params;

      const livro = await db('livros').where({ id }).whereNull('deleted_at').first();
      if (!livro) return res.status(404).json({ error: 'Livro não encontrado.' });

      const exemplares = await db('exemplares')
        .where({ livro_id: id })
        .whereNull('deleted_at')
        .select('id', 'codigo', 'disponibilidade', 'condicao', 'observacao', 'created_at')
        .orderBy('id', 'asc');

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

  atualizarExemplar = async (req, res) => {
    try {
      const { exemplar_id } = req.params;
      const { status, condicao, observacao } = req.body;

      const exemplarOriginal = await db('exemplares').where({ id: exemplar_id }).whereNull('deleted_at').first();
      if (!exemplarOriginal) return res.status(404).json({ error: 'Exemplar não encontrado.' });

      const atualizacoes = { observacao: observacao?.trim() || null };

      if (condicao !== undefined) {
        const permitidos = ['bom', 'danificado', 'perdido'];
        if (!permitidos.includes(condicao)) {
          return res.status(400).json({ error: 'Condição física deve ser: bom, danificado ou perdido.' });
        }
        
        atualizacoes.condicao = condicao;
        
        if (condicao === 'perdido') {
          atualizacoes.disponibilidade = 'perdido';
        } else if (exemplarOriginal.disponibilidade === 'perdido') {
          atualizacoes.disponibilidade = 'disponivel';
        }
      }

      if (status !== undefined) {
        const permitidos = ['disponivel', 'emprestado', 'indisponivel', 'perdido'];
        if (!permitidos.includes(status)) {
          return res.status(400).json({ error: 'Disponibilidade deve ser: disponivel, emprestado, indisponivel ou perdido.' });
        }

        if (exemplarOriginal.disponibilidade === 'emprestado' && status === 'disponivel') {
          return res.status(400).json({ error: 'Para devolver este livro à prateleira, use a tela de devolução de empréstimos.' });
        }

        const condicaoFinal = atualizacoes.condicao || exemplarOriginal.condicao;
        if (status === 'disponivel' && condicaoFinal === 'perdido') {
          return res.status(400).json({ error: 'Não é possível disponibilizar um exemplar que consta como perdido no inventário.' });
        }
        
        atualizacoes.disponibilidade = status;
      }

      await db('exemplares').where({ id: exemplar_id }).update(atualizacoes);

      await this.recalcularContadores(exemplarOriginal.livro_id);

      const exemplarAtualizado = await db('exemplares').where({ id: exemplar_id }).whereNull('deleted_at').first();
      res.json({ message: '✅ Inventário atualizado com sucesso!', exemplar: exemplarAtualizado });
    } catch (erro) {
      console.error('Erro ao atualizar exemplar:', erro);
      res.status(500).json({ error: 'Erro ao atualizar dados do exemplar físico.' });
    }
  };

  cadastrar = async (req, res) => {
    try {
      const { titulo, autor, ano_lancamento, genero, exemplares, capa_url } = req.body;

      if (!titulo?.trim() || !autor?.trim()) {
        return res.status(400).json({ error: 'Título e Autor são campos obrigatórios.' });
      }

      const anoNum = parseInt(ano_lancamento);
      const anoAtual = new Date().getFullYear();
      if (isNaN(anoNum) || anoNum < 500 || anoNum > anoAtual + 1) {
        return res.status(400).json({ error: `Ano de lançamento inválido.` });
      }

      const qtdExemplares = Math.min(999, Math.max(1, parseInt(exemplares) || 1));
      const g = genero?.trim() || 'Outros';
      const localizacao = this.gerarLocalizacaoAutomatica(g, autor);

      await db.transaction(async (trx) => {
        const [novoLivroId] = await trx('livros').insert({
          titulo: titulo.trim(),
          autor: autor.trim(),
          ano_lancamento: anoNum,
          genero: genero?.trim() || 'Não Informado',
          corredor: localizacao.corredor,
          prateleira: localizacao.prateleira,
          exemplares: qtdExemplares,
          exemplares_disponiveis: qtdExemplares,
          capa_url: capa_url || null,
          status: 'disponivel'
        });

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

  editar = async (req, res) => {
    try {
      const { id } = req.params;
      const { titulo, autor, ano_lancamento, genero, exemplares, capa_url } = req.body;

      const livroOriginal = await db('livros').where({ id }).whereNull('deleted_at').first();
      if (!livroOriginal) return res.status(404).json({ error: 'Livro não encontrado.' });

      const dadosParaMudar = {};
      
      if (titulo !== undefined) dadosParaMudar.titulo = titulo.trim();
      if (autor !== undefined) dadosParaMudar.autor = autor.trim();
      if (genero !== undefined) dadosParaMudar.genero = genero.trim() || 'Não Informado';
      if (capa_url !== undefined) dadosParaMudar.capa_url = capa_url;
      
      const novoGenero = dadosParaMudar.genero ?? livroOriginal.genero;
      const novoAutor = dadosParaMudar.autor ?? livroOriginal.autor;
      const novaLoc = this.gerarLocalizacaoAutomatica(novoGenero, novoAutor);
      dadosParaMudar.corredor = novaLoc.corredor;
      dadosParaMudar.prateleira = novaLoc.prateleira;

      if (ano_lancamento !== undefined) {
        const ano = parseInt(ano_lancamento);
        if (!isNaN(ano)) dadosParaMudar.ano_lancamento = ano;
      }

      if (exemplares !== undefined) {
        const novaQtd = Math.max(1, parseInt(exemplares) || 1);
        const diferenca = novaQtd - livroOriginal.exemplares;

        if (diferenca > 0) {
          const { maxId } = await db('exemplares').where({ livro_id: id }).max('id as maxId').first();
          const novosExemplares = Array.from({ length: diferenca }, (_, i) => ({
            livro_id: Number(id),
            codigo: `EX-${id}-${String(Number(maxId) + i + 1).padStart(3, '0')}`,
            disponibilidade: 'disponivel',
            condicao: 'bom'
          }));
          await db('exemplares').insert(novosExemplares);
        } else if (diferenca < 0) {
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

          await db('exemplares').whereIn('id', exemplaresDeletaveis.map(e => e.id)).update({ deleted_at: new Date() });
        }

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

  remover = async (req, res) => {
    try {
      const { id } = req.params;

      const livro = await db('livros').where({ id }).whereNull('deleted_at').first();
      if (!livro) return res.status(404).json({ error: 'Livro não encontrado.' });

      const [{ totalAtivos }] = await db('alugueis')
        .where({ livro_id: id })
        .whereIn('status', ['ativo', 'atrasado'])
        .count('id as totalAtivos');

      if (Number(totalAtivos) > 0) {
        return res.status(400).json({ 
          error: `❌ Bloqueio: Este livro possui ${totalAtivos} empréstimo(s) pendente(s) de devolução.` 
        });
      }

      await db('livros').where({ id }).update({ deleted_at: new Date() });
      res.json({ message: '✅ Livro removido permanentemente do catálogo público.' });
    } catch (erro) {
      console.error('Erro ao remover livro:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar remover o livro.' });
    }
  };
}

module.exports = new LivroController();
