const db = require('../database');

class AcervoDigitalController {

  listar = async (req, res) => {
    try {
      const colunasPermitidas = ['titulo', 'autor', 'categoria', 'ano', 'created_at'];
      const { status, busca, categoria, ano, page, limit, sort, order } = req.query;

      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      const colunaOrdenacao = colunasPermitidas.includes(String(sort)) ? String(sort) : 'created_at';
      const direcaoOrdenacao = order === 'asc' ? 'asc' : 'desc';

      let consulta = db('acervo_digital').where({ status: 'aprovado' }).whereNull('deleted_at');

      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        const queryTermo = `%${termoBusca}%`;
        consulta = consulta.where(builder =>
          builder.whereILike('titulo', queryTermo)
            .orWhereILike('autor', queryTermo)
            .orWhereILike('categoria', queryTermo)
            .orWhereRaw('CAST(ano AS CHAR) LIKE ?', [queryTermo])
        );
      }

      if (categoria) {
        consulta = consulta.where({ categoria });
      }

      if (ano) {
        consulta = consulta.where({ ano: parseInt(String(ano)) });
      }

      const [registros, contagem, categoriasDisp, anosDisp] = await Promise.all([
        consulta.clone().select('*').orderBy(colunaOrdenacao, direcaoOrdenacao).limit(limite).offset(deslocamento),
        consulta.clone().count('id as total'),
        db('acervo_digital').where({ status: 'aprovado' }).whereNull('deleted_at').distinct('categoria').orderBy('categoria', 'asc'),
        db('acervo_digital').where({ status: 'aprovado' }).whereNull('deleted_at').distinct('ano').orderBy('ano', 'desc')
      ]);

      const total = Number(contagem[0].total);

      res.json({
        data: registros,
        total,
        page: pagina,
        limit: limite,
        pages: Math.ceil(total / limite),
        categorias: categoriasDisp.map((c) => c.categoria),
        anos: anosDisp.map((a) => a.ano)
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

      const pendentes = await db('acervo_digital')
        .join('usuarios', 'acervo_digital.usuario_id', 'usuarios.id')
        .select('acervo_digital.*', 'usuarios.nome as usuario_nome')
        .where({ 'acervo_digital.status': 'pendente' })
        .whereNull('acervo_digital.deleted_at')
        .orderBy('acervo_digital.created_at', 'desc');

      res.json(pendentes);
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

          const status = ehBibliotecario ? 'aprovado' : 'pendente';

          await db('acervo_digital').insert({
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
          await db('acervo_digital').where({ id }).update({ status: 'aprovado' });
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
        await db('acervo_digital').where({ id, status: 'pendente' }).delete();
        res.json({ message: 'Documento rejeitado e excluído permanentemente do sistema.' });
    } catch (erro) {
        console.error('Erro ao processar rejeição:', erro);
        res.status(500).json({ error: 'Falha ao processar solicitação.' });
    }
};
}

module.exports = new AcervoDigitalController();
