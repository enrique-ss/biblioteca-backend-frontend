import { Response } from 'express';
import { db } from '../database';
import { AuthRequest } from '../middlewares/auth';

export const AluguelController = {
  async alugar(req: AuthRequest, res: Response) {
    try {
      const { livro_id, data_prevista_devolucao } = req.body;
      const livro = await db('livros').where({ id: livro_id }).first();

      if (!livro || livro.status === 'alugado') {
        return res.status(400).json({ error: 'Livro indisponível ou não encontrado' });
      }

      const [id] = await db('alugueis').insert({
        usuario_id: req.userId,
        livro_id,
        data_prevista_devolucao,
        status: 'ativo'
      });

      await db('livros').where({ id: livro_id }).update({ status: 'alugado' });
      res.status(201).json({ id, message: 'Aluguel realizado!' });
    } catch (error) {
      res.status(500).json({ error: 'Erro no aluguel' });
    }
  },

  async meusAlugueis(req: AuthRequest, res: Response) {
    const alugueis = await db('alugueis')
      .join('livros', 'alugueis.livro_id', 'livros.id')
      .where('alugueis.usuario_id', req.userId)
      .select('alugueis.*', 'livros.titulo');
    res.json(alugueis);
  },

  async devolver(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const aluguel = await db('alugueis').where({ id }).first();
    
    if (!aluguel) return res.status(404).json({ error: 'Aluguel não encontrado' });

    await db('alugueis').where({ id }).update({ 
      data_devolucao: db.fn.now(), 
      status: 'devolvido' 
    });
    await db('livros').where({ id: aluguel.livro_id }).update({ status: 'disponivel' });

    res.json({ message: 'Devolvido com sucesso' });
  }
};