const supabase = require('../database');

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
    const [{ count: totalFisico }, { count: totalDisponivel }] = await Promise.all([
      supabase.from('exemplares').select('*', { count: 'exact', head: true }).eq('livro_id', livroId).neq('condicao', 'perdido').is('deleted_at', null),
      supabase.from('exemplares').select('*', { count: 'exact', head: true }).eq('livro_id', livroId).eq('disponibilidade', 'disponivel').is('deleted_at', null)
    ]);

    const numTotal = totalFisico || 0;
    const numDisponivel = totalDisponivel || 0;

    await supabase.from('livros').update({
      exemplares: numTotal,
      exemplares_disponiveis: numDisponivel,
      status: numDisponivel > 0 ? 'disponivel' : 'alugado'
    }).eq('id', livroId);
  };

  listar = async (req, res) => {
    try {
      const { busca, page, limit } = req.query;

      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      let consulta = supabase
        .from('livros')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        consulta = consulta.or(`titulo.ilike.%${termoBusca}%,autor.ilike.%${termoBusca}%`);
      }

      consulta = consulta.order('created_at', { ascending: false }).range(deslocamento, deslocamento + limite - 1);

      const { data: registros, count: total, error } = await consulta;

      if (error) throw error;

      res.json({ 
        data: registros, 
        pages: Math.ceil((total || 0) / limite)
      });
    } catch (erro) {
      console.error('Erro ao listar livros:', erro);
      res.status(500).json({ error: 'Erro ao carregar o acervo de livros.' });
    }
  };

  listarExemplares = async (req, res) => {
    try {
      const { id } = req.params;

      const { data: livro } = await supabase
        .from('livros')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (!livro) return res.status(404).json({ error: 'Livro não encontrado.' });

      const { data: exemplares } = await supabase
        .from('exemplares')
        .select('id, codigo, disponibilidade, condicao, observacao, created_at')
        .eq('livro_id', id)
        .is('deleted_at', null)
        .order('id', { ascending: true });

      res.json({ 
        livro: { id: livro.id, titulo: livro.titulo, autor: livro.autor }, 
        exemplares: exemplares || []
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

      const { data: exemplarOriginal } = await supabase
        .from('exemplares')
        .select('*')
        .eq('id', exemplar_id)
        .is('deleted_at', null)
        .single();

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

      const { error } = await supabase
        .from('exemplares')
        .update(atualizacoes)
        .eq('id', exemplar_id);

      if (error) throw error;

      await this.recalcularContadores(exemplarOriginal.livro_id);

      const { data: exemplarAtualizado } = await supabase
        .from('exemplares')
        .select('*')
        .eq('id', exemplar_id)
        .is('deleted_at', null)
        .single();

      req.app.get('io').emit('refreshData', 'livros');

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

      const { data: novoLivro, error: insertError } = await supabase
        .from('livros')
        .insert({
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
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const listaExemplares = Array.from({ length: qtdExemplares }, (_, i) => ({
        livro_id: novoLivro.id,
        codigo: `EX-${novoLivro.id}-${String(i + 1).padStart(3, '0')}`,
        disponibilidade: 'disponivel',
        condicao: 'bom'
      }));
      
      const { error: exemplaresError } = await supabase.from('exemplares').insert(listaExemplares);
      if (exemplaresError) throw exemplaresError;

      req.app.get('io').emit('refreshData', 'livros');

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

      const { data: livroOriginal } = await supabase
        .from('livros')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

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

      if (Object.keys(dadosParaMudar).length > 0) {
        const { error } = await supabase.from('livros').update(dadosParaMudar).eq('id', id);
        if (error) throw error;
      }

      req.app.get('io').emit('refreshData', 'livros');

      res.json({ message: '✅ Informações do livro atualizadas com sucesso!' });
    } catch (erro) {
      console.error('Erro ao editar livro:', erro);
      res.status(500).json({ error: 'Erro ao processar alterações no livro.' });
    }
  };

  remover = async (req, res) => {
    try {
      const { id } = req.params;

      const { data: livro } = await supabase
        .from('livros')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (!livro) return res.status(404).json({ error: 'Livro não encontrado.' });

      const { count: totalAtivos } = await supabase
        .from('alugueis')
        .select('*', { count: 'exact', head: true })
        .eq('livro_id', id)
        .in('status', ['ativo', 'atrasado']);

      if ((totalAtivos || 0) > 0) {
        return res.status(400).json({ 
          error: `❌ Bloqueio: Este livro possui ${totalAtivos} empréstimo(s) pendente(s) de devolução.` 
        });
      }

      const { error } = await supabase.from('livros').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;

      req.app.get('io').emit('refreshData', 'livros');

      res.json({ message: '✅ Livro removido permanentemente do catálogo público.' });
    } catch (erro) {
      console.error('Erro ao remover livro:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar remover o livro.' });
    }
  };
}

module.exports = new LivroController();
