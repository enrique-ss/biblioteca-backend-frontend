import { Request, Response } from 'express';
import { db } from '../database';

export const AluguelController = {
  async alugar(req: Request, res: Response) {
    try {
      const { livro_id, usuario_id } = req.body;

      if (!livro_id || !usuario_id) {
        return res.status(400).json({ error: 'livro_id e usuario_id são obrigatórios' });
      }

      const livro = await db('livros').where({ id: livro_id }).first();

      if (!livro) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }

      if (livro.status !== 'disponivel') {
        return res.status(400).json({ error: 'Livro indisponível.' });
      }

      const data_aluguel = new Date();
      const data_prevista = new Date();
      data_prevista.setDate(data_aluguel.getDate() + 7);

      await db.transaction(async (trx) => {
        await trx('alugueis').insert({
          livro_id,
          usuario_id,
          data_aluguel,
          data_prevista_devolucao: data_prevista,
          status: 'ativo'
        });
        await trx('livros').where({ id: livro_id }).update({ status: 'alugado' });
      });

      res.status(201).json({
        message: 'Aluguel realizado!',
        prazo: data_prevista.toLocaleDateString('pt-BR')
      });
    } catch (error: any) {
      console.error('Erro ao alugar:', error);
      res.status(500).json({ error: 'Erro ao alugar.', details: error.message });
    }
  },

  async devolver(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const aluguel = await db('alugueis').where({ id }).first();

      if (!aluguel) {
        return res.status(404).json({ error: 'Aluguel não encontrado.' });
      }

      if (aluguel.status === 'devolvido') {
        return res.status(400).json({ error: 'Livro já foi devolvido.' });
      }

      await db.transaction(async (trx) => {
        // CORRIGIDO: usando data_devolucao ao invés de data_devolucao_real
        await trx('alugueis').where({ id }).update({
          status: 'devolvido',
          data_devolucao: new Date()
        });
        await trx('livros').where({ id: aluguel.livro_id }).update({ status: 'disponivel' });
      });

      res.json({ message: 'Devolução concluída!' });
    } catch (error: any) {
      console.error('Erro na devolução:', error);
      res.status(500).json({ error: 'Erro na devolução.', details: error.message });
    }
  },

  async listarTodos(req: Request, res: Response) {
    try {
      const dados = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .select(
          'alugueis.*',
          'livros.titulo',
          'livros.corredor',
          'livros.prateleira',
          'usuarios.nome as usuario'
        )
        .orderBy('alugueis.data_aluguel', 'desc');

      res.json(dados);
    } catch (error: any) {
      console.error('Erro ao listar:', error);
      res.status(500).json({ error: 'Erro ao listar.', details: error.message });
    }
  },

  async meusAlugueis(req: Request, res: Response) {
    try {
      const usuario_id = (req as any).user.id;

      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .select(
          'alugueis.*',
          'livros.titulo',
          'livros.autor',
          'livros.corredor',
          'livros.prateleira'
        )
        .where('alugueis.usuario_id', usuario_id)
        .orderBy('alugueis.data_aluguel', 'desc');

      res.json(alugueis);
    } catch (error: any) {
      console.error('Erro ao buscar seus livros:', error);
      res.status(500).json({ error: 'Erro ao buscar seus livros.', details: error.message });
    }
  }
};