import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

const MULTA_DIA = 1.00;
const MULTA_PERDA = 100.00;

export class AluguelController {

  criar = async (req: AuthRequest, res: Response) => {
    try {
      // Passo 1: Receber os dados enviados pelo frontend (livro, usuário e possível exemplar específico)
      const { livro_id, usuario_id, exemplar_id } = req.body;

      // Passo 2: Buscar o usuário no banco de dados para checar se ele existe
      const usuario = await db('usuarios').where({ id: usuario_id }).first();
      
      if (!usuario) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Passo 3: Regras de negócio - Bloqueios e Multas
      // 3.1 - O usuário não pode estar bloqueado manualmente pelo bibliotecário
      if (usuario.bloqueado) {
        return res.status(400).json({ error: `Usuário bloqueado. Motivo: ${usuario.motivo_bloqueio || 'Não informado'}` });
      }

      // 3.2 - O usuário não pode ter multas pendentes não pagas
      if (usuario.multa_pendente) {
        // Buscamos todas as multas em aberto deste usuário
        const multas = await db('multas').where({ usuario_id, status: 'pendente' }).select('valor');
        
        // Somamos o valor de todas as multas para avisar o usuário do prejuízo
        let total = 0;
        for (const multa of multas) {
            total = total + Number(multa.valor);
        }
        
        return res.status(400).json({ 
            error: `Usuário com multa pendente de R$ ${total.toFixed(2)}. Quite antes de realizar novos empréstimos.` 
        });
      }

      // Passo 4: Preparar as datas do empréstimo
      const data_aluguel = new Date(); // Data de Hoje
      const data_prevista = new Date();
      data_prevista.setDate(data_aluguel.getDate() + 14); // Adiciona 14 dias corridos de prazo

      // Passo 5: Iniciar uma transação coesa no banco de dados (ACID)
      // Se qualquer instrução falhar dentro da transação, todas as outras são revertidas automaticamente
      await db.transaction(async (trx) => {
        let exemplar;
        
        // 5.1 - Se o usuário escolheu um exemplar físico específico no menu
        if (exemplar_id) {
          exemplar = await trx('exemplares')
            .where({ id: exemplar_id, livro_id: livro_id, disponibilidade: 'disponivel' })
            .first();
            
          if (!exemplar) {
              throw new Error('Exemplar específico não encontrado ou não está disponível atualmente.');
          }
        } 
        // 5.2 - Caso contrário, pegamos o primeiro livro da estante que esteja disponível
        else {
          exemplar = await trx('exemplares')
            .where({ livro_id: livro_id, disponibilidade: 'disponivel' })
            .orderBy('id', 'asc') // Pega o código mais antigo (FIFO)
            .first();
            
          if (!exemplar) {
              throw new Error('Livro não disponível para empréstimo neste momento.');
          }
        }

        // Descobrimos quantos exemplares deste título estavam disponíveis antes desse empréstimo
        const livro = await trx('livros').where({ id: livro_id }).first();
        const novosDisponiveis = livro.exemplares_disponiveis - 1;

        // 5.3 - Executamos as atualizações no banco simulaneamente para ganhar velocidade
        await Promise.all([
          
          // A) Registrar o histórico do aluguel na tabela
          trx('alugueis').insert({
            livro_id: livro_id, 
            exemplar_id: exemplar.id, 
            usuario_id: usuario_id,
            data_prevista_devolucao: data_prevista, 
            status: 'ativo'
          }),
          
          // B) Marcar a cópia física exata (exemplar) como indiscutivelmente 'emprestada'
          trx('exemplares').where({ id: exemplar.id }).update({ disponibilidade: 'emprestado' }),
          
          // C) Reduzir o total de livros disponíveis na tela inicial da biblioteca
          trx('livros').where({ id: livro_id }).update({
            exemplares_disponiveis: novosDisponiveis,
            // Se o contador zerou, o livro inteiro entra no status 'alugado'
            status: novosDisponiveis === 0 ? 'alugado' : 'disponivel'
          })
        ]);
      });

      // Passo 6: Responder ao cliente que a ação foi um sucesso
      res.status(201).json({ 
          message: 'Empréstimo registrado com sucesso!', 
          prazo: data_prevista.toLocaleDateString('pt-BR') 
      });

    } catch (error: any) { 
        // Caso um `throw new Error` tenha sido acionado, ele cai diretamente aqui 
        res.status(400).json({ error: error.message }); 
    }
  };

