const supabase = require('../database');

/**
  * LivroController: Responsável pela gestão do acervo físico da biblioteca.
  * Controla o cadastro de títulos, o inventário de exemplares individuais e a localização física nas estantes.
  */
class LivroController {

  /**
   * Ajuda a organizar a biblioteca automaticamente.
   * Define um corredor baseado no gênero literário e uma prateleira pela letra inicial do autor.
   */
  gerarLocalizacaoAutomatica(genero, autor) {
    // Mapa que associa cada gênero a um corredor específico
    const mapaCorredores = {
      'Literatura': 'L',
      'Ficção Científica': 'F',
      'Programação': 'P',
      'História': 'H',
      'Negócios': 'N',
      'Outros': 'O'
    };
    
    const corredor = mapaCorredores[genero] || 'O';
    
    // Organiza autores em prateleiras por ordem alfabética
    const inicial = autor ? autor.trim().toUpperCase().charCodeAt(0) : 65;
    let prateleira = '1';
    
    if (inicial >= 65 && inicial <= 69) prateleira = '1'; // A-E
    else if (inicial >= 70 && inicial <= 74) prateleira = '2'; // F-J
    else if (inicial >= 75 && inicial <= 79) prateleira = '3'; // K-O
    else if (inicial >= 80 && inicial <= 84) prateleira = '4'; // P-T
    else prateleira = '5'; // U-Z
    
    return { corredor, prateleira };
  }

  /**
   * Mantém os números do livro sempre atualizados.
   * Toda vez que um exemplar é alugado, devolvido ou perdido, esta função conta
   * quantos exemplares existem no total e quantos estão livres para empréstimo.
   */
  recalcularContadores = async (livroId) => {
    // Busca e conta na base de dados os exemplares ativos e os disponíveis
    const [{ count: totalFisico }, { count: totalDisponivel }] = await Promise.all([
      supabase.from('exemplares').select('*', { count: 'exact', head: true }).eq('livro_id', livroId).neq('condicao', 'perdido').is('deleted_at', null),
      supabase.from('exemplares').select('*', { count: 'exact', head: true }).eq('livro_id', livroId).eq('disponibilidade', 'disponivel').is('deleted_at', null)
    ]);

    const numTotal = totalFisico || 0;
    const numDisponivel = totalDisponivel || 0;

    // Atualiza o registro do livro com os novos totais calculados
    await supabase.from('livros').update({
      exemplares: numTotal,
      exemplares_disponiveis: numDisponivel,
      status: numDisponivel > 0 ? 'disponivel' : 'alugado'
    }).eq('id', livroId);
  };

