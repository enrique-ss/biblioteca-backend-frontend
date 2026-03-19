import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

export class AluguelController {

  // Criar Aluguel — seleciona automaticamente um exemplar disponível
  criar = async (req: AuthRequest, res: Response) => {
    try {
      const { livro_id, usuario_id } = req.body;
      const data_aluguel = new Date();
      const data_prevista = new Date();
      data_prevista.setDate(data_aluguel.getDate() + 14);

      await db.transaction(async (trx) => {
        // Busca um exemplar disponível do livro (o de menor ID — mais antigo na prateleira)
        const exemplar = await trx('exemplares')
          .where({ livro_id, status: 'disponivel' })
          .orderBy('id', 'asc')
          .first();

        if (!exemplar) throw new Error('Livro não disponível para empréstimo.');

        const livro = await trx('livros').where({ id: livro_id }).first();
        const novosDisponiveis = livro.exemplares_disponiveis - 1;

        await Promise.all([
          trx('alugueis').insert({
            livro_id,
            exemplar_id: exemplar.id,
            usuario_id,
            data_prevista_devolucao: data_prevista,
            status: 'ativo'
          }),
          trx('exemplares').where({ id: exemplar.id }).update({ status: 'emprestado' }),
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

  // Listar todos ativos (bibliotecário) — com exemplar_id para rastreabilidade
  listarTodos = async (req: AuthRequest, res: Response) => {
    try {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const page = Math.max(1, parseInt(String(req.query.page || 1)));
      const limit = Math.min(50, parseInt(String(req.query.limit || 20)));
      const offset = (page - 1) * limit;

      const base = db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('exemplares', 'alugueis.exemplar_id', 'exemplares.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .where('alugueis.status', 'ativo');

      const [rows, [{ total }]] = await Promise.all([
        base.clone().select(
          'alugueis.id',
          'usuarios.nome as usuario',
          'livros.titulo as titulo',
          'exemplares.id as exemplar_id',
          'exemplares.codigo as exemplar_codigo',
          'alugueis.data_aluguel',
          'alugueis.data_prevista_devolucao as prazo',
          db.raw(`CASE WHEN alugueis.data_prevista_devolucao < ? THEN 'atrasado' ELSE 'ativo' END as status`, [hoje]),
          db.raw('TRUE as pode_devolver'),
          db.raw('TRUE as pode_renovar')
        ).limit(limit).offset(offset),
        base.clone().count('alugueis.id as total')
      ]);

      res.json({ data: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar empréstimos' });
    }
  };

  // Meus empréstimos (usuário)
  meus = async (req: AuthRequest, res: Response) => {
    try {
      const usuario_id = req.usuario!.id;
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('exemplares', 'alugueis.exemplar_id', 'exemplares.id')
        .where({ 'alugueis.usuario_id': usuario_id })
        .select(
          'alugueis.id',
          'livros.titulo',
          'exemplares.codigo as exemplar_codigo',
          'alugueis.data_aluguel',
          'alugueis.data_prevista_devolucao as prazo',
          db.raw(`CASE WHEN alugueis.status = 'devolvido' THEN 'devolvido' WHEN alugueis.data_prevista_devolucao < ? THEN 'atrasado' ELSE 'ativo' END as status`, [hoje]),
          db.raw('COALESCE(alugueis.renovacoes, 0) as renovacoes'),
          db.raw(`CASE WHEN alugueis.status = 'ativo' AND COALESCE(alugueis.renovacoes, 0) < 2 THEN TRUE ELSE FALSE END as pode_renovar`)
        );

      res.json(alugueis);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar seus dados' });
    }
  };

  // Histórico completo (bibliotecário) — apenas devolvidos, com exemplar para rastreabilidade
  historico = async (req: AuthRequest, res: Response) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || 1)));
      const limit = Math.min(50, parseInt(String(req.query.limit || 20)));
      const offset = (page - 1) * limit;
      const usuario_id = req.query.usuario_id ? Number(req.query.usuario_id) : null;

      const base = db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('exemplares', 'alugueis.exemplar_id', 'exemplares.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .where('alugueis.status', 'devolvido'); // apenas devolvidos

      if (usuario_id) base.where('alugueis.usuario_id', usuario_id);

      const [rows, [{ total }]] = await Promise.all([
        base.clone().select(
          'alugueis.id',
          'usuarios.nome as usuario',
          'livros.titulo as titulo',
          'exemplares.id as exemplar_id',
          'exemplares.codigo as exemplar_codigo',
          'exemplares.status as exemplar_status', // permite ver se o exemplar voltou danificado
          'alugueis.data_aluguel',
          'alugueis.data_prevista_devolucao as prazo',
          'alugueis.data_devolucao',
          db.raw('COALESCE(alugueis.renovacoes, 0) as renovacoes'),
          db.raw(`'devolvido' as status`)
        ).orderBy('alugueis.data_devolucao', 'desc').limit(limit).offset(offset),
        base.clone().count('alugueis.id as total')
      ]);

      res.json({ data: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  };

  // Atrasados com contato (bibliotecário)
  atrasados = async (req: AuthRequest, res: Response) => {
    try {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

      const atrasados = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('exemplares', 'alugueis.exemplar_id', 'exemplares.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .where('alugueis.status', 'ativo')
        .where('alugueis.data_prevista_devolucao', '<', hoje)
        .select(
          'alugueis.id',
          'usuarios.nome as usuario',
          'usuarios.email as contato',
          'livros.titulo as titulo',
          'exemplares.codigo as exemplar_codigo',
          'alugueis.data_prevista_devolucao as prazo',
          db.raw('DATEDIFF(NOW(), alugueis.data_prevista_devolucao) as dias_atraso')
        )
        .orderBy('dias_atraso', 'desc');

      res.json({ total: atrasados.length, data: atrasados });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar atrasados' });
    }
  };

  // Renovar empréstimo (+14 dias, máx 2 renovações)
  renovar = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const aluguel = await db('alugueis')
        .where({ id })
        .whereIn('status', ['ativo'])
        .first();

      if (!aluguel) throw new Error('Empréstimo não encontrado ou já encerrado.');
      if ((aluguel.renovacoes ?? 0) >= 2) throw new Error('Limite de renovações atingido (máx. 2).');

      const novosPrazo = new Date(aluguel.data_prevista_devolucao);
      novosPrazo.setDate(novosPrazo.getDate() + 14);

      await db('alugueis').where({ id }).update({
        data_prevista_devolucao: novosPrazo,
        renovacoes: (aluguel.renovacoes ?? 0) + 1
      });

      res.json({
        message: 'Empréstimo renovado!',
        novo_prazo: novosPrazo.toLocaleDateString('pt-BR'),
        renovacoes: aluguel.renovacoes + 1
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // Devolver — marca exemplar como disponível novamente
  devolver = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await db.transaction(async (trx) => {
        const registro = await trx('alugueis')
          .join('livros', 'alugueis.livro_id', 'livros.id')
          .where('alugueis.id', id)
          .whereIn('alugueis.status', ['ativo', 'atrasado'])
          .select(
            'alugueis.id',
            'alugueis.livro_id',
            'alugueis.exemplar_id',
            'livros.exemplares_disponiveis'
          )
          .first();

        if (!registro) throw new Error('Registro de aluguel ativo não encontrado.');

        const novosDisponiveis = registro.exemplares_disponiveis + 1;

        await Promise.all([
          trx('alugueis').where({ id }).update({
            status: 'devolvido',
            data_devolucao: new Date()
          }),
          // Exemplar volta para disponivel — bibliotecário pode mudar para
          // danificado/perdido depois via PATCH /livros/:id/exemplares/:exemplar_id
          trx('exemplares').where({ id: registro.exemplar_id }).update({
            status: 'disponivel'
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