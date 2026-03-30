import { Response } from 'express';
import db from '../database';
import { RequisicaoAutenticada } from '../middlewares/auth';

/**
 * Controlador do Acervo Digital: Gerencia documentos em formato PDF.
 */
export class AcervoDigitalController {

  /**
   * Listagem de documentos digitais com filtros de busca, categoria e ano.
   */
  listar = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { busca, categoria, ano, page, limit } = req.query;

      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      let consulta = db('acervo_digital');

      // Filtro de busca textual (Título ou Autor)
      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        const queryTermo = `%${termoBusca}%`;
        consulta = consulta.where(builder =>
          builder.whereILike('titulo', queryTermo)
            .orWhereILike('autor', queryTermo)
        );
      }

      // Filtro por categoria
      if (categoria) {
        consulta = consulta.where({ categoria });
      }

      // Filtro por ano
      if (ano) {
        consulta = consulta.where({ ano: parseInt(String(ano)) });
      }

      // Executa consulta dos dados e contagem total
      const [registros, contagem, categoriasDisp, anosDisp] = await Promise.all([
        consulta.clone().select('*').orderBy('titulo', 'asc').limit(limite).offset(deslocamento),
        consulta.clone().count('id as total'),
        db('acervo_digital').distinct('categoria').orderBy('categoria', 'asc'),
        db('acervo_digital').distinct('ano').orderBy('ano', 'desc')
      ]);

      const data = registros as any[];
      const total = Number(contagem[0].total);

      res.json({
        data,
        total,
        page: pagina,
        limit: limite,
        pages: Math.ceil(total / limite),
        categorias: categoriasDisp.map((c: any) => c.categoria),
        anos: anosDisp.map((a: any) => a.ano)
      });
    } catch (erro) {
      console.error('Erro ao listar acervo digital:', erro);
      res.status(500).json({ error: 'Erro ao carregar o acervo digital.' });
    }
  };

  /**
   * Adiciona um novo documento (Para futuras expansões, se necessário)
   */
  cadastrar = async (req: RequisicaoAutenticada, res: Response) => {
      // Implementação simplificada para o desafio
      try {
          const { titulo, autor, categoria, ano, paginas, tamanho_arquivo, url_arquivo } = req.body;
          
          if (!titulo || !url_arquivo) {
              return res.status(400).json({ error: 'Título e URL do arquivo são obrigatórios.' });
          }

          await db('acervo_digital').insert({
              titulo,
              autor,
              categoria,
              ano: parseInt(ano),
              paginas: parseInt(paginas),
              tamanho_arquivo,
              url_arquivo
          });

          res.status(201).json({ message: 'Documento digital cadastrado com sucesso!' });
      } catch (erro) {
          console.error('Erro ao cadastrar documento digital:', erro);
          res.status(500).json({ error: 'Falha ao incluir documento no acervo digital.' });
      }
  };
}
