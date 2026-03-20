import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

const MULTA_DIA = 1.00;
const MULTA_PERDA = 100.00;

export class AluguelController {

  criar = async (req: AuthRequest, res: Response) => {
    try {
      const { livro_id, usuario_id } = req.body;

      const usuario = await db('usuarios').where({ id: usuario_id }).first();
      if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });
      if (usuario.multa_pendente) {
        const multas = await db('multas').where({ usuario_id, status: 'pendente' }).select('valor');
        const total = multas.reduce((s: number, m: any) => s + Number(m.valor), 0);
        return res.status(400).json({ error: `Usuário com multa pendente de R$ ${total.toFixed(2)}. Quite antes de realizar novos empréstimos.` });
      }

      const data_aluguel = new Date();
      const data_prevista = new Date();
      data_prevista.setDate(data_aluguel.getDate() + 14);

      await db.transaction(async (trx) => {
        // Busca exemplar disponível (disponibilidade='disponivel' e condição != perdido)
        const exemplar = await trx('exemplares')
          .where({ livro_id, disponibilidade: 'disponivel' })
          .whereNot({ condicao: 'perdido' })
          .orderBy('id', 'asc')
          .first();

        if (!exemplar) throw new Error('Livro não disponível para empréstimo.');

        const livro = await trx('livros').where({ id: livro_id }).first();
        const novosDisponiveis = livro.exemplares_disponiveis - 1;

        await Promise.all([
          trx('alugueis').insert({
            livro_id, exemplar_id: exemplar.id, usuario_id,
            data_prevista_devolucao: data_prevista, status: 'ativo'
          }),
          // Muda só disponibilidade — condição física não muda ao emprestar
          trx('exemplares').where({ id: exemplar.id }).update({ disponibilidade: 'emprestado' }),
          trx('livros').where({ id: livro_id }).update({
            exemplares_disponiveis: novosDisponiveis,
            status: novosDisponiveis === 0 ? 'alugado' : 'disponivel'
          })
        ]);
      });

