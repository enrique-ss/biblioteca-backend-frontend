const supabase = require('../database');

/**
 * AmizadeController: Gerencia o sistema de amigos (Social).
 * Responsável por enviar, aceitar, recusar pedidos e listar amigos.
 */
class AmizadeController {

  /**
   * Envia um pedido de amizade para outro usuário.
   */
  solicitar = async (req, res) => {
    try {
      const remetenteId = req.usuario.id;
      const { destinatario_id } = req.body;

      if (!destinatario_id) {
        return res.status(400).json({ error: 'ID do destinatário é obrigatório.' });
      }

      if (remetenteId === destinatario_id) {
        return res.status(400).json({ error: 'Você não pode ser amigo de si mesmo (embora devesse!).' });
      }

      // Verifica se já existe uma amizade ou pedido
      const { data: amizades } = await supabase
        .from('amizades')
        .select('*')
        .or(`usuario_remetente.eq.${remetenteId},usuario_destinatario.eq.${remetenteId}`);

      const existente = (amizades || []).find(a =>
        (a.usuario_remetente === remetenteId && a.usuario_destinatario === destinatario_id) ||
        (a.usuario_remetente === destinatario_id && a.usuario_destinatario === remetenteId)
      );

      if (existente) {
        return res.status(400).json({ error: 'Já existe um pedido pendente ou uma amizade entre vocês.' });
      }

      const { error } = await supabase.from('amizades').insert({
        usuario_remetente: remetenteId,
        usuario_destinatario: destinatario_id,
        status: 'pendente'
      });

      if (error) throw error;

      // Avisa o destinatário via Socket (para notificações em tempo real)
      req.app.get('io').to(destinatario_id).emit('novoPedidoAmizade', { remetente_id: remetenteId });
      req.app.get('io').emit('refreshData', 'notificacoes');

      res.status(201).json({ message: '✅ Pedido de amizade enviado!' });
    } catch (erro) {
      console.error('Erro ao solicitar amizade:', erro);
      res.status(500).json({ error: 'Erro ao enviar pedido de amizade.' });
    }
  };

  /**
   * Aceita um pedido de amizade recebido.
   */
  aceitar = async (req, res) => {
    try {
      const { id } = req.params; // ID da amizade na tabela
      const usuarioId = req.usuario.id;

      const { data: pedido } = await supabase
        .from('amizades')
        .select('*')
        .eq('id', id)
        .eq('usuario_destinatario', usuarioId)
        .eq('status', 'pendente')
        .single();

      if (!pedido) {
        return res.status(404).json({ error: 'Pedido de amizade não localizado.' });
      }

      await supabase.from('amizades').update({ status: 'aceito' }).eq('id', id);

      // Avisa o remetente que o pedido foi aceito
      req.app.get('io').to(pedido.usuario_remetente).emit('pedidoAmizadeAceito', { amigo_id: usuarioId });
      req.app.get('io').emit('refreshData', 'notificacoes');

      res.json({ message: '✅ Agora vocês são amigos!' });
    } catch (erro) {
      console.error('Erro ao aceitar amizade:', erro);
      res.status(500).json({ error: 'Erro ao aceitar amizade.' });
    }
  };

  /**
   * Recusa ou remove uma amizade.
   */
  remover = async (req, res) => {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario.id;

      const { data: amizade } = await supabase
        .from('amizades')
        .select('*')
        .eq('id', id)
        .or(`usuario_remetente.eq.${usuarioId},usuario_destinatario.eq.${usuarioId}`)
        .single();

      if (!amizade) {
        return res.status(404).json({ error: 'Amizade não localizada.' });
      }

      await supabase.from('amizades').delete().eq('id', id);

      res.json({ message: 'Amizade removida com sucesso.' });

      // Atualiza o estado social e notificações em tempo real
      req.app.get('io').emit('refreshData', 'notificacoes');
      req.app.get('io').emit('refreshData', 'social');
    } catch (erro) {
      console.error('Erro ao remover amizade:', erro);
      res.status(500).json({ error: 'Erro ao remover amizade.' });
    }
  };

  /**
   * Lista os amigos de um usuário.
   */
  listarAmigos = async (req, res) => {
    try {
      const { usuario_id } = req.params;

      const { data: amizades } = await supabase
        .from('amizades')
        .select('*')
        .eq('status', 'aceito')
        .or(`usuario_remetente.eq.${usuario_id},usuario_destinatario.eq.${usuario_id}`);

      if (!amizades || amizades.length === 0) {
        return res.json([]);
      }

      // Busca os detalhes dos usuários amigos
      const amigosIds = amizades.map(a =>
        a.usuario_remetente === usuario_id ? a.usuario_destinatario : a.usuario_remetente
      );

      const { data: amigos } = await supabase
        .from('usuarios')
        .select('id, nome, avatar_url, infantil_level, bio')
        .in('id', amigosIds);

      res.json(amigos || []);
    } catch (erro) {
      console.error('Erro ao listar amigos:', erro);
      res.status(500).json({ error: 'Erro ao carregar lista de amigos.' });
    }
  };

  /**
   * Lista pedidos de amizade pendentes para o usuário logado.
   */
  listarPendentes = async (req, res) => {
    try {
      const usuarioId = req.usuario.id;

      const { data: pendentes } = await supabase
        .from('amizades')
        .select('*, usuarios!usuario_remetente(nome, avatar_url)')
        .eq('usuario_destinatario', usuarioId)
        .eq('status', 'pendente');

      // No modo offline, o join pode não funcionar perfeitamente, então fazemos manual se necessário
      // Mas meu proxy já lida com o stripping, então precisamos resolver nomes manualmente

      const result = [];
      for (const p of (pendentes || [])) {
        const { data: user } = await supabase.from('usuarios').select('nome, avatar_url').eq('id', p.usuario_remetente).single();
        result.push({
          ...p,
          remetente_nome: user?.nome,
          remetente_avatar: user?.avatar_url
        });
      }

      res.json(result);
    } catch (erro) {
      console.error('Erro ao listar pedidos pendentes:', erro);
      res.status(500).json({ error: 'Erro ao carregar notificações sociais.' });
    }
  };

  /**
   * Verifica o status de amizade entre dois usuários.
   */
  checarStatus = async (req, res) => {
    try {
      const remetenteId = req.usuario.id;
      const { outro_id } = req.params;

      const { data: amizades } = await supabase
        .from('amizades')
        .select('*')
        .or(`usuario_remetente.eq.${remetenteId},usuario_destinatario.eq.${remetenteId}`);

      const amizade = (amizades || []).find(a =>
        (a.usuario_remetente === remetenteId && a.usuario_destinatario === outro_id) ||
        (a.usuario_remetente === outro_id && a.usuario_destinatario === remetenteId)
      );

      if (!amizade) {
        return res.json({ status: 'nenhum' });
      }

      if (amizade.status === 'aceito') {
        return res.json({ status: 'amigos', id: amizade.id });
      }

      if (amizade.usuario_remetente === remetenteId) {
        return res.json({ status: 'enviado', id: amizade.id });
      }

      return res.json({ status: 'recebido', id: amizade.id });
    } catch (erro) {
      res.json({ status: 'nenhum' });
    }
  };
}

module.exports = new AmizadeController();
