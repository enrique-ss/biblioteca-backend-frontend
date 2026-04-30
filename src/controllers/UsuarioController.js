const supabase = require('../database');

/**
 * UsuarioController: Responsável pela administração de contas e usuários.
 * Controla permissões, bloqueios, edição de perfis e a desativação de contas.
 */
class UsuarioController {

  /**
   * Lista todos os usuários cadastrados com suporte a busca e paginação.
   * Permite que o bibliotecário encontre leitores por nome ou e-mail.
   */
  listar = async (req, res) => {
    try {
      const { busca, page, limit } = req.query;

      // Define a página e a quantidade de registros por vez
      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      // Busca apenas usuários ativos (que não foram deletados/arquivados)
      let consulta = supabase
        .from('usuarios')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      // Filtra por nome ou e-mail se houver um termo de busca
      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        consulta = consulta.or(`nome.ilike.%${termoBusca}%,email.ilike.%${termoBusca}%`);
      }

      // Organiza por nome e aplica a paginação
      consulta = consulta.order('nome', { ascending: true }).range(deslocamento, deslocamento + limite - 1);

      const { data: registros, count: total, error } = await consulta;

      if (error) throw error;

      res.json({ 
        data: registros, 
        total: total || 0, 
        page: pagina, 
        limit: limite, 
        pages: Math.ceil((total || 0) / limite) 
      });
    } catch (erro) {
      console.error('Erro ao listar usuários:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar listar os usuários.' });
    }
  };

  /**
   * Permite que o bibliotecário altere dados de um usuário (nome, e-mail ou cargo).
   * Realiza validações de segurança para garantir que o e-mail não seja duplicado.
   */
  atualizar = async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, email, tipo } = req.body;

      // Garante que o usuário alvo existe e está ativo
      const { data: usuarioAlvo } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (!usuarioAlvo) {
        return res.status(404).json({ error: 'Usuário não encontrado ou já desativado.' });
      }

      const dadosParaAtualizar = {};

      // Validação de nome (mínimo de 3 letras)
      if (nome !== undefined) {
        if (nome.trim().length < 3) {
          return res.status(400).json({ error: 'O nome deve conter pelo menos 3 caracteres.' });
        }
        dadosParaAtualizar.nome = nome.trim();
      }

      // Validação de e-mail e verificação de duplicidade
      if (email !== undefined) {
        const emailFormatado = email.toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFormatado)) {
          return res.status(400).json({ error: 'Formato de e-mail inválido.' });
        }
        
        const { data: emailEmUso } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', emailFormatado)
          .neq('id', id)
          .is('deleted_at', null)
          .single();
        
        if (emailEmUso) {
          return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outro cadastro ativo.' });
        }
        dadosParaAtualizar.email = emailFormatado;
      }

      // Mudança de privilégios (usuário comum vs bibliotecário)
      if (tipo !== undefined) {
        if (!['usuario', 'bibliotecario'].includes(tipo)) {
          return res.status(400).json({ error: 'Tipo de conta inválido.' });
        }
        dadosParaAtualizar.tipo = tipo;
      }

      if (Object.keys(dadosParaAtualizar).length > 0) {
        const { error } = await supabase
          .from('usuarios')
          .update(dadosParaAtualizar)
          .eq('id', id);
        
        if (error) throw error;
      }

      const { data: usuarioAtualizado } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo')
        .eq('id', id)
        .single();

      // Notifica o frontend para atualizar as listas
      req.app.get('io').emit('refreshData', 'usuarios');

      res.json({ 
        message: '✅ Usuário atualizado com sucesso!', 
        usuario: usuarioAtualizado 
      });
    } catch (erro) {
      console.error('Erro ao atualizar usuário:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar atualizar os dados do usuário.' });
    }
  };

  /**
   * Desativa uma conta de usuário (Arquivamento).
   * O usuário não é apagado definitivamente para manter o histórico de empréstimos (auditoria).
   * Bloqueia a exclusão se o usuário ainda tiver livros em posse.
   */
  excluir = async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado ou já desativado.' });
      }

      // Segurança: não permite arquivar quem está com livros da biblioteca
      const { count: totalAtivos } = await supabase
        .from('alugueis')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', id)
        .eq('status', 'ativo');
      
      if ((totalAtivos || 0) > 0) {
        return res.status(400).json({ 
          error: `❌ Bloqueio de Segurança: O usuário possui ${totalAtivos} livro(s) pendente(s) de devolução.` 
        });
      }

      // Soft delete: marca a data de exclusão sem apagar a linha
      const { error } = await supabase
        .from('usuarios')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      req.app.get('io').emit('refreshData', 'usuarios');

      res.json({ message: '✅ Usuário arquivado com sucesso. Os registros históricos permanecem no banco para auditoria.' });
    } catch (erro) {
      console.error('Erro ao arquivar usuário:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar arquivar o usuário.' });
    }
  };

  /**
   * Gerencia as restrições de acesso de um usuário.
   * Permite bloqueios granulares (fisico, digital, social, infantil) ou total.
   */
  bloquear = async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo, bloqueios, ban } = req.body;

      // Validação básica
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Um usuário é considerado "bloqueado" (Banido) se a opção 'ban' estiver marcada.
      // Ele também pode ter restrições granulares mesmo sem estar banido.
      const b = bloqueios || {};

      await supabase.from('usuarios').update({
        bloqueado: !!ban,
        motivo_bloqueio: motivo?.trim() || null,
        bloqueios: b
      }).eq('id', id);

      req.app.get('io').emit('refreshData', 'usuarios');

      res.json({ 
        message: ban 
          ? '✅ Usuário BANIDO do sistema com sucesso.' 
          : '✅ Restrições de acesso atualizadas com sucesso.' 
      });
    } catch (erro) {
      console.error('Erro ao gerenciar bloqueios do usuário:', erro);
      res.status(500).json({ error: 'Erro interno ao processar as restrições de acesso.' });
    }
  };

  /**
   * Remove o bloqueio administrativo de um usuário, restaurando seu acesso.
   */
  desbloquear = async (req, res) => {
    try {
      const { id } = req.params;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      await supabase.from('usuarios').update({
        bloqueado: false,
        motivo_bloqueio: null,
        bloqueios: {}
      }).eq('id', id);

      req.app.get('io').emit('refreshData', 'usuarios');

      res.json({ message: '✅ Todas as restrições foram removidas. O acesso está liberado novamente.' });
    } catch (erro) {
      console.error('Erro ao desbloquear usuário:', erro);
      res.status(500).json({ error: 'Erro interno ao processar o desbloqueio.' });
    }
  };

  /**
   * Alterna o cargo do usuário entre 'usuario' (leitor) e 'bibliotecario'.
   */
  mudarTipo = async (req, res) => {
    try {
      const { id } = req.params;
      const { tipo } = req.body;

      // Segurança Redundante: Garante que apenas bibliotecários possam usar este método
      if (req.usuario.tipo !== 'bibliotecario') {
        return res.status(403).json({ error: '❌ Ação Proibida: Você não tem permissão para alterar cargos.' });
      }

      if (!['usuario', 'bibliotecario'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de conta inválido.' });
      }

      await supabase.from('usuarios').update({ tipo }).eq('id', id);

      req.app.get('io').emit('refreshData', 'usuarios');

      res.json({ message: `✅ Cargo alterado para ${tipo === 'bibliotecario' ? 'Bibliotecário' : 'Leitor'}.` });
    } catch (erro) {
      console.error('Erro ao mudar tipo de usuário:', erro);
      res.status(500).json({ error: 'Erro ao processar a mudança de cargo.' });
    }
  };
}

module.exports = new UsuarioController();
