const supabase = require('../database');

// Configurações financeiras do sistema de multas
const VALOR_MULTA_DIARIA = 1.00; // Valor cobrado por cada dia de atraso
const VALOR_MULTA_PERDA = 100.00; // Valor fixo cobrado se o livro for extraviado

/**
 * AluguelController: Gerencia todo o ciclo de vida de um empréstimo.
 * Desde a saída do livro da estante até a devolução, cálculo de multas e renovações.
 */
class AluguelController {

  /**
   * Registra a saída de um livro para um leitor.
   * Verifica se o usuário pode alugar (limite de 3 livros, sem bloqueios ou multas).
   * Atualiza o estado do exemplar físico e o contador de disponibilidade do livro.
   */
  criar = async (req, res) => {
    try {
      const { livro_id, usuario_id, exemplar_id } = req.body;

      // Validação: o usuário existe?
      const { data: usuario } = await supabase.from('usuarios').select('*').eq('id', usuario_id).single();
      
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não localizado no sistema.' });
      }

      // Validação: o usuário está impedido de alugar?
      if (usuario.bloqueado) {
        return res.status(400).json({ 
          error: `O usuário está impedido de realizar novos empréstimos. Motivo: ${usuario.motivo_bloqueio || 'Bloqueio administrativo.'}` 
        });
      }

      // Validação: o usuário tem dívidas pendentes?
      if (usuario.multa_pendente) {
        const { data: multas } = await supabase.from('multas').select('valor').eq('usuario_id', usuario_id).eq('status', 'pendente');
        const totalDevido = (multas || []).reduce((total, m) => total + Number(m.valor), 0);

        return res.status(400).json({
          error: `Usuário possui débitos pendentes de R$ ${totalDevido.toFixed(2)}. Regularize a situação para continuar.`
        });
      }

      // Validação: o usuário já atingiu o limite de livros na rua?
      const { count: emprestimosAtivos } = await supabase
        .from('alugueis')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuario_id)
        .eq('status', 'ativo');

      if (emprestimosAtivos >= 3) {
        return res.status(400).json({
          error: 'Usuário atingiu o limite máximo de 3 empréstimos ativos. Devolva algum livro antes de fazer novo empréstimo.'
        });
      }

      // Define as datas: hoje é a saída, e o prazo padrão é de 14 dias (2 semanas)
      const dataAluguel = new Date();
      const dataPrevista = new Date();
      dataPrevista.setDate(dataAluguel.getDate() + 14);

      let exemplarSelecionado;
      
      /**
       * Seleção do exemplar físico:
       * Se o bibliotecário escolheu um código específico, usamos ele.
       * Se não, pegamos automaticamente o primeiro que estiver livre na prateleira.
       */
      if (exemplar_id) {
        const { data } = await supabase.from('exemplares').select('*').eq('id', exemplar_id).eq('livro_id', livro_id).eq('disponibilidade', 'disponivel').single();
        exemplarSelecionado = data;
            
        if (!exemplarSelecionado) {
          throw new Error('O exemplar físico solicitado não está disponível para empréstimo.');
        }
      } else {
        const { data } = await supabase.from('exemplares').select('*').eq('livro_id', livro_id).eq('disponibilidade', 'disponivel').order('id', { ascending: true }).limit(1).single();
        exemplarSelecionado = data;
            
        if (!exemplarSelecionado) {
          throw new Error('Não há exemplares deste livro disponíveis na estante no momento.');
        }
      }

      const { data: livroPai } = await supabase.from('livros').select('*').eq('id', livro_id).single();
      const novaQtdDisponivel = Math.max(0, (livroPai.exemplares_disponiveis || 0) - 1);

      let aluguelCriado = null;