  /**
   * Busca e exibe os livros do catálogo para os usuários.
   * Suporta busca por texto (título/autor) e filtros por categoria ou ano.
   */
  listar = async (req, res) => {
    try {
      const { busca, page, limit } = req.query;

      // Define a página e a quantidade de itens por vez (paginação)
      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      let consulta = supabase
        .from('livros')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      // Se o usuário digitar algo na busca, filtramos nos campos principais
      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        consulta = consulta.or(`titulo.ilike.%${termoBusca}%,autor.ilike.%${termoBusca}%,genero.ilike.%${termoBusca}%`);
      }

      // Aplica filtros específicos se fornecidos pelo frontend
      const { categoria, ano, genero } = req.query;
      if (categoria) {
        consulta = consulta.ilike('genero', `%${categoria}%`);
      }
      if (ano) {
        consulta = consulta.eq('ano_lancamento', parseInt(ano));
      }
      if (genero) {
        consulta = consulta.ilike('genero', `%${genero}%`);
      }

      // Ordena pelos mais novos e limita a quantidade da página
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

  /**
   * Lista todos os exemplares físicos de um livro específico.
   * Útil para o bibliotecário ver o estado de cada cópia física (ID, condição, etc).
   */
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

  /**
   * Atualiza o inventário de um exemplar físico individual.
   * Permite mudar a disponibilidade (ex: mandar para manutenção) ou o estado físico (ex: marcar como danificado).
   */
  atualizarExemplar = async (req, res) => {
    try {
      const { exemplar_id } = req.params;
      const { status, condicao, observacao } = req.body;

      // Busca o estado atual do exemplar antes de mudar
      const { data: exemplarOriginal } = await supabase
        .from('exemplares')
        .select('*')
        .eq('id', exemplar_id)
        .is('deleted_at', null)
        .single();

      if (!exemplarOriginal) return res.status(404).json({ error: 'Exemplar não encontrado.' });

      const atualizacoes = { observacao: observacao?.trim() || null };

      // Regras para mudança de condição física
      if (condicao !== undefined) {
        const permitidos = ['bom', 'danificado', 'perdido'];
        if (!permitidos.includes(condicao)) {
          return res.status(400).json({ error: 'Condição física deve ser: bom, danificado ou perdido.' });
        }
        
        atualizacoes.condicao = condicao;
        
        // Se foi perdido, automaticamente fica indisponível para novos empréstimos
        if (condicao === 'perdido') {
          atualizacoes.disponibilidade = 'perdido';
        } else if (exemplarOriginal.disponibilidade === 'perdido') {
          atualizacoes.disponibilidade = 'disponivel';
        }
      }

      // Regras para mudança de disponibilidade (status)
      if (status !== undefined) {
        const permitidos = ['disponivel', 'emprestado', 'indisponivel', 'perdido'];
        if (!permitidos.includes(status)) {
          return res.status(400).json({ error: 'Disponibilidade deve ser: disponivel, emprestado, indisponivel ou perdido.' });
        }

        // Não permite liberar um livro que está registrado como emprestado sem passar pelo processo de devolução oficial
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

      // Após mudar um exemplar, precisamos atualizar os totais no livro "pai"
      await this.recalcularContadores(exemplarOriginal.livro_id);

      const { data: exemplarAtualizado } = await supabase
        .from('exemplares')
        .select('*')
        .eq('id', exemplar_id)
        .is('deleted_at', null)
        .single();

      // Avisa o frontend para atualizar as tabelas
      req.app.get('io').emit('refreshData', 'livros');

      res.json({ message: '✅ Inventário atualizado com sucesso!', exemplar: exemplarAtualizado });
    } catch (erro) {
      console.error('Erro ao atualizar exemplar:', erro);
      res.status(500).json({ error: 'Erro ao atualizar dados do exemplar físico.' });
    }
  };

  /**
   * Adiciona um novo livro ao acervo da biblioteca.
   * Cria o registro principal e gera automaticamente o número solicitado de exemplares físicos.
   */
  cadastrar = async (req, res) => {
    try {
      const { titulo, autor, ano_lancamento, genero, exemplares, capa_url, sinopse } = req.body;

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

      // Primeiro criamos o livro para obter seu ID
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
          sinopse: sinopse?.trim() || null,
          status: 'disponivel'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Depois criamos as cópias físicas (exemplares) associadas a esse livro
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

  /**
   * Modifica as informações de um livro e gerencia o aumento ou redução de exemplares.
   * Recalcula a localização se o gênero ou autor mudar.
   */
  editar = async (req, res) => {
    try {
      const { id } = req.params;
      const { titulo, autor, ano_lancamento, genero, exemplares, capa_url, sinopse } = req.body;

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
      if (sinopse !== undefined) dadosParaMudar.sinopse = sinopse?.trim() || null;
      
      // Se mudar autor ou gênero, o livro pode precisar mudar de estante/corredor
      const novoGenero = dadosParaMudar.genero ?? livroOriginal.genero;
      const novoAutor = dadosParaMudar.autor ?? livroOriginal.autor;
      const novaLoc = this.gerarLocalizacaoAutomatica(novoGenero, novoAutor);
      dadosParaMudar.corredor = novaLoc.corredor;
      dadosParaMudar.prateleira = novaLoc.prateleira;

      if (ano_lancamento !== undefined) {
        const ano = parseInt(ano_lancamento);
        if (!isNaN(ano)) dadosParaMudar.ano_lancamento = ano;
      }

      /**
       * Gestão de Exemplares:
       * Se o usuário aumentar a quantidade, criamos novos exemplares.
       * Se diminuir, removemos apenas exemplares que NÃO estão emprestados.
       */
      if (exemplares !== undefined) {
        const novoTotalExemplares = Math.min(999, Math.max(1, parseInt(exemplares) || 1));
        const totalAtual = livroOriginal.exemplares || 0;
        
        if (novoTotalExemplares !== totalAtual) {
          // Bloqueia redução se houver livros na rua que excedem o novo limite
          const { count: exemplaresEmprestados } = await supabase
            .from('exemplares')
            .select('*', { count: 'exact', head: true })
            .eq('livro_id', id)
            .eq('disponibilidade', 'emprestado')
            .is('deleted_at', null);

          const emprestados = exemplaresEmprestados || 0;
          
          if (novoTotalExemplares < emprestados) {
            return res.status(400).json({ 
              error: `Não é possível reduzir para ${novoTotalExemplares} exemplares pois existem ${emprestados} exemplares emprestados.` 
            });
          }

          if (novoTotalExemplares > totalAtual) {
            // Caso de Aumento: gera novos códigos EX-ID-N
            const novosExemplares = novoTotalExemplares - totalAtual;
            const { data: exemplaresExistentes } = await supabase
              .from('exemplares')
              .select('codigo')
              .eq('livro_id', id)
              .is('deleted_at', null)
              .order('id', { ascending: true });

            const ultimoCodigo = exemplaresExistentes?.length || 0;
            
            const listaNovosExemplares = Array.from({ length: novosExemplares }, (_, i) => ({
              livro_id: parseInt(id),
              codigo: `EX-${id}-${String(ultimoCodigo + i + 1).padStart(3, '0')}`,
              disponibilidade: 'disponivel',
              condicao: 'bom'
            }));
            
            const { error: insertError } = await supabase.from('exemplares').insert(listaNovosExemplares);
            if (insertError) throw insertError;
            
          } else if (novoTotalExemplares < totalAtual) {
            // Caso de Redução: "apaga" (soft delete) exemplares que estão em bom estado e disponíveis
            const exemplaresParaRemover = totalAtual - novoTotalExemplares;
            
            const { data: exemplaresDisponiveis } = await supabase
              .from('exemplares')
              .select('id')
              .eq('livro_id', id)
              .eq('disponibilidade', 'disponivel')
              .eq('condicao', 'bom')
              .is('deleted_at', null)
              .limit(exemplaresParaRemover);

            if (exemplaresDisponiveis && exemplaresDisponiveis.length > 0) {
              const idsParaRemover = exemplaresDisponiveis.map(e => e.id);
              const { error: deleteError } = await supabase
                .from('exemplares')
                .update({ deleted_at: new Date().toISOString() })
                .in('id', idsParaRemover);
              
              if (deleteError) throw deleteError;
            }
          }

          // Atualiza as estatísticas do livro pai após a mexida nos exemplares
          await this.recalcularContadores(id);
        }
      }

      // Salva os dados básicos editados
      if (Object.keys(dadosParaMudar).length > 0) {
        const { error } = await supabase.from('livros').update(dadosParaMudar).eq('id', id);
        if (error) throw error;
      }

      req.app.get('io').emit('refreshData', 'livros');

      res.json({ message: 'Informações do livro atualizadas com sucesso!' });
    } catch (erro) {
      console.error('Erro ao editar livro:', erro);
      res.status(500).json({ error: 'Erro ao processar alterações no livro.' });
    }
  };

  /**
   * Remove um livro do catálogo público.
   * Não deleta do banco (soft delete), apenas marca como excluído.
   * Bloqueia a remoção se ainda houver empréstimos ativos deste livro.
   */
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

      // Segurança: não podemos apagar um livro que alguém está lendo agora
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

      // Marca como deletado (preserva histórico)
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