  devolver = async (req: AuthRequest, res: Response) => {
    try {
      // Passo 1: Receber os dados da requisição
      // O id vem da URL (ex: /alugueis/5/devolver), enquanto o estado da cópia vem do corpo do JSON
      const { id } = req.params;
      const { estado_exemplar = 'bom', observacao = '' } = req.body;

      // Passo 2: Validar se o estado informado faz sentido
      const estadosValidos = ['bom', 'danificado', 'perdido'];
      if (!estadosValidos.includes(estado_exemplar)) {
        return res.status(400).json({ error: `Estado inválido. Use um dos seguintes: ${estadosValidos.join(', ')}` });
      }

      // Preparamos um array para guardar avisos de multa que serão devolvidos ao frontend
      const multasGeradas: { tipo: string; valor: number; dias?: number }[] = [];

      // Passo 3: Transação no banco (Se quebrar o cálculo no meio, nada é salvo)
      await db.transaction(async (trx) => {
        
        // 3.1 Busca os detalhes do aluguel atual cruzando os dados com o livro
        const registro = await trx('alugueis')
          .join('livros', 'alugueis.livro_id', 'livros.id')
          .where('alugueis.id', id)
          .where('alugueis.status', 'ativo') // Só devolve se o status ainda constar como ativo
          .select(
            'alugueis.id', 'alugueis.livro_id', 'alugueis.exemplar_id',
            'alugueis.usuario_id', 'alugueis.data_prevista_devolucao',
            'livros.exemplares_disponiveis'
          )
          .first();

        // Se o aluguel não existir ou já estiver fechado
        if (!registro) {
            throw new Error('Registro de aluguel ativo não encontrado.');
        }

        // 3.2 Padronizamos as datas para ignorar "horas" e focar apenas no dia puro
        const agora = new Date(); 
        agora.setHours(0, 0, 0, 0);
        
        const prazo = new Date(registro.data_prevista_devolucao); 
        prazo.setHours(0, 0, 0, 0);

        // 3.3 Calcula a multa por ATRASO
        // 86_400_000 é a quantidade de milissegundos num dia inteiro
        const diferencaEmMilisegundos = agora.getTime() - prazo.getTime();
        const diferencaEmDias = Math.floor(diferencaEmMilisegundos / 86_400_000);
        
        // Math.max garante que o atraso nunca será negativo (se devolveu antes do prazo vira 0)
        const diasAtraso = Math.max(0, diferencaEmDias); 

        if (diasAtraso > 0) {
          const valorAtraso = diasAtraso * MULTA_DIA;
          
          await trx('multas').insert({ 
              aluguel_id: registro.id, 
              usuario_id: registro.usuario_id, 
              tipo: 'atraso', 
              valor: valorAtraso, 
              dias_atraso: diasAtraso, 
              status: 'pendente' 
          });
          multasGeradas.push({ tipo: 'atraso', valor: valorAtraso, dias: diasAtraso });
        }

        // 3.4 Calcula a multa por PERDA (destruição do material)
        if (estado_exemplar === 'perdido') {
          await trx('multas').insert({ 
              aluguel_id: registro.id, 
              usuario_id: registro.usuario_id, 
              tipo: 'perda', 
              valor: MULTA_PERDA, 
              dias_atraso: 0, 
              status: 'pendente' 
          });
          multasGeradas.push({ tipo: 'perda', valor: MULTA_PERDA });
        }

        // 3.5 Se gerou qualquer multa, bloqueamos o usuário adicionando a "flag"
        if (multasGeradas.length > 0) {
          await trx('usuarios').where({ id: registro.usuario_id }).update({ multa_pendente: true });
        }

        // Passo 4: Atualizar os status do acervo
        // Se a cópia física foi perdida, não podemos devolver como 'disponível' para a estante
        const voltaAcervo = estado_exemplar !== 'perdido';
        const disponibilidadeFinal = estado_exemplar === 'perdido' ? 'perdido' : 'disponivel';
        
        // O estoque só aumenta se o livro realmente voltar pra prateleira
        let novosDisponiveis = registro.exemplares_disponiveis;
        if (voltaAcervo) {
            novosDisponiveis = novosDisponiveis + 1;
        }

        // Processamos as três tabelas afetadas ao mesmo tempo para fechar o ciclo
        await Promise.all([
          // Tabela 1: Encerra o aluguel
          trx('alugueis').where({ id }).update({
            status: 'devolvido', 
            data_devolucao: new Date(), 
            estado_devolucao: estado_exemplar
          }),
          
          // Tabela 2: Atualiza a condição do livro exato
          trx('exemplares').where({ id: registro.exemplar_id }).update({
            disponibilidade: disponibilidadeFinal,
            condicao: estado_exemplar,
            observacao: observacao?.trim() || null
          }),
          
          // Tabela 3: Desbloqueia a categoria principal mostrando a quantidade global
          trx('livros').where({ id: registro.livro_id }).update({
            exemplares_disponiveis: novosDisponiveis,
            status: novosDisponiveis > 0 ? 'disponivel' : 'alugado'
          })
        ]);
      });

      // Passo 5: Formatar uma mensagem clara ao cliente de acordo com o resultado
      const voltaAcervo = estado_exemplar !== 'perdido';
      
      let totalMulta = 0;
      for (const multa of multasGeradas) {
          totalMulta = totalMulta + multa.valor;
      }

      let message = 'Livro devolvido com sucesso!';
      if (estado_exemplar === 'perdido') {
          message = 'Devolução registrada — exemplar marcado como perdido e removido do acervo disponível.';
      }
      if (estado_exemplar === 'danificado') {
          message = 'Devolução registrada — exemplar marcado como danificado mas mantido no acervo livre.';
      }

      res.json({
        message: message, 
        estado_exemplar: estado_exemplar,
        voltou_acervo: voltaAcervo,
        multas: multasGeradas,
        total_multa: totalMulta > 0 ? totalMulta : null,
        aviso: totalMulta > 0 ? `Multa de R$ ${totalMulta.toFixed(2)} gerada. Usuário bloqueado para novos empréstimos até o pagamento.` : null
      });

    } catch (error: any) { 
        res.status(400).json({ error: error.message }); 
    }
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
      const { page: p, limit: l, busca, sort, order } = req.query;
      const page = Math.max(1, parseInt(String(p || 1)));
      const limit = Math.min(50, parseInt(String(l || 20)));
      const offset = (page - 1) * limit;

      // Configuração de ordenação
      const allowedSorts = ['usuarios.nome', 'livros.titulo', 'alugueis.data_aluguel', 'alugueis.data_prevista_devolucao', 'alugueis.dias_atraso'];
      const sortCol = allowedSorts.includes(String(sort)) ? String(sort) : 'alugueis.data_aluguel';
      const sortDir = order === 'desc' ? 'desc' : 'asc';

      let base = db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('exemplares', 'alugueis.exemplar_id', 'exemplares.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .where('alugueis.status', 'ativo');

      if (busca && String(busca).trim()) {
        const termo = `%${String(busca).trim()}%`;
        base = base.where(b => 
          b.whereILike('usuarios.nome', termo)
            .orWhereILike('livros.titulo', termo)
            .orWhereILike('exemplares.codigo', termo)
        );
      }

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
        ).orderBy(sortCol, sortDir).limit(limit).offset(offset),
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
      const { sort, order } = req.query;

      // Configuração de ordenação
      const allowedSorts = ['usuarios.nome', 'livros.titulo', 'alugueis.data_aluguel', 'alugueis.data_prevista_devolucao', 'alugueis.data_devolucao', 'alugueis.estado_devolucao'];
      const sortCol = allowedSorts.includes(String(sort)) ? String(sort) : 'alugueis.data_devolucao';
      const sortDir = order === 'desc' ? 'desc' : 'asc';

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
        ).orderBy(sortCol, sortDir).limit(limit).offset(offset),
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