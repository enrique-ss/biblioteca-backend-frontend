import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

export class AluguelController {

  // ✅ PASSO 7: Criar Aluguel — decrementa exemplares_disponiveis
  criar = async (req: AuthRequest, res: Response) => {
    try {
      const { livro_id, usuario_id } = req.body;
      const data_aluguel = new Date();
      const data_prevista = new Date();
      data_prevista.setDate(data_aluguel.getDate() + 14);

      await db.transaction(async (trx) => {
        const livro = await trx('livros')
          .where({ id: livro_id })
          .where('exemplares_disponiveis', '>', 0)
          .first();

        if (!livro) throw new Error('Livro não disponível para empréstimo.');

        await trx('alugueis').insert({
          livro_id,
          usuario_id,
          data_prevista_devolucao: data_prevista,
          status: 'ativo'
        });

        const novosDisponiveis = livro.exemplares_disponiveis - 1;
        await trx('livros').where({ id: livro_id }).update({
          exemplares_disponiveis: novosDisponiveis,
          status: novosDisponiveis === 0 ? 'alugado' : 'disponivel'
        });
      });

      res.status(201).json({
        message: 'Empréstimo registrado com sucesso!',
        prazo: data_prevista.toLocaleDateString('pt-BR')
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ✅ PASSO 8: Listar todos — calcula atraso no backend
  listarTodos = async (req: AuthRequest, res: Response) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

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

      const resultado = alugueis.map((a) => {
        const prazo = new Date(a.prazo);
        prazo.setHours(0, 0, 0, 0);
        const atrasado = prazo < hoje;
        return {
          ...a,
          status: atrasado ? 'atrasado' : 'ativo',
          pode_devolver: true
        };
      });

      res.json(resultado);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar empréstimos' });
    }
  };

  // ✅ PASSO 8: Meus Empréstimos — calcula atraso também
  meus = async (req: AuthRequest, res: Response) => {
    try {
      const usuario_id = req.usuario!.id;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

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

      const resultado = alugueis.map((a) => {
        if (a.status === 'devolvido') return a;
        const prazo = new Date(a.prazo);
        prazo.setHours(0, 0, 0, 0);
        return { ...a, status: prazo < hoje ? 'atrasado' : 'ativo' };
      });

      res.json(resultado);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar seus dados' });
    }
  };

  // ✅ PASSO 9: Devolver — incrementa exemplares_disponiveis
  devolver = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await db.transaction(async (trx) => {
        const aluguel = await trx('alugueis')
          .where({ id })
          .whereIn('status', ['ativo', 'atrasado'])
          .first();

        if (!aluguel) throw new Error('Registro de aluguel ativo não encontrado.');

        await trx('alugueis').where({ id }).update({
          status: 'devolvido',
          data_devolucao: new Date()
        });

        const livro = await trx('livros').where({ id: aluguel.livro_id }).first();
        const novosDisponiveis = livro.exemplares_disponiveis + 1;
        await trx('livros').where({ id: aluguel.livro_id }).update({
          exemplares_disponiveis: novosDisponiveis,
          status: 'disponivel'
        });
      });

      res.json({ message: 'Livro devolvido e disponível no acervo!' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}