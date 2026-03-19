import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

export class AluguelController {

  // ✅ Criar Aluguel
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
          .select('id', 'exemplares_disponiveis')
          .first();

        if (!livro) throw new Error('Livro não disponível para empréstimo.');

        // Insert + update em paralelo dentro da transação
        const novosDisponiveis = livro.exemplares_disponiveis - 1;
        await Promise.all([
          trx('alugueis').insert({
            livro_id,
            usuario_id,
            data_prevista_devolucao: data_prevista,
            status: 'ativo'
          }),
          trx('livros').where({ id: livro_id }).update({
            exemplares_disponiveis: novosDisponiveis,
            status: novosDisponiveis === 0 ? 'alugado' : 'disponivel'
          })
        ]);
      });

      res.status(201).json({
        message: 'Empréstimo registrado com sucesso!',
        prazo: data_prevista.toLocaleDateString('pt-BR')
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ✅ Listar todos — JOIN único, cálculo de atraso no banco via CASE WHEN
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
          // Banco calcula status final e pode_devolver — zero lógica no JS
          db.raw(`CASE WHEN alugueis.data_prevista_devolucao < ? THEN 'atrasado' ELSE 'ativo' END as status`, [hoje]),
          db.raw('TRUE as pode_devolver')
        );

      res.json(alugueis);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar empréstimos' });
    }
  };

  // ✅ Meus empréstimos — JOIN único com cálculo de atraso no banco
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
          db.raw(`
            CASE
              WHEN alugueis.status = 'devolvido' THEN 'devolvido'
              WHEN alugueis.data_prevista_devolucao < ? THEN 'atrasado'
              ELSE 'ativo'
            END as status
          `, [hoje])
        );

      res.json(alugueis);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar seus dados' });
    }
  };

  // ✅ Devolver — JOIN evita segunda query ao banco
  devolver = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await db.transaction(async (trx) => {
        // Busca aluguel + livro em uma query só via JOIN
        const registro = await trx('alugueis')
          .join('livros', 'alugueis.livro_id', 'livros.id')
          .where('alugueis.id', id)
          .whereIn('alugueis.status', ['ativo', 'atrasado'])
          .select(
            'alugueis.id',
            'alugueis.livro_id',
            'livros.exemplares_disponiveis'
          )
          .first();

        if (!registro) throw new Error('Registro de aluguel ativo não encontrado.');

        const novosDisponiveis = registro.exemplares_disponiveis + 1;

        // Ambos os updates em paralelo
        await Promise.all([
          trx('alugueis').where({ id }).update({
            status: 'devolvido',
            data_devolucao: new Date()
          }),
          trx('livros').where({ id: registro.livro_id }).update({
            exemplares_disponiveis: novosDisponiveis,
            status: 'disponivel'
          })
        ]);
      });

      res.json({ message: 'Livro devolvido e disponível no acervo!' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}