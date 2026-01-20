import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

export class AluguelController {
  // ✅ PASSO 7: Criar Aluguel (Regra de 14 dias no servidor)
  criar = async (req: AuthRequest, res: Response) => {
    try {
      const { livro_id, usuario_id } = req.body;
      const data_aluguel = new Date();
      const data_prevista = new Date();
      data_prevista.setDate(data_aluguel.getDate() + 14);

      await db.transaction(async (trx) => {
        // Verifica se o livro está disponível
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
        prazo: data_prevista.toLocaleDateString('pt-BR') // Já manda formatado
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ✅ PASSO 8: Listar todos (Filtro e Formatação no servidor)
  listarTodos = async (req: AuthRequest, res: Response) => {
    try {
      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .where('alugueis.status', 'ativo')
        .select(
          'alugueis.id',
          'usuarios.nome as Usuário',
          'livros.titulo as Livro',
          'alugueis.data_prevista_devolucao as Prazo'
        );

      // Limpa os dados para a CLI apenas dar um console.table()
      const formatados = alugueis.map(a => ({
        ID: a.id,
        Usuário: a.Usuário,
        Livro: a.Livro,
        Prazo: new Date(a.Prazo).toLocaleDateString('pt-BR')
      }));

      res.json(formatados);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar empréstimos' });
    }
  };

  // ✅ PASSO 8: Meus Empréstimos (Segurança de Tipo + Formatação)
  meus = async (req: AuthRequest, res: Response) => {
    try {
      // O "!" garante ao TS que o usuário existe (validado pelo middleware)
      const usuario_id = req.usuario!.id;

      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .where({ 'alugueis.usuario_id': usuario_id })
        .select(
          'livros.titulo as Título',
          'alugueis.data_prevista_devolucao as Devolução',
          'alugueis.status as Situação'
        );

      const formatados = alugueis.map(a => ({
        ...a,
        Devolução: new Date(a.Devolução).toLocaleDateString('pt-BR'),
        Situação: a.Situação === 'ativo' ? '🟡 PENDENTE' : '🟢 ENTREGUE'
      }));

      res.json(formatados);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar seus dados' });
    }
  };

  // ✅ PASSO 9: Devolver (Regra Atômica)
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