      res.status(201).json({ message: 'Empréstimo registrado com sucesso!', prazo: data_prevista.toLocaleDateString('pt-BR') });
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  };

  devolver = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { estado_exemplar = 'bom', observacao = '' } = req.body;

      const estadosValidos = ['bom', 'danificado', 'perdido'];
      if (!estadosValidos.includes(estado_exemplar))
        return res.status(400).json({ error: `Estado inválido. Use: ${estadosValidos.join(', ')}` });

      const multasGeradas: { tipo: string; valor: number; dias?: number }[] = [];

      await db.transaction(async (trx) => {
        const registro = await trx('alugueis')
          .join('livros', 'alugueis.livro_id', 'livros.id')
          .where('alugueis.id', id)
          .where('alugueis.status', 'ativo')
          .select(
            'alugueis.id', 'alugueis.livro_id', 'alugueis.exemplar_id',
            'alugueis.usuario_id', 'alugueis.data_prevista_devolucao',
            'livros.exemplares_disponiveis'
          )
          .first();

        if (!registro) throw new Error('Registro de aluguel ativo não encontrado.');

        const agora = new Date(); agora.setHours(0, 0, 0, 0);
        const prazo = new Date(registro.data_prevista_devolucao); prazo.setHours(0, 0, 0, 0);

        // Multa por atraso
        const diasAtraso = Math.max(0, Math.floor((agora.getTime() - prazo.getTime()) / 86_400_000));
        if (diasAtraso > 0) {
          const valorAtraso = diasAtraso * MULTA_DIA;
          await trx('multas').insert({ aluguel_id: registro.id, usuario_id: registro.usuario_id, tipo: 'atraso', valor: valorAtraso, dias_atraso: diasAtraso, status: 'pendente' });
          multasGeradas.push({ tipo: 'atraso', valor: valorAtraso, dias: diasAtraso });
        }

        // Multa por perda
        if (estado_exemplar === 'perdido') {
          await trx('multas').insert({ aluguel_id: registro.id, usuario_id: registro.usuario_id, tipo: 'perda', valor: MULTA_PERDA, dias_atraso: 0, status: 'pendente' });
          multasGeradas.push({ tipo: 'perda', valor: MULTA_PERDA });
        }

        if (multasGeradas.length > 0)
          await trx('usuarios').where({ id: registro.usuario_id }).update({ multa_pendente: true });

        // Atualização do exemplar:
        // disponibilidade volta pra 'disponivel' SEMPRE (até perdido — para não bloquear o campo)
        // condicao registra o estado físico real — independente da disponibilidade
        // Se perdido: NÃO incrementa exemplares_disponiveis do livro
        const voltaAcervo = estado_exemplar !== 'perdido';
        const novosDisponiveis = voltaAcervo
          ? registro.exemplares_disponiveis + 1
          : registro.exemplares_disponiveis;

        await Promise.all([
          trx('alugueis').where({ id }).update({
            status: 'devolvido', data_devolucao: new Date(), estado_devolucao: estado_exemplar
          }),
          trx('exemplares').where({ id: registro.exemplar_id }).update({
            disponibilidade: 'disponivel',
            condicao: estado_exemplar,
            observacao: observacao?.trim() || null
          }),
          trx('livros').where({ id: registro.livro_id }).update({
            exemplares_disponiveis: novosDisponiveis,
            status: novosDisponiveis > 0 ? 'disponivel' : 'alugado'
          })
        ]);
      });

      const voltaAcervo = estado_exemplar !== 'perdido';
      const totalMulta = multasGeradas.reduce((s, m) => s + m.valor, 0);

      let message = 'Livro devolvido com sucesso!';
      if (estado_exemplar === 'perdido') message = 'Devolução registrada — exemplar marcado como perdido e removido do acervo disponível.';
      if (estado_exemplar === 'danificado') message = 'Devolução registrada — exemplar marcado como danificado mas mantido no acervo.';

      res.json({
        message, estado_exemplar,
        voltou_acervo: voltaAcervo,
        multas: multasGeradas,
        total_multa: totalMulta > 0 ? totalMulta : null,
        aviso: totalMulta > 0 ? `Multa de R$ ${totalMulta.toFixed(2)} gerada. Usuário bloqueado para novos empréstimos.` : null
      });
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  };

  pagarMulta = async (req: AuthRequest, res: Response) => {
    try {
      const { usuario_id } = req.params;
      const multas = await db('multas').where({ usuario_id, status: 'pendente' }).select('id', 'tipo', 'valor');
      if (!multas.length) return res.status(404).json({ error: 'Nenhuma multa pendente para este usuário.' });
      const total = multas.reduce((s, m) => s + Number(m.valor), 0);
      await db.transaction(async (trx) => {
        await trx('multas').whereIn('id', multas.map(m => m.id)).update({ status: 'paga', pago_em: new Date() });
        await trx('usuarios').where({ id: usuario_id }).update({ multa_pendente: false });
      });
      res.json({ message: `${multas.length} multa(s) quitada(s). Total: R$ ${total.toFixed(2)}`, multas_quitadas: multas.length, total_pago: total });
    } catch (error: any) { res.status(500).json({ error: 'Erro ao quitar multas' }); }
  };

  listarMultas = async (req: AuthRequest, res: Response) => {
    try {
      const { usuario_id } = req.params;
      const multas = await db('multas')
        .join('alugueis', 'multas.aluguel_id', 'alugueis.id')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .where('multas.usuario_id', usuario_id)
        .select('multas.id', 'multas.tipo', 'multas.valor', 'multas.dias_atraso', 'multas.status', 'multas.pago_em', 'multas.created_at', 'livros.titulo as livro')
        .orderBy('multas.created_at', 'desc');
      const totalPendente = multas.filter(m => m.status === 'pendente').reduce((s, m) => s + Number(m.valor), 0);
      res.json({ multas, total_pendente: totalPendente });
    } catch { res.status(500).json({ error: 'Erro ao buscar multas' }); }
  };

  minhasMultas = async (req: AuthRequest, res: Response) => {
    try {
      const usuario_id = req.usuario!.id;
      const multas = await db('multas')
        .join('alugueis', 'multas.aluguel_id', 'alugueis.id')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .where('multas.usuario_id', usuario_id)
        .select('multas.id', 'multas.tipo', 'multas.valor', 'multas.dias_atraso', 'multas.status', 'multas.created_at', 'livros.titulo as livro')
        .orderBy('multas.created_at', 'desc');
      const totalPendente = multas.filter(m => m.status === 'pendente').reduce((s, m) => s + Number(m.valor), 0);
      res.json({ multas, total_pendente: totalPendente });
    } catch { res.status(500).json({ error: 'Erro ao buscar suas multas' }); }
  };

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
          'alugueis.id', 'usuarios.nome as usuario', 'usuarios.multa_pendente',
          'livros.titulo', 'exemplares.id as exemplar_id', 'exemplares.codigo as exemplar_codigo',
          'exemplares.condicao as exemplar_condicao',
          'alugueis.data_aluguel', 'alugueis.data_prevista_devolucao as prazo',
          db.raw(`CASE WHEN alugueis.data_prevista_devolucao < ? THEN 'atrasado' ELSE 'ativo' END as status`, [hoje]),
          db.raw(`GREATEST(0, DATEDIFF(NOW(), alugueis.data_prevista_devolucao)) as dias_atraso`),
          db.raw(`GREATEST(0, DATEDIFF(NOW(), alugueis.data_prevista_devolucao)) * ${MULTA_DIA} as multa_acumulada`),
          db.raw('TRUE as pode_devolver'), db.raw('TRUE as pode_renovar')
        ).limit(limit).offset(offset),
        base.clone().count('alugueis.id as total')
      ]);

      res.json({ data: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
    } catch { res.status(500).json({ error: 'Erro ao listar empréstimos' }); }
  };

  meus = async (req: AuthRequest, res: Response) => {
    try {
      const usuario_id = req.usuario!.id;
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('exemplares', 'alugueis.exemplar_id', 'exemplares.id')
        .where({ 'alugueis.usuario_id': usuario_id })
        .select(
          'alugueis.id', 'livros.titulo', 'exemplares.codigo as exemplar_codigo',
          'exemplares.condicao as exemplar_condicao',
          'alugueis.data_aluguel', 'alugueis.data_prevista_devolucao as prazo',
          db.raw(`CASE WHEN alugueis.status='devolvido' THEN 'devolvido' WHEN alugueis.data_prevista_devolucao < ? THEN 'atrasado' ELSE 'ativo' END as status`, [hoje]),
          db.raw('COALESCE(alugueis.renovacoes, 0) as renovacoes'),
          db.raw(`CASE WHEN alugueis.status='ativo' AND COALESCE(alugueis.renovacoes,0)<2 THEN TRUE ELSE FALSE END as pode_renovar`),
          db.raw(`GREATEST(0, DATEDIFF(NOW(), alugueis.data_prevista_devolucao)) as dias_atraso`),
          db.raw(`GREATEST(0, DATEDIFF(NOW(), alugueis.data_prevista_devolucao)) * ${MULTA_DIA} as multa_acumulada`)
        );

      res.json(alugueis);
    } catch { res.status(500).json({ error: 'Erro ao buscar seus dados' }); }
  };

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
        .where('alugueis.status', 'devolvido');

      if (usuario_id) base.where('alugueis.usuario_id', usuario_id);

      const [rows, [{ total }]] = await Promise.all([
        base.clone().select(
          'alugueis.id', 'usuarios.nome as usuario', 'livros.titulo',
          'exemplares.codigo as exemplar_codigo',
          'exemplares.condicao as exemplar_status',
          'alugueis.data_aluguel', 'alugueis.data_prevista_devolucao as prazo',
          'alugueis.data_devolucao', 'alugueis.estado_devolucao',
          db.raw('COALESCE(alugueis.renovacoes,0) as renovacoes'),
          db.raw(`'devolvido' as status`)
        ).orderBy('alugueis.data_devolucao', 'desc').limit(limit).offset(offset),
        base.clone().count('alugueis.id as total')
      ]);

      res.json({ data: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
    } catch { res.status(500).json({ error: 'Erro ao buscar histórico' }); }
  };

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
          'alugueis.id', 'usuarios.nome as usuario', 'usuarios.email as contato',
          'livros.titulo', 'exemplares.codigo as exemplar_codigo',
          'alugueis.data_prevista_devolucao as prazo',
          db.raw('DATEDIFF(NOW(), alugueis.data_prevista_devolucao) as dias_atraso'),
          db.raw(`DATEDIFF(NOW(), alugueis.data_prevista_devolucao) * ${MULTA_DIA} as multa_acumulada`)
        )
        .orderBy('dias_atraso', 'desc');
      res.json({ total: atrasados.length, data: atrasados });
    } catch { res.status(500).json({ error: 'Erro ao buscar atrasados' }); }
  };

  renovar = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const aluguel = await db('alugueis').where({ id, status: 'ativo' }).first();
      if (!aluguel) throw new Error('Empréstimo não encontrado ou já encerrado.');
      if ((aluguel.renovacoes ?? 0) >= 2) throw new Error('Limite de renovações atingido (máx. 2).');

      const novosPrazo = new Date(aluguel.data_prevista_devolucao);
      novosPrazo.setDate(novosPrazo.getDate() + 14);

      await db('alugueis').where({ id }).update({
        data_prevista_devolucao: novosPrazo,
        renovacoes: (aluguel.renovacoes ?? 0) + 1
      });

      res.json({ message: 'Empréstimo renovado!', novo_prazo: novosPrazo.toLocaleDateString('pt-BR'), renovacoes: (aluguel.renovacoes ?? 0) + 1 });
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  };
}