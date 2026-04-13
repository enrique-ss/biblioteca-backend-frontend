const db = require('../database');

class UsuarioController {

  listar = async (req, res) => {
    try {
      const { busca, page, limit, sort, order } = req.query;

      const pagina = Math.max(1, parseInt(String(page || 1)));
      const limite = Math.min(100, parseInt(String(limit || 20)));
      const deslocamento = (pagina - 1) * limite;

      const colunasPermitidas = ['nome', 'email', 'tipo', 'created_at'];
      const colunaOrdenacao = colunasPermitidas.includes(String(sort)) ? String(sort) : 'nome';
      const direcaoOrdenacao = order === 'desc' ? 'desc' : 'asc';

      let consulta = db('usuarios')
        .where('deleted_at', null)
        .select(
          'id', 'nome', 'email', 'tipo', 'multa_pendente', 'bloqueado', 'motivo_bloqueio', 'created_at'
        );

      const termoBusca = String(busca || '').trim();
      if (termoBusca) {
        const queryTermo = `%${termoBusca}%`;
        consulta = consulta.where(builder => 
          builder.whereILike('nome', queryTermo)
            .orWhereILike('email', queryTermo)
            .orWhereRaw('CAST(id AS CHAR) LIKE ?', [queryTermo])
        );
      }

      const [registros, [{ total }]] = await Promise.all([
        consulta.clone()
          .orderBy(colunaOrdenacao, direcaoOrdenacao)
          .limit(limite)
          .offset(deslocamento),
        db('usuarios').where('deleted_at', null).modify(q => {
          if (termoBusca) {
            const queryTermo = `%${termoBusca}%`;
            q.where(builder => 
              builder.whereILike('nome', queryTermo)
                .orWhereILike('email', queryTermo)
                .orWhereRaw('CAST(id AS CHAR) LIKE ?', [queryTermo])
            );
          }
        }).count('id as total')
      ]);

      res.json({ 
        data: registros, 
        total: Number(total), 
        page: pagina, 
        limit: limite, 
        pages: Math.ceil(Number(total) / limite) 
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

      const usuarioAlvo = await db('usuarios').where({ id }).where('deleted_at', null).first();
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
        const emaisFormatado = email.toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emaisFormatado)) {
          return res.status(400).json({ error: 'Formato de e-mail inválido.' });
        }
        
        const emailEmUso = await db('usuarios')
          .where({ email: emaisFormatado })
          .whereNot({ id })
          .where('deleted_at', null)
          .first();
        
        if (emailEmUso) {
          return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outro cadastro ativo.' });
        }
        dadosParaAtualizar.email = emaisFormatado;
      }

      if (tipo !== undefined) {
        if (!['usuario', 'bibliotecario'].includes(tipo)) {
          return res.status(400).json({ error: 'Tipo de conta inválido.' });
        }
        dadosParaAtualizar.tipo = tipo;
      }

      if (Object.keys(dadosParaAtualizar).length > 0) {
        await db('usuarios').where({ id }).update(dadosParaAtualizar);
      }

      const usuarioAtualizado = await db('usuarios')
        .where({ id })
        .select('id', 'nome', 'email', 'tipo')
        .first();

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
      
      const usuario = await db('usuarios').where({ id }).where('deleted_at', null).first();
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado ou já desativado.' });
      }

      const [{ totalAtivos }] = await db('alugueis')
        .where({ usuario_id: id, status: 'ativo' })
        .count('id as totalAtivos');
      
      if (Number(totalAtivos) > 0) {
        return res.status(400).json({ 
          error: `❌ Bloqueio de Segurança: O usuário possui ${totalAtivos} livro(s) pendente(s) de devolução.` 
        });
      }

      await db('usuarios').where({ id }).update({ deleted_at: db.fn.now() });
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

      const usuario = await db('usuarios').where({ id }).first();
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      if (usuario.bloqueado) {
        return res.status(400).json({ error: 'Este usuário já se encontra bloqueado.' });
      }

      await db('usuarios').where({ id }).update({
        bloqueado: true,
        motivo_bloqueio: motivo.trim()
      });

      res.json({ message: '✅ Usuário bloqueado com sucesso!' });
    } catch (erro) {
      console.error('Erro ao bloquear usuário:', erro);
      res.status(500).json({ error: 'Erro interno ao processar o bloqueio.' });
    }
  };

  desbloquear = async (req, res) => {
    try {
      const { id } = req.params;

      const usuario = await db('usuarios').where({ id }).first();
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      if (!usuario.bloqueado) {
        return res.status(400).json({ error: 'Este usuário não está bloqueado.' });
      }

      await db('usuarios').where({ id }).update({
        bloqueado: false,
        motivo_bloqueio: null
      });

      res.json({ message: '✅ Usuário desbloqueado. O acesso está liberado novamente.' });
    } catch (erro) {
      console.error('Erro ao desbloquear usuário:', erro);
      res.status(500).json({ error: 'Erro interno ao processar o desbloqueio.' });
    }
  };
}

module.exports = new UsuarioController();
