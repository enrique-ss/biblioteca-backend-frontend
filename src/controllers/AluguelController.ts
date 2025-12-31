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

      await db('alugueis').insert({
        usuario_id: req.userId,
        livro_id,
        data_prevista_devolucao,
        status: 'ativo'
      });

      await db('livros').where({ id: livro_id }).update({ status: 'alugado' });
      res.status(201).json({ message: 'Aluguel realizado!' });
    } catch (error) {
      res.status(500).json({ error: 'Erro no aluguel' });
    }
  },

  // Nova função para o Bibliotecário ver TUDO
  async listarTodos(req: AuthRequest, res: Response) {
    try {
      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .select(
          'alugueis.id',
          'livros.titulo as livro',
          'usuarios.nome as cliente',
          'alugueis.data_prevista_devolucao',
          'alugueis.status'
        );
      res.json(alugueis);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar aluguéis' });
    }
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