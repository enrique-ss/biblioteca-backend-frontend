const supabase = require('../database');

class AcervoDigitalController {

  // Lista livros digitais com paginação e busca
  listar = async (req, res) => {
    try {
      const { busca, page, limit } = req.query;

      // Prepara paginação
      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      // Consulta base de livros digitais aprovados
      let consulta = supabase
        .from('acervo_digital')
        .select('*', { count: 'exact' })
        .eq('status', 'aprovado')
        .is('deleted_at', null);

      // Aplica busca por título, autor ou categoria
      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        consulta = consulta.or(`titulo.ilike.%${termoBusca}%,autor.ilike.%${termoBusca}%,categoria.ilike.%${termoBusca}%`);
      }

      // Ordena por mais recentes e pagina
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

  listarPendentes = async (req, res) => {
    try {
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

  cadastrar = async (req, res) => {
      try {
          const { titulo, autor, categoria, ano, paginas, tamanho_arquivo, url_arquivo, capa_url } = req.body;
          const usuarioId = req.usuario?.id;
          const ehBibliotecario = req.usuario?.tipo === 'bibliotecario';

          if (!titulo || !url_arquivo) {
              return res.status(400).json({ error: 'Título e URL do arquivo (PDF) são obrigatórios.' });
          }

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
}

module.exports = new AcervoDigitalController();