      try {
        /**
         * Operação Atômica (Transação manual):
         * 1. Cria o registro do empréstimo.
         * 2. Marca o exemplar como 'emprestado'.
         * 3. Diminui a quantidade disponível no catálogo.
         * Se qualquer passo falhar, o sistema tenta desfazer os anteriores (Rollback).
         */
        const { error: insertError, data } = await supabase.from('alugueis').insert({
          livro_id: livro_id,
          exemplar_id: exemplarSelecionado.id,
          usuario_id: usuario_id,
          data_aluguel: dataAluguel.toISOString(),
          data_prevista_devolucao: dataPrevista.toISOString(),
          status: 'ativo'
        }).select().single();

        if (insertError) throw insertError;
        aluguelCriado = data;

        const { error: updateExemplarError } = await supabase.from('exemplares').update({ disponibilidade: 'emprestado' }).eq('id', exemplarSelecionado.id);
        if (updateExemplarError) throw updateExemplarError;

        const { error: updateLivroError } = await supabase.from('livros').update({
          exemplares_disponiveis: novaQtdDisponivel,
          status: novaQtdDisponivel === 0 ? 'alugado' : 'disponivel'
        }).eq('id', livro_id);
        if (updateLivroError) throw updateLivroError;

        res.status(201).json({
          message: '✅ Empréstimo registrado com sucesso!',
          prazo_devolucao: dataPrevista.toLocaleDateString('pt-BR')
        });

      } catch (transactionError) {
        // Rollback: desfaz o que foi feito para não deixar o banco de dados bagunçado
        console.error('Erro na transação de empréstimo, fazendo rollback:', transactionError);

        if (aluguelCriado) {
          await supabase.from('alugueis').delete().eq('id', aluguelCriado.id);
        }

        const { data: exemplarCheck } = await supabase.from('exemplares').select('disponibilidade').eq('id', exemplarSelecionado.id).single();
        if (exemplarCheck?.disponibilidade === 'emprestado') {
          await supabase.from('exemplares').update({ disponibilidade: 'disponivel' }).eq('id', exemplarSelecionado.id);
        }

        const { data: livroCheck } = await supabase.from('livros').select('exemplares_disponiveis').eq('id', livro_id).single();
        if (livroCheck?.exemplares_disponiveis !== livroPai.exemplares_disponiveis) {
          await supabase.from('livros').update({
            exemplares_disponiveis: livroPai.exemplares_disponiveis,
            status: livroPai.status
          }).eq('id', livro_id);
        }

        throw transactionError;
      }

    } catch (erro) { 
      res.status(400).json({ error: erro.message }); 
    }
  };

  /**
   * Finaliza um empréstimo e processa a entrada do livro de volta à biblioteca.
   * Calcula multas por atraso, verifica se o livro foi perdido ou danificado
   * e libera o exemplar para novos leitores.
   */
  devolver = async (req, res) => {
    try {
      const { id } = req.params;
      const { estado_exemplar = 'bom', observacao = '' } = req.body;

      const estadosAceitos = ['bom', 'danificado', 'perdido'];
      if (!estadosAceitos.includes(estado_exemplar)) {
        return res.status(400).json({ error: 'Estado físico inválido na devolução.' });
      }

      const listaMultas = [];

      const { data: emprestimo } = await supabase
        .from('alugueis')
        .select('*, livros(*)')
        .eq('id', id)
        .eq('status', 'ativo')
        .single();

      if (!emprestimo) {
        throw new Error('Não foi encontrado um empréstimo ativo para este registro.');
      }

      // Cálculo de Multa por Atraso: compara hoje com o prazo prometido
      const hoje = new Date(); 
      hoje.setHours(0, 0, 0, 0);
      
      const dataVencimento = new Date(emprestimo.data_prevista_devolucao); 
      dataVencimento.setHours(0, 0, 0, 0);

      const diffMilis = hoje.getTime() - dataVencimento.getTime();
      const diasDeAtraso = Math.floor(diffMilis / (1000 * 60 * 60 * 24));
      
      if (diasDeAtraso > 0) {
        const valorAtraso = diasDeAtraso * VALOR_MULTA_DIARIA;
        
        await supabase.from('multas').insert({ 
          aluguel_id: emprestimo.id, 
          usuario_id: emprestimo.usuario_id, 
          tipo: 'atraso', 
          valor: valorAtraso, 
          dias_atraso: diasDeAtraso, 
          status: 'pendente' 
        });
        
        listaMultas.push({ tipo: 'atraso', valor: valorAtraso, dias: diasDeAtraso });
      }

      // Multa por Perda: aplicada se o exemplar não voltar fisicamente
      if (estado_exemplar === 'perdido') {
        await supabase.from('multas').insert({ 
          aluguel_id: emprestimo.id, 
          usuario_id: emprestimo.usuario_id, 
          tipo: 'perda', 
          valor: VALOR_MULTA_PERDA, 
          dias_atraso: 0, 
          status: 'pendente' 
        });
        
        listaMultas.push({ tipo: 'perda', valor: VALOR_MULTA_PERDA });
      }

      // Se gerou qualquer multa, marca o usuário como devedor
      if (listaMultas.length > 0) {
        await supabase.from('usuarios').update({ multa_pendente: true }).eq('id', emprestimo.usuario_id);
      }

      const exemplarSumiu = estado_exemplar === 'perdido';
      const novaDisponibilidade = exemplarSumiu ? 'perdido' : 'disponivel';
      
      // Ajusta o estoque: se o livro foi perdido, ele não volta para a contagem de disponíveis
      let novaQtdEstoque = (emprestimo.livros?.exemplares_disponiveis || 0);
      if (!exemplarSumiu) {
        novaQtdEstoque = novaQtdEstoque + 1;
      }

      // Salva a devolução e atualiza os estados do exemplar e do livro pai
      await supabase.from('alugueis').update({
        status: 'devolvido', 
        data_devolucao: new Date().toISOString(), 
        estado_devolucao: estado_exemplar
      }).eq('id', id);

      await supabase.from('exemplares').update({
        disponibilidade: novaDisponibilidade,
        condicao: estado_exemplar,
        observacao: observacao?.trim() || null
      }).eq('id', emprestimo.exemplar_id);

      await supabase.from('livros').update({
        exemplares_disponiveis: novaQtdEstoque,
        status: novaQtdEstoque > 0 ? 'disponivel' : 'alugado'
      }).eq('id', emprestimo.livro_id);

      const totalMultas = listaMultas.reduce((acc, m) => acc + m.valor, 0);
      let msgSucesso = 'Livro devolvido com sucesso!';
      
      if (estado_exemplar === 'perdido') {
        msgSucesso = 'Devolução registrada: Exemplar marcado como PERDIDO e removido do inventário disponível.';
      } else if (estado_exemplar === 'danificado') {
        msgSucesso = 'Devolução registrada: Exemplar marcado como DANIFICADO (verifique a integridade física).';
      }

      res.json({
        message: msgSucesso, 
        multas_detalhadas: listaMultas.map(m => ({ ...m, valor_formatado: `R$ ${m.valor.toFixed(2)}` })),
        total_de_multa: totalMultas > 0 ? totalMultas : 0,
        total_multa_formatada: totalMultas > 0 ? `R$ ${totalMultas.toFixed(2)}` : 'R$ 0,00',
        aviso: totalMultas > 0 ? `Atenção: Multa acumulada de R$ ${totalMultas.toFixed(2)}. Cadastro bloqueado até a quitação.` : null
      });

    } catch (erro) { 
      res.status(400).json({ error: erro.message }); 
    }
  };

  /**
   * Processa o pagamento de todas as multas pendentes de um usuário.
   * Libera o cadastro do usuário para novos empréstimos após a quitação.
   */
  pagarMulta = async (req, res) => {
    try {
      const { usuario_id } = req.params;
      
      const { data: multasEmAberto } = await supabase.from('multas').select('id, valor').eq('usuario_id', usuario_id).eq('status', 'pendente');
      
      if (!multasEmAberto || multasEmAberto.length === 0) {
        return res.status(404).json({ error: 'Este usuário não possui multas em aberto.' });
      }

      const totalPago = multasEmAberto.reduce((sum, m) => sum + Number(m.valor), 0);
      const ids = multasEmAberto.map(m => m.id);

      // Atualiza o status de todas as multas e desbloqueia o usuário
      await supabase.from('multas').update({ status: 'paga', pago_em: new Date().toISOString() }).in('id', ids);
      await supabase.from('usuarios').update({ multa_pendente: false }).eq('id', usuario_id);

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
   * Retorna o histórico de multas de um usuário específico para o bibliotecário.
   */
  listarMultas = async (req, res) => {
    try {
      const { usuario_id } = req.params;
      
      const { data: multas } = await supabase
        .from('multas')
        .select('*, alugueis(*, livros(*))')
        .eq('usuario_id', usuario_id)
        .order('created_at', { ascending: false });

      const totalPendente = (multas || [])
        .filter(m => m.status === 'pendente')
        .reduce((sum, m) => sum + Number(m.valor), 0);

      const dadosFormatados = (multas || []).map(m => ({
        ...m,
        livro: m.alugueis?.livros?.titulo,
        valor_formatado: `R$ ${Number(m.valor).toFixed(2)}`
      }));

      res.json({ multas: dadosFormatados, total_pendente: totalPendente, total_pendente_formatado: `R$ ${totalPendente.toFixed(2)}` });
    } catch { 
      res.status(500).json({ error: 'Erro ao recuperar extrato de multas.' }); 
    }
  };

  /**
   * Retorna o histórico de multas do próprio usuário logado.
   */
  minhasMultas = async (req, res) => {
    try {
      const usuarioId = req.usuario.id;
      
      const { data: multas } = await supabase
        .from('multas')
        .select('*, alugueis(*, livros(*))')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });

      const totalPendente = (multas || [])
        .filter(m => m.status === 'pendente')
        .reduce((sum, m) => sum + Number(m.valor), 0);

      const dadosFormatados = (multas || []).map(m => ({
        ...m,
        livro: m.alugueis?.livros?.titulo
      }));

      res.json({ multas: dadosFormatados, total_pendente: totalPendente });
    } catch { 
      res.status(500).json({ error: 'Não foi possível carregar seu histórico de multas.' }); 
    }
  };

  /**
   * Permite que o próprio leitor quite suas dívidas via sistema (auto-atendimento).
   */
  pagarMinhasMultas = async (req, res) => {
    try {
      const usuarioId = req.usuario.id;
      
      const { data: multasEmAberto } = await supabase.from('multas').select('id, valor').eq('usuario_id', usuarioId).eq('status', 'pendente');
      
      if (!multasEmAberto || multasEmAberto.length === 0) {
        return res.status(404).json({ error: 'Você não possui multas pendentes para pagar.' });
      }

      const totalPago = multasEmAberto.reduce((sum, m) => sum + Number(m.valor), 0);
      const ids = multasEmAberto.map(m => m.id);

      await supabase.from('multas').update({ status: 'paga', pago_em: new Date().toISOString() }).in('id', ids);
      await supabase.from('usuarios').update({ multa_pendente: false }).eq('id', usuarioId);

      res.json({ 
        message: '✅ Pagamento das multas processado com sucesso!', 
        total_pago: totalPago 
      });
    } catch { 
      res.status(500).json({ error: 'Erro ao processar o auto-pagamento das multas.' }); 
    }
  };

  /**
   * Lista todos os empréstimos ativos da biblioteca com paginação.
   * Usado exclusivamente pelo bibliotecário para monitorar quem está com quais livros.
   */
  listarTodos = async (req, res) => {
    try {
      const hoje = new Date(); 
      hoje.setHours(0, 0, 0, 0);

      const { page, limit, busca } = req.query;
      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(50, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      let consulta = supabase
        .from('alugueis')
        .select('*, livros(*), exemplares(*), usuarios(*)', { count: 'exact' })
        .eq('status', 'ativo');

      const termo = String(busca || '').trim();
      if (termo) {
        consulta = consulta.or(`usuarios.nome.ilike.%${termo}%,livros.titulo.ilike.%${termo}%`);
      }

      consulta = consulta.order('data_aluguel', { ascending: true }).range(deslocamento, deslocamento + limite - 1);

      const { data: registros, count: total, error } = await consulta;

      if (error) throw error;

      // Conta quantos dos ativos já passaram do prazo (atrasados)
      const { count: totalAtrasados } = await supabase
        .from('alugueis')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo')
        .lt('data_prevista_devolucao', hoje.toISOString());

      const dadosFormatados = (registros || []).map((r) => ({
        id: r.id,
        usuario: r.usuarios?.nome,
        titulo: r.livros?.titulo,
        exemplar_codigo: r.exemplares?.codigo,
        data_aluguel: r.data_aluguel,
        prazo: r.data_prevista_devolucao,
        status: new Date(r.data_prevista_devolucao) < hoje ? 'atrasado' : 'ativo',
        multa_acumulada: 0,
        multa_acumulada_formatada: 'R$ 0,00',
        pode_devolver: true
      }));

      res.json({ 
        data: dadosFormatados, 
        total: total || 0, 
        total_atrasados: totalAtrasados || 0,
        page: pagina, 
        limit: limite, 
        pages: Math.ceil((total || 0) / limite) 
      });
    } catch { 
      res.status(500).json({ error: 'Erro ao listar empréstimos ativos.' }); 
    }
  };

  /**
   * Retorna os empréstimos atuais do usuário que está logado.
   */
  meus = async (req, res) => {
    try {
      const usuarioId = req.usuario.id;
      const hoje = new Date(); 
      hoje.setHours(0, 0, 0, 0);

      const { data: alugueis } = await supabase
        .from('alugueis')
        .select('*, livros(*), exemplares(*)')
        .eq('usuario_id', usuarioId)
        .order('id', { ascending: false });

      const dadosFormatados = (alugueis || []).map((a) => ({
        id: a.id,
        titulo: a.livros?.titulo,
        exemplar_codigo: a.exemplares?.codigo,
        data_aluguel: a.data_aluguel,
        prazo: a.data_prevista_devolucao,
        status: a.status === 'devolvido' ? 'devolvido' : new Date(a.data_prevista_devolucao) < hoje ? 'atrasado' : 'ativo',
        renovacoes: a.renovacoes || 0,
        multa_acumulada: 0,
        multa_acumulada_formatada: 'R$ 0,00',
        pode_renovar: a.status === 'ativo' && (a.renovacoes || 0) < 2
      }));

      res.json(dadosFormatados);
    } catch { 
      res.status(500).json({ error: 'Não foi possível recuperar seus empréstimos.' }); 
    }
  };

  /**
   * Mostra o histórico de tudo o que já foi devolvido na biblioteca.
   */
  historico = async (req, res) => {
    try {
      const { page, limit, usuario_id } = req.query;
      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(50, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      let consulta = supabase
        .from('alugueis')
        .select('*, livros(*), exemplares(*), usuarios(*)', { count: 'exact' })
        .eq('status', 'devolvido');

      if (usuario_id) {
        consulta = consulta.eq('usuario_id', usuario_id);
      }

      consulta = consulta.order('data_devolucao', { ascending: false }).range(deslocamento, deslocamento + limite - 1);

      const { data: registros, count: total, error } = await consulta;

      if (error) throw error;

      const dadosFormatados = (registros || []).map(r => ({
        id: r.id,
        usuario: r.usuarios?.nome,
        titulo: r.livros?.titulo,
        exemplar_codigo: r.exemplares?.codigo,
        data_aluguel: r.data_aluguel,
        prazo: r.data_prevista_devolucao,
        data_devolucao: r.data_devolucao,
        estado_devolucao: r.estado_devolucao,
        renovacoes: r.renovacoes || 0,
        status: 'devolvido'
      }));

      res.json({ 
        data: dadosFormatados, 
        total: total || 0, 
        page: pagina, 
        limit: limite, 
        pages: Math.ceil((total || 0) / limite) 
      });
    } catch { 
      res.status(500).json({ error: 'Erro ao carregar o histórico de devoluções.' }); 
    }
  };

  /**
   * Permite adiar a data de devolução de um livro por mais 14 dias.
   * Existe um limite de no máximo 2 renovações por empréstimo.
   */
  renovar = async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: aluguelActual } = await supabase.from('alugueis').select('*').eq('id', id).eq('status', 'ativo').single();
      
      if (!aluguelActual) {
        throw new Error('Este empréstimo não está mais ativo ou não existe.');
      }
      
      // Validação: o leitor já renovou muitas vezes?
      if ((aluguelActual.renovacoes ?? 0) >= 2) {
        throw new Error('Limite de renovações atingido (máximo permitido: 2 vezes).');
      }

      // Calcula a nova data: adiciona 14 dias ao prazo que já existia
      const novoPrazo = new Date(aluguelActual.data_prevista_devolucao);
      novoPrazo.setDate(novoPrazo.getDate() + 14);

      const { error } = await supabase.from('alugueis').update({
        data_prevista_devolucao: novoPrazo.toISOString(),
        renovacoes: (aluguelActual.renovacoes ?? 0) + 1
      }).eq('id', id);

      if (error) throw error;

      res.json({ 
        message: '🔄 Empréstimo renovado com sucesso!', 
        novo_prazo: novoPrazo.toLocaleDateString('pt-BR'), 
        renovacoes_restantes: 2 - (aluguelActual.renovacoes + 1)
      });
    } catch (erro) { 
      res.status(400).json({ error: erro.message }); 
    }
  };
}

module.exports = new AluguelController();

