import { Request, Response } from 'express';
import { db } from '../database';

function mapearLocalizacao(genero: string) {
  const g = (genero || '').toLowerCase();
  if (g.includes('computacao') || g.includes('tecnologia') || g.includes('programacao'))
    return { corredor: '00', prateleira: 'TEC-01' };
  if (g.includes('filosofia') || g.includes('psicologia') || g.includes('autoajuda'))
    return { corredor: '01', prateleira: 'PHI-02' };
  if (g.includes('religiao') || g.includes('teologia') || g.includes('espiritual'))
    return { corredor: '02', prateleira: 'REL-01' };
  if (g.includes('direito') || g.includes('sociologia') || g.includes('politica'))
    return { corredor: '03', prateleira: 'SOC-03' };
  if (g.includes('idioma') || g.includes('educacao'))
    return { corredor: '04', prateleira: 'LAN-01' };
  if (g.includes('matematica') || g.includes('fisica') || g.includes('quimica'))
    return { corredor: '05', prateleira: 'EXA-05' };
  if (g.includes('fantasia')) return { corredor: '08', prateleira: 'LIT-01' };
  if (g.includes('ficcao') || g.includes('sci-fi') || g.includes('ficção')) return { corredor: '08', prateleira: 'LIT-02' };
  if (g.includes('romance')) return { corredor: '09', prateleira: 'LIT-03' };
  if (g.includes('terror') || g.includes('suspense')) return { corredor: '09', prateleira: 'LIT-04' };
  if (g.includes('historia') || g.includes('biografia')) return { corredor: '10', prateleira: 'HIS-01' };

  return { corredor: '99', prateleira: 'GERAL' };
}

export const LivroController = {
  async listar(req: Request, res: Response) {
    try {
      const { status, busca } = req.query;
      let query = db('livros').select('*');
      if (status) query = query.where({ status });
      if (busca) {
        query = query.where((b) => b.where('titulo', 'like', `%${busca}%`).orWhere('autor', 'like', `%${busca}%`));
      }
      const livros = await query.orderBy('titulo', 'asc');
      res.json(livros);
    } catch (error) { res.status(500).json({ error: 'Erro ao listar' }); }
  },

  async criar(req: Request, res: Response) {
    try {
      const { titulo, autor, ano_lancamento, genero, isbn } = req.body;
      const { corredor, prateleira } = mapearLocalizacao(genero);
      const [id] = await db('livros').insert({
        titulo, autor, genero, corredor, prateleira, ano_lancamento, isbn, status: 'disponivel'
      });
      res.status(201).json({ id, corredor, prateleira });
    } catch (error) { res.status(500).json({ error: 'Erro ao criar' }); }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { genero } = req.body;
      let updateData = { ...req.body };
      if (genero) {
        const { corredor, prateleira } = mapearLocalizacao(genero);
        updateData.corredor = corredor;
        updateData.prateleira = prateleira;
      }
      await db('livros').where({ id }).update(updateData);
      res.json({ message: 'Atualizado com sucesso' });
    } catch (error) { res.status(500).json({ error: 'Erro ao atualizar' }); }
  },

  async buscarPorId(req: Request, res: Response) {
    try {
      const livro = await db('livros').where({ id: req.params.id }).first();
      if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });
      res.json(livro);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar livro' }); }
  },

  async deletar(req: Request, res: Response) {
    await db('livros').where({ id: req.params.id }).delete();
    res.status(204).send();
  }
};