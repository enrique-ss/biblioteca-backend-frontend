import { Response } from 'express';
import db from '../database';
import { AuthRequest } from '../middlewares/auth';

export class AluguelController {
  // ✅ Arrow function + melhor tratamento de race condition
  criar = async (req: AuthRequest, res: Response) => {
    try {
      const { livro_id, usuario_id } = req.body;

      if (!livro_id || !usuario_id) {
        return res.status(400).json({ error: 'livro_id e usuario_id são obrigatórios' });
      }

      // ✅ Usar transação desde o início para evitar race conditions
      const result = await db.transaction(async (trx) => {
        // Verificar livro com lock para evitar race condition
        const livro = await trx('livros')
          .where({ id: livro_id })
          .forUpdate()
          .first();

        if (!livro) {
          throw new Error('Livro não encontrado');
        }

        if (livro.status === 'alugado') {
          throw new Error('Livro já está alugado');
        }

        // Verificar usuário
        const usuario = await trx('usuarios').where({ id: usuario_id }).first();
        if (!usuario) {
          throw new Error('Usuário não encontrado');
        }

        // Verificar empréstimo ativo (segurança adicional)
        const aluguelExistente = await trx('alugueis')
          .where({ livro_id, status: 'ativo' })
          .first();

        if (aluguelExistente) {
          throw new Error('Já existe um empréstimo ativo para este livro');
        }

        const dataAluguel = new Date();
        const dataPrevistaDevolucao = new Date();
        dataPrevistaDevolucao.setDate(dataPrevistaDevolucao.getDate() + 14);

        // Criar empréstimo
        await trx('alugueis').insert({
          livro_id,
          usuario_id,
          data_aluguel: dataAluguel,
          data_prevista_devolucao: dataPrevistaDevolucao,
          status: 'ativo'
        });

        // Atualizar status do livro
        await trx('livros').where({ id: livro_id }).update({ status: 'alugado' });

        return dataPrevistaDevolucao;
      });

      res.status(201).json({
        message: 'Empréstimo registrado com sucesso!',
        prazo: result.toLocaleDateString('pt-BR')
      });
    } catch (error) {
      console.error('Erro ao criar empréstimo:', error);
      const message = error instanceof Error ? error.message : 'Erro ao criar empréstimo';

      if (message.includes('não encontrado') || message.includes('já está alugado')) {
        return res.status(400).json({ error: message });
      }

      res.status(500).json({ error: 'Erro ao criar empréstimo' });
    }
  }

  // ✅ Arrow functions para todos os métodos
  listarTodos = async (req: AuthRequest, res: Response) => {
    try {
      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .where('alugueis.status', 'ativo')
        .select(
          'alugueis.id',
          'usuarios.nome as usuario',
          'livros.titulo',
          'livros.autor',
          'livros.corredor',
          'livros.prateleira',
          'alugueis.data_aluguel',
          'alugueis.data_prevista_devolucao',
          'alugueis.status'
        )
        .orderBy('alugueis.data_aluguel', 'desc');

      res.json(alugueis);
    } catch (error) {
      console.error('Erro ao listar empréstimos:', error);
      res.status(500).json({ error: 'Erro ao listar empréstimos' });
    }
  }

  meus = async (req: AuthRequest, res: Response) => {
    try {
      const usuario_id = req.usuario.id;

      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .where('alugueis.usuario_id', usuario_id)
        .select(
          'alugueis.id',
          'livros.titulo',
          'livros.autor',
          'livros.corredor',
          'livros.prateleira',
          'alugueis.data_aluguel',
          'alugueis.data_prevista_devolucao',
          'alugueis.data_devolucao',
          'alugueis.status'
        )
        .orderBy('alugueis.data_aluguel', 'desc');

      res.json(alugueis);
    } catch (error) {
      console.error('Erro ao listar meus empréstimos:', error);
      res.status(500).json({ error: 'Erro ao listar empréstimos' });
    }
  }

  devolver = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const aluguel = await db('alugueis').where({ id }).first();
      if (!aluguel) {
        return res.status(404).json({ error: 'Empréstimo não encontrado' });
      }

      if (aluguel.status === 'devolvido') {
        return res.status(400).json({ error: 'Este empréstimo já foi devolvido' });
      }

      const dataDevolucao = new Date();

      await db.transaction(async (trx) => {
        await trx('alugueis')
          .where({ id })
          .update({
            status: 'devolvido',
            data_devolucao: dataDevolucao
          });

        await trx('livros')
          .where({ id: aluguel.livro_id })
          .update({ status: 'disponivel' });
      });

      res.json({ message: 'Livro devolvido com sucesso!' });
    } catch (error) {
      console.error('Erro ao devolver livro:', error);
      res.status(500).json({ error: 'Erro ao devolver livro' });
    }
  }
}