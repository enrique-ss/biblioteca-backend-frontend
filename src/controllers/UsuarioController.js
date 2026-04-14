const supabase = require('../database');

class UsuarioController {

  listar = async (req, res) => {
    try {
      const { busca, page, limit } = req.query;

      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      let consulta = supabase
        .from('usuarios')
        .select('id, nome, email, tipo, multa_pendente, bloqueado, motivo_bloqueio, created_at', { count: 'exact' })
        .is('deleted_at', null);

      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        consulta = consulta.or(`nome.ilike.%${termoBusca}%,email.ilike.%${termoBusca}%`);
      }

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

  atualizar = async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, email, tipo } = req.body;

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

      if (nome !== undefined) {
        if (nome.trim().length < 3) {
          return res.status(400).json({ error: 'O nome deve conter pelo menos 3 caracteres.' });
        }
        dadosParaAtualizar.nome = nome.trim();
      }

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

      res.json({ 
        message: '✅ Usuário atualizado com sucesso!', 
        usuario: usuarioAtualizado 
      });
    } catch (erro) {
      console.error('Erro ao atualizar usuário:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar atualizar os dados do usuário.' });
    }
  };

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

      const { error } = await supabase
        .from('usuarios')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      res.json({ message: '✅ Usuário arquivado com sucesso. Os registros históricos permanecem no banco para auditoria.' });
    } catch (erro) {
      console.error('Erro ao arquivar usuário:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar arquivar o usuário.' });
    }
  };

  bloquear = async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      if (!motivo?.trim()) {
        return res.status(400).json({ error: 'É obrigatório informar o motivo do bloqueio.' });
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      if (usuario.bloqueado) {
        return res.status(400).json({ error: 'Este usuário já se encontra bloqueado.' });
      }

      const { error } = await supabase
        .from('usuarios')
        .update({
          bloqueado: true,
          motivo_bloqueio: motivo.trim()
        })
        .eq('id', id);

      if (error) throw error;

      res.json({ message: '✅ Usuário bloqueado com sucesso!' });
    } catch (erro) {
      console.error('Erro ao bloquear usuário:', erro);
      res.status(500).json({ error: 'Erro interno ao processar o bloqueio.' });
    }
  };

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

      if (!usuario.bloqueado) {
        return res.status(400).json({ error: 'Este usuário não está bloqueado.' });
      }

      const { error } = await supabase
        .from('usuarios')
        .update({
          bloqueado: false,
          motivo_bloqueio: null
        })
        .eq('id', id);

      if (error) throw error;

      res.json({ message: '✅ Usuário desbloqueado. O acesso está liberado novamente.' });
    } catch (erro) {
      console.error('Erro ao desbloquear usuário:', erro);
      res.status(500).json({ error: 'Erro interno ao processar o desbloqueio.' });
    }
  };
}

module.exports = new UsuarioController();
