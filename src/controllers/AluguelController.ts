import { Response } from 'express';
import { RequisicaoAutenticada } from '../middlewares/auth';
import db from '../database';

// Definição de valores de multa (Regras de Negócio)
const VALOR_MULTA_DIARIA = 1.00;
const VALOR_MULTA_PERDA = 100.00;

/**
 * Controlador de Empréstimos: Gerencia a circulação de livros, multas e devoluções.
 */
export class AluguelController {

  /**
   * Registra um novo empréstimo no sistema.
   * Regras: Usuário não pode estar bloqueado ou ter multas, e o livro deve ter exemplar disponível.
   */
  criar = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { livro_id, usuario_id, exemplar_id } = req.body;

      // Validação de existência do usuário
      const usuario = await db('usuarios').where({ id: usuario_id }).first();
      
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não localizado no sistema.' });
      }

      // Verificação de Impedimentos (Bloqueios e Débitos)
      if (usuario.bloqueado) {
        return res.status(400).json({ 
          error: `O usuário está impedido de realizar novos empréstimos. Motivo: ${usuario.motivo_bloqueio || 'Bloqueio administrativo.'}` 
        });
      }

      if (usuario.multa_pendente) {
        const multas = await db('multas').where({ usuario_id, status: 'pendente' }).select('valor');
        const totalDevido = multas.reduce((total, m) => total + Number(m.valor), 0);
        
        return res.status(400).json({ 
          error: `Usuário possui débitos pendentes de R$ ${totalDevido.toFixed(2)}. Regularize a situação para continuar.` 
        });
      }

      // Cálculo do prazo de devolução (Padrão: 14 dias)
      const dataAluguel = new Date();
      const dataPrevista = new Date();
      dataPrevista.setDate(dataAluguel.getDate() + 14);

      // Transação Atômica: Garante que tudo seja atualizado ou nada seja salvo em caso de erro.
      await db.transaction(async (trx) => {
        let exemplarSelecionado;
        
        // Se um exemplar específico foi escolhido (pelo código), verificamos sua disponibilidade física.
        if (exemplar_id) {
          exemplarSelecionado = await trx('exemplares')
            .where({ id: exemplar_id, livro_id: livro_id, disponibilidade: 'disponivel' })
            .first();
            
          if (!exemplarSelecionado) {
            throw new Error('O exemplar físico solicitado não está disponível para empréstimo.');
          }
        } 
        // Caso contrário, o sistema seleciona automaticamente o primeiro disponível na estante.
        else {
          exemplarSelecionado = await trx('exemplares')
            .where({ livro_id: livro_id, disponibilidade: 'disponivel' })
            .orderBy('id', 'asc')
            .first();
            
          if (!exemplarSelecionado) {
            throw new Error('Não há exemplares deste livro disponíveis na estante no momento.');
          }
        }

        const livroPai = await trx('livros').where({ id: livro_id }).first();
        const novaQtdDisponivel = Math.max(0, livroPai.exemplares_disponiveis - 1);

        // Atualizações simultâneas no Banco de Dados
        await Promise.all([
          // 1. Cria o registro do empréstimo
          trx('alugueis').insert({
            livro_id: livro_id, 
            exemplar_id: exemplarSelecionado.id, 
            usuario_id: usuario_id,
            data_prevista_devolucao: dataPrevista, 
            status: 'ativo'
          }),
          
          // 2. Muda o status da cópia física para 'emprestado'
          trx('exemplares').where({ id: exemplarSelecionado.id }).update({ disponibilidade: 'emprestado' }),
          
          // 3. Atualiza o contador global do livro no catálogo
          trx('livros').where({ id: livro_id }).update({
            exemplares_disponiveis: novaQtdDisponivel,
            status: novaQtdDisponivel === 0 ? 'alugado' : 'disponivel'
          })
        ]);
      });

      res.status(201).json({ 
        message: '✅ Empréstimo registrado com sucesso!', 
        prazo_devolucao: dataPrevista.toLocaleDateString('pt-BR') 
      });

    } catch (erro: any) { 
      res.status(400).json({ error: erro.message }); 
    }
  };

  /**
   * Processa a devolução de um livro e calcula multas se houver atraso ou dano.
   */
  devolver = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { id } = req.params;
      const { estado_exemplar = 'bom', observacao = '' } = req.body;

      const estadosAceitos = ['bom', 'danificado', 'perdido'];
      if (!estadosAceitos.includes(estado_exemplar)) {
        return res.status(400).json({ error: 'Estado físico inválido na devolução.' });
      }

      const listaMultas: { tipo: string; valor: number; dias?: number }[] = [];

      await db.transaction(async (trx) => {
        // Recupera o registro do empréstimo ativo
        const emprestimo = await trx('alugueis')
          .join('livros', 'alugueis.livro_id', 'livros.id')
          .where('alugueis.id', id)
          .where('alugueis.status', 'ativo')
          .select(
            'alugueis.id', 'alugueis.livro_id', 'alugueis.exemplar_id',
            'alugueis.usuario_id', 'alugueis.data_prevista_devolucao',
            'livros.exemplares_disponiveis'
          )
          .first();

        if (!emprestimo) {
          throw new Error('Não foi encontrado um empréstimo ativo para este registro.');
        }

        // --- Cálculo de Multa por Atraso ---
        const hoje = new Date(); 
        hoje.setHours(0, 0, 0, 0);
        
        const dataVencimento = new Date(emprestimo.data_prevista_devolucao); 
        dataVencimento.setHours(0, 0, 0, 0);

        const diffMilis = hoje.getTime() - dataVencimento.getTime();
        const diasDeAtraso = Math.floor(diffMilis / (1000 * 60 * 60 * 24));
        
        if (diasDeAtraso > 0) {
          const valorAtraso = diasDeAtraso * VALOR_MULTA_DIARIA;
          
          await trx('multas').insert({ 
            aluguel_id: emprestimo.id, 
            usuario_id: emprestimo.usuario_id, 
            tipo: 'atraso', 
            valor: valorAtraso, 
            dias_atraso: diasDeAtraso, 
            status: 'pendente' 
          });
          
          listaMultas.push({ tipo: 'atraso', valor: valorAtraso, dias: diasDeAtraso });
        }

        // --- Cálculo de Multa por Perda/Extravio ---
        if (estado_exemplar === 'perdido') {
          await trx('multas').insert({ 
            aluguel_id: emprestimo.id, 
            usuario_id: emprestimo.usuario_id, 
            tipo: 'perda', 
            valor: VALOR_MULTA_PERDA, 
            dias_atraso: 0, 
            status: 'pendente' 
          });
          listaMultas.push({ tipo: 'perda', valor: VALOR_MULTA_PERDA });
        }

        // Bloqueia o usuário se houver qualquer multa gerada
        if (listaMultas.length > 0) {
          await trx('usuarios').where({ id: emprestimo.usuario_id }).update({ multa_pendente: true });
        }

        // --- Atualização de Inventário ---
        const exemplarSumiu = estado_exemplar === 'perdido';
        const novaDisponibilidade = exemplarSumiu ? 'perdido' : 'disponivel';
        
        // O estoque total do livro só aumenta se o exemplar físico retornar
        let novaQtdEstoque = emprestimo.exemplares_disponiveis;
        if (!exemplarSumiu) {
          novaQtdEstoque = novaQtdEstoque + 1;
        }

        await Promise.all([
          // Fecha o ciclo do empréstimo
          trx('alugueis').where({ id }).update({
            status: 'devolvido', 
            data_devolucao: new Date(), 
            estado_devolucao: estado_exemplar
          }),
          
          // Atualiza a ficha médica da cópia física
          trx('exemplares').where({ id: emprestimo.exemplar_id }).update({
            disponibilidade: novaDisponibilidade,
            condicao: estado_exemplar,
            observacao: observacao?.trim() || null
          }),
          
          // Reajusta o catálogo global
          trx('livros').where({ id: emprestimo.livro_id }).update({
            exemplares_disponiveis: novaQtdEstoque,
            status: novaQtdEstoque > 0 ? 'disponivel' : 'alugado'
          })
        ]);
      });

      // Consolidação do retorno para o usuário
      const totalMultas = listaMultas.reduce((acc, m) => acc + m.valor, 0);
      let msgSucesso = 'Livro devolvido com sucesso!';
      
      if (estado_exemplar === 'perdido') {
        msgSucesso = 'Devolução registrada: Exemplar marcado como PERDIDO e removido do inventário disponível.';
      } else if (estado_exemplar === 'danificado') {
        msgSucesso = 'Devolução registrada: Exemplar marcado como DANIFICADO (verifique a integridade física).';
      }

      res.json({
        message: msgSucesso, 
        multas_detalhadas: listaMultas,
        total_de_multa: totalMultas > 0 ? totalMultas : 0,
        aviso: totalMultas > 0 ? `Atenção: Multa acumulada de R$ ${totalMultas.toFixed(2)}. Cadastro bloqueado até a quitação.` : null
      });

    } catch (erro: any) { 
      res.status(400).json({ error: erro.message }); 
    }
  };

  /**
   * Quita todas as multas pendentes de um usuário de uma vez.
   */
  pagarMulta = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { usuario_id } = req.params;
      
      const multasEmAberto = await db('multas')
        .where({ usuario_id, status: 'pendente' })
        .select('id', 'valor');
      
      if (!multasEmAberto.length) {
        return res.status(404).json({ error: 'Este usuário não possui multas em aberto.' });
      }

      const totalPago = multasEmAberto.reduce((sum, m) => sum + Number(m.valor), 0);

      await db.transaction(async (trx) => {
        // Marca todas como pagas
        await trx('multas')
          .whereIn('id', multasEmAberto.map(m => m.id))
          .update({ status: 'paga', pago_em: new Date() });
          
        // Libera o usuário para novos empréstimos
        await trx('usuarios').where({ id: usuario_id }).update({ multa_pendente: false });
      });

      res.json({ 
        message: '✅ Pagamento processado com sucesso!', 
        quantidade: multasEmAberto.length, 
        total_pago: totalPago 
      });
    } catch (erro) { 
      res.status(500).json({ error: 'Falha interna ao processar o pagamento das multas.' }); 
    }
  };

  /**
   * Lista histórico de multas (Bibliotecário visualizando um usuário específico).
   */
  listarMultas = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { usuario_id } = req.params;
      
      const multas = await db('multas')
        .join('alugueis', 'multas.aluguel_id', 'alugueis.id')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .where('multas.usuario_id', usuario_id)
        .select(
          'multas.id', 'multas.tipo', 'multas.valor', 'multas.dias_atraso', 
          'multas.status', 'multas.pago_em', 'multas.created_at', 
          'livros.titulo as livro'
        )
        .orderBy('multas.created_at', 'desc');

      const totalPendente = multas
        .filter(m => m.status === 'pendente')
        .reduce((sum, m) => sum + Number(m.valor), 0);

      res.json({ multas, total_pendente: totalPendente });
    } catch { 
      res.status(500).json({ error: 'Erro ao recuperar extrato de multas.' }); 
    }
  };

  /**
   * Extrato de multas do próprio usuário logado.
   */
  minhasMultas = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const usuarioId = req.usuario!.id;
      
      const multas = await db('multas')
        .join('alugueis', 'multas.aluguel_id', 'alugueis.id')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .where('multas.usuario_id', usuarioId)
        .select(
          'multas.id', 'multas.tipo', 'multas.valor', 'multas.dias_atraso', 
          'multas.status', 'multas.created_at', 'livros.titulo as livro'
        )
        .orderBy('multas.created_at', 'desc');

      const totalPendente = multas
        .filter(m => m.status === 'pendente')
        .reduce((sum, m) => sum + Number(m.valor), 0);

      res.json({ multas, total_pendente: totalPendente });
    } catch { 
      res.status(500).json({ error: 'Não foi possível carregar seu histórico de multas.' }); 
    }
  };

  /**
   * Listagem mestre de todos os empréstimos ativos (Para o Painel Administrativo).
   */
  listarTodos = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const hoje = new Date(); 
      hoje.setHours(0, 0, 0, 0);

      const { page, limit, busca, sort, order } = req.query;
      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(50, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      const colunasAceitas = ['usuarios.nome', 'livros.titulo', 'alugueis.data_aluguel', 'alugueis.data_prevista_devolucao'];
      const colOrdenacao = colunasAceitas.includes(String(sort)) ? String(sort) : 'alugueis.data_aluguel';
      const dirOrdenacao = order === 'desc' ? 'desc' : 'asc';

      let baseQuery = db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('exemplares', 'alugueis.exemplar_id', 'exemplares.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .where('alugueis.status', 'ativo');

      // Busca por Nome do Usuário, Título do Livro ou Código da Cópia
      const termo = String(busca || '').trim();
      if (termo) {
        const queryTermo = `%${termo}%`;
        baseQuery = baseQuery.where(builder => 
          builder.whereILike('usuarios.nome', queryTermo)
            .orWhereILike('livros.titulo', queryTermo)
            .orWhereILike('exemplares.codigo', queryTermo)
        );
      }

      const [registros, contagem] = await Promise.all([
        baseQuery.clone().select(
          'alugueis.id', 'usuarios.nome as usuario', 'usuarios.multa_pendente',
          'livros.titulo', 'exemplares.id as exemplar_id', 'exemplares.codigo as exemplar_codigo',
          'alugueis.data_aluguel', 'alugueis.data_prevista_devolucao as prazo',
          db.raw(`CASE WHEN alugueis.data_prevista_devolucao < ? THEN 'atrasado' ELSE 'ativo' END as status`, [hoje]),
          db.raw(`GREATEST(0, DATEDIFF(NOW(), alugueis.data_prevista_devolucao)) as dias_atraso`),
          db.raw(`GREATEST(0, DATEDIFF(NOW(), alugueis.data_prevista_devolucao)) * ${VALOR_MULTA_DIARIA} as multa_acumulada`),
          db.raw('TRUE as pode_devolver'), 
          db.raw('TRUE as pode_renovar')
        ).orderBy(colOrdenacao, dirOrdenacao).limit(limite).offset(deslocamento),
        baseQuery.clone().count('alugueis.id as total')
      ]);

      const totalGeral = Number(contagem[0].total);
      res.json({ 
        data: registros, 
        total: totalGeral, 
        page: pagina, 
        limit: limite, 
        pages: Math.ceil(totalGeral / limite) 
      });
    } catch { 
      res.status(500).json({ error: 'Erro ao listar empréstimos ativos.' }); 
    }
  };

  /**
   * Retorna os empréstimos (ativos ou históricos) específicos do usuário logado.
   */
  meus = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const usuarioId = req.usuario!.id;
      const hoje = new Date(); 
      hoje.setHours(0, 0, 0, 0);

      const alugueis = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('exemplares', 'alugueis.exemplar_id', 'exemplares.id')
        .where({ 'alugueis.usuario_id': usuarioId })
        .select(
          'alugueis.id', 'livros.titulo', 'exemplares.codigo as exemplar_codigo',
          'alugueis.data_aluguel', 'alugueis.data_prevista_devolucao as prazo',
          db.raw(`CASE WHEN alugueis.status='devolvido' THEN 'devolvido' WHEN alugueis.data_prevista_devolucao < ? THEN 'atrasado' ELSE 'ativo' END as status`, [hoje]),
          db.raw('COALESCE(alugueis.renovacoes, 0) as renovacoes'),
          db.raw(`CASE WHEN alugueis.status='ativo' AND COALESCE(alugueis.renovacoes,0)<2 THEN TRUE ELSE FALSE END as pode_renovar`),
          db.raw(`GREATEST(0, DATEDIFF(NOW(), alugueis.data_prevista_devolucao)) as dias_atraso`),
          db.raw(`GREATEST(0, DATEDIFF(NOW(), alugueis.data_prevista_devolucao)) * ${VALOR_MULTA_DIARIA} as multa_acumulada`)
        )
        .orderBy('alugueis.id', 'desc');

      res.json(alugueis);
    } catch { 
      res.status(500).json({ error: 'Não foi possível recuperar seus empréstimos.' }); 
    }
  };

  /**
   * Exibe o histórico de todos os livros já devolvidos no sistema.
   */
  historico = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { page, limit, usuario_id, sort, order } = req.query;
      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(50, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      const colunasValidas = ['usuarios.nome', 'livros.titulo', 'alugueis.data_aluguel', 'alugueis.data_devolucao'];
      const colOrd = colunasValidas.includes(String(sort)) ? String(sort) : 'alugueis.data_devolucao';
      const dirOrd = order === 'desc' ? 'desc' : 'asc';

      let baseQuery = db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .join('exemplares', 'alugueis.exemplar_id', 'exemplares.id')
        .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
        .where('alugueis.status', 'devolvido');

      // Opcional: Filtra histórico de um aluno específico
      if (usuario_id) {
        baseQuery = baseQuery.where('alugueis.usuario_id', Number(usuario_id));
      }

      const [registros, contagem] = await Promise.all([
        baseQuery.clone().select(
          'alugueis.id', 'usuarios.nome as usuario', 'livros.titulo',
          'exemplares.codigo as exemplar_codigo',
          'alugueis.data_aluguel', 'alugueis.data_prevista_devolucao as prazo',
          'alugueis.data_devolucao', 'alugueis.estado_devolucao',
          db.raw('COALESCE(alugueis.renovacoes,0) as renovacoes'),
          db.raw(`'devolvido' as status`)
        ).orderBy(colOrd, dirOrd).limit(limite).offset(deslocamento),
        baseQuery.clone().count('alugueis.id as total')
      ]);

      const totalGeral = Number(contagem[0].total);
      res.json({ 
        data: registros, 
        total: totalGeral, 
        page: pagina, 
        limit: limite, 
        pages: Math.ceil(totalGeral / limite) 
      });
    } catch { 
      res.status(500).json({ error: 'Erro ao carregar o histórico de devoluções.' }); 
    }
  };

  /**
   * Resumo rápido de todos os empréstimos que já estouraram o prazo.
   */
  atrasados = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const hoje = new Date(); 
      hoje.setHours(0, 0, 0, 0);

      const listaAtrasados = await db('alugueis')
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
          db.raw(`DATEDIFF(NOW(), alugueis.data_prevista_devolucao) * ${VALOR_MULTA_DIARIA} as multa_acumulada`)
        )
        .orderBy('dias_atraso', 'desc');

      res.json({ total: listaAtrasados.length, data: listaAtrasados });
    } catch { 
      res.status(500).json({ error: 'Erro ao compilar lista de atrasados.' }); 
    }
  };

  /**
   * Adiciona mais 14 dias ao prazo de devolução. Limite de 2 renovações.
   */
  renovar = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      const { id } = req.params;
      
      const aluguelActual = await db('alugueis').where({ id, status: 'ativo' }).first();
      
      if (!aluguelActual) {
        throw new Error('Este empréstimo não está mais ativo ou não existe.');
      }
      
      if ((aluguelActual.renovacoes ?? 0) >= 2) {
        throw new Error('Limite de renovações atingido (máximo permitido: 2 vezes).');
      }

      const novoPrazo = new Date(aluguelActual.data_prevista_devolucao);
      novoPrazo.setDate(novoPrazo.getDate() + 14);

      await db('alugueis').where({ id }).update({
        data_prevista_devolucao: novoPrazo,
        renovacoes: (aluguelActual.renovacoes ?? 0) + 1
      });

      res.json({ 
        message: '🔄 Empréstimo renovado com sucesso!', 
        novo_prazo: novoPrazo.toLocaleDateString('pt-BR'), 
        renovacoes_restantes: 2 - (aluguelActual.renovacoes + 1)
      });
    } catch (erro: any) { 
      res.status(400).json({ error: erro.message }); 
    }
  };
}