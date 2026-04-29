const supabase = require('../database');

/**
 * AcervoDigitalController: Gerencia os materiais em formato PDF e digital.
 * Permite que leitores enviem arquivos para aprovação e que bibliotecários gerenciem o catálogo digital.
 */
class AcervoDigitalController {

  /**
   * Lista os livros digitais que já foram aprovados e estão disponíveis para leitura.
   * Suporta busca por texto e paginação dos resultados.
   */
  listar = async (req, res) => {
    try {
      const { busca, page, limit } = req.query;

      // Define as regras de paginação
      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      // Busca apenas itens aprovados e que não foram deletados
      let consulta = supabase
        .from('acervo_digital')
        .select('*', { count: 'exact' })
        .eq('status', 'aprovado')
        .is('deleted_at', null);

      // Filtra por título, autor ou categoria
      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        consulta = consulta.or(`titulo.ilike.%${termoBusca}%,autor.ilike.%${termoBusca}%,categoria.ilike.%${termoBusca}%`);
      }

      // Ordena pelos mais recentes
      consulta = consulta.order('created_at', { ascending: false }).range(deslocamento, deslocamento + limite - 1);

      const { data: registros, count: total, error } = await consulta;

      if (error) throw error;

      res.json({
        data: registros,
        total: total || 0,
        page: pagina,
        limit: limite,
        pages: Math.ceil((total || 0) / limite)
      });
    } catch (erro) {
      console.error('Erro ao listar acervo digital:', erro);
      res.status(500).json({ error: 'Erro ao carregar o acervo digital.' });
    }
  };

  /**
   * Lista todos os materiais enviados por usuários que ainda aguardam análise do bibliotecário.
   */
  listarPendentes = async (req, res) => {
    try {
      // Segurança: apenas bibliotecários podem acessar esta lista
      if (req.usuario?.tipo !== 'bibliotecario') {
         return res.status(403).json({ error: 'Acesso negado. Apenas bibliotecários podem listar pendências.' });
      }

      const { data: pendentes } = await supabase
        .from('acervo_digital')
        .select('*, usuarios(nome)')
        .eq('status', 'pendente')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const dadosFormatados = (pendentes || []).map(p => ({
        ...p,
        usuario_nome: p.usuarios?.nome
      }));

      res.json(dadosFormatados);
    } catch (erro) {
      console.error('Erro ao listar pendências:', erro);
      res.status(500).json({ error: 'Erro ao carregar documentos pendentes.' });
    }
  };

  /**
   * Adiciona um novo material digital ao sistema.
   * Se for um bibliotecário, o arquivo entra direto.
   * Se for um leitor, o arquivo entra como 'pendente' de aprovação.
   */
  cadastrar = async (req, res) => {
      try {
          const { titulo, autor, categoria, ano, paginas, tamanho_arquivo, url_arquivo, capa_url, sinopse } = req.body;
          const usuarioId = req.usuario?.id;
          const ehBibliotecario = req.usuario?.tipo === 'bibliotecario';

          if (!titulo || !url_arquivo) {
              return res.status(400).json({ error: 'Título e URL do arquivo (PDF) são obrigatórios.' });
          }

          // Segurança: evita sobrecarga do servidor com arquivos gigantescos (Limite: 10MB)
          if (tamanho_arquivo && tamanho_arquivo > 10 * 1024 * 1024) {
              return res.status(400).json({ error: 'O arquivo não pode exceder 10MB.' });
          }

          const status = ehBibliotecario ? 'aprovado' : 'pendente';

          const { error } = await supabase.from('acervo_digital').insert({
              titulo,
              autor,
              categoria,
              ano: parseInt(ano),
              paginas: parseInt(paginas),
              tamanho_arquivo,
              url_arquivo,
              capa_url: capa_url || null,
              sinopse: sinopse?.trim() || null,
              status,
              usuario_id: usuarioId
          });

          if (error) throw error;

          const mensagem = ehBibliotecario 
            ? 'Documento digital cadastrado com sucesso!' 
            : 'Documento enviado com sucesso! Aguarde a aprovação de um bibliotecário.';

          res.status(201).json({ message: mensagem });
      } catch (erro) {
          console.error('Erro ao cadastrar documento digital:', erro);
          res.status(500).json({ error: 'Falha ao incluir documento no acervo digital.' });
      }
  };

  /**
   * Altera o status de um documento pendente para 'aprovado'.
   * A partir deste momento, o documento fica visível para todos os leitores.
   */
  aprovar = async (req, res) => {
      try {
          if (req.usuario?.tipo !== 'bibliotecario') {
             return res.status(403).json({ error: 'Acesso negado.' });
          }

          const { id } = req.params;
          const { error } = await supabase.from('acervo_digital').update({ status: 'aprovado' }).eq('id', id);
          if (error) throw error;
          res.json({ message: 'Documento aprovado e adicionado ao acervo!' });
      } catch (erro) {
          console.error('Erro ao processar aprovação:', erro);
          res.status(500).json({ error: 'Falha ao processar solicitação.' });
      }
  };

  /**
   * Remove permanentemente do sistema um documento que foi enviado mas não foi aceito.
   */
  rejeitar = async (req, res) => {
    try {
        if (req.usuario?.tipo !== 'bibliotecario') {
           return res.status(403).json({ error: 'Acesso negado.' });
        }

        const { id } = req.params;
        const { error } = await supabase.from('acervo_digital').delete().eq('id', id).eq('status', 'pendente');
        if (error) throw error;
        res.json({ message: 'Documento rejeitado e excluído permanentemente do sistema.' });
    } catch (erro) {
        console.error('Erro ao processar rejeição:', erro);
        res.status(500).json({ error: 'Falha ao processar solicitação.' });
    }
  };

  /**
   * Remove um documento aprovado do catálogo (Desativação).
   */
  remover = async (req, res) => {
    try {
        if (req.usuario?.tipo !== 'bibliotecario') {
           return res.status(403).json({ error: 'Acesso negado. Apenas bibliotecários podem remover documentos.' });
        }

        const { id } = req.params;

        // Verifica se o documento existe antes de tentar deletar
        const { data: documento } = await supabase
            .from('acervo_digital')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null)
            .single();

        if (!documento) {
            return res.status(404).json({ error: 'Documento não encontrado.' });
        }

        // Aplica o "Soft Delete" (arquivamento)
        const { error } = await supabase
            .from('acervo_digital')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Documento removido do acervo digital.' });
    } catch (erro) {
        console.error('Erro ao remover documento digital:', erro);
        res.status(500).json({ error: 'Falha ao remover documento do acervo.' });
    }
};

  /**
   * Registra que o usuário leu um documento digital específico.
   * Usado para contabilizar estatísticas de leitura no perfil social.
   */
  registrarLeitura = async (req, res) => {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id;

      if (!usuarioId) return res.status(401).json({ error: 'Usuário não autenticado.' });

      // Insere ou ignora se já existir (devido à regra UNIQUE no banco)
      await supabase.from('leituras_digitais').insert({
        usuario_id: usuarioId,
        livro_digital_id: id
      });

      res.json({ message: 'Leitura registrada com sucesso.' });
    } catch (erro) {
      // Ignora erro de duplicata silenciosamente
      res.json({ message: 'Leitura já registrada anteriormente.' });
    }
  };

  /**
   * Retorna a contagem total de livros digitais lidos por um usuário.
   */
  obterContagemLeituras = async (req, res) => {
    try {
      const usuarioId = req.usuario?.id;
      if (!usuarioId) return res.status(401).json({ error: 'Não autenticado.' });

      const { count, error } = await supabase
        .from('leituras_digitais')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId);

      if (error) throw error;
      res.json({ total: count || 0 });
    } catch (erro) {
      res.status(500).json({ error: 'Erro ao obter estatísticas de leitura.' });
    }
  };

  /**
   * Retorna a contagem de PDFs enviados pelo usuário que já foram aprovados.
   */
  obterContagemSubidos = async (req, res) => {
    try {
      const usuarioId = req.usuario?.id;
      if (!usuarioId) return res.status(401).json({ error: 'Não autenticado.' });

      const { count, error } = await supabase
        .from('acervo_digital')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId)
        .eq('status', 'aprovado')
        .is('deleted_at', null);

      if (error) throw error;
      res.json({ total: count || 0 });
    } catch (erro) {
      res.status(500).json({ error: 'Erro ao obter estatísticas de uploads.' });
    }
  };
}

module.exports = new AcervoDigitalController();
