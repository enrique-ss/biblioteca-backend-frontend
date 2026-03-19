import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

export class AluguelController {

  // ✅ PASSO 7: Criar Aluguel
  criar = async (req: AuthRequest, res: Response) => {
    try {
      const { livro_id, usuario_id } = req.body;
      const data_aluguel = new Date();
      const data_prevista = new Date();
      data_prevista.setDate(data_aluguel.getDate() + 14);

      await db.transaction(async (trx) => {
        const livro = await trx('livros').where({ id: livro_id, status: 'disponivel' }).first();
        if (!livro) throw new Error('Livro não disponível para empréstimo.');

        await trx('alugueis').insert({
          livro_id,
          usuario_id,
          data_prevista_devolucao: data_prevista,
          status: 'ativo'
        });

        await trx('livros').where({ id: livro_id }).update({ status: 'alugado' });
      });

      res.status(201).json({
        message: 'Empréstimo registrado com sucesso!',
        prazo: data_prevista.toLocaleDateString('pt-BR')
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ✅ PASSO 8: Listar todos — backend decide o que pode ser devolvido
  listarTodos = async (req: AuthRequest, res: Response) => {
    try {
      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .where('alugueis.status', 'ativo')
        .select(
          'alugueis.id',
          'usuarios.nome as usuario',
          'livros.titulo as titulo',
          'alugueis.data_aluguel',
          'alugueis.data_prevista_devolucao as prazo',
          'alugueis.status'
        );

      // Todos os registros retornados são 'ativo', portanto podem ser devolvidos
      const resultado = alugueis.map(a => ({ ...a, pode_devolver: true }));

      res.json(resultado);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar empréstimos' });
    }
  };

  // ✅ PASSO 8: Meus Empréstimos — campos em camelCase
  meus = async (req: AuthRequest, res: Response) => {
    try {
      const usuario_id = req.usuario!.id;

      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .where({ 'alugueis.usuario_id': usuario_id })
        .select(
          'alugueis.id',
          'livros.titulo',
          'alugueis.data_aluguel',
          'alugueis.data_prevista_devolucao as prazo',
          'alugueis.status'
        );

      res.json(alugueis);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar seus dados' });
    }
  };

  // ✅ PASSO 9: Devolver
  devolver = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await db.transaction(async (trx) => {
        const aluguel = await trx('alugueis').where({ id, status: 'ativo' }).first();
        if (!aluguel) throw new Error('Registro de aluguel ativo não encontrado.');

        await trx('alugueis').where({ id }).update({
          status: 'devolvido',
          data_devolucao: new Date()
        });

        await trx('livros').where({ id: aluguel.livro_id }).update({ status: 'disponivel' });
      });

      res.json({ message: 'Livro devolvido e disponível no acervo!' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}