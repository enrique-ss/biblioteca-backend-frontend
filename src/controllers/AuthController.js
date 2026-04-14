const supabaseAdmin = require('../database');
const { supabaseAuth } = require('../database');

class AuthController {
  getPermissions(tipo) {
    const ehAdmin = tipo === 'bibliotecario';

    return {
      can_manage: ehAdmin,
      can_edit: ehAdmin,
      can_delete: ehAdmin,
      can_approve: ehAdmin,
      can_view_stats: ehAdmin,
      is_admin: ehAdmin
    };
  }

  registrar = async (req, res) => {
    try {
      const { nome, email, senha } = req.body;

      if (!nome || nome.trim().length < 3) {
        return res.status(400).json({ error: 'O nome deve conter pelo menos 3 caracteres.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de e-mail invalido (exemplo: usuario@dominio.com).' });
      }

      if (!senha || senha.length < 8) {
        return res.status(400).json({ error: 'A senha deve conter no minimo 8 caracteres.' });
      }

      const emailFormatado = email.toLowerCase().trim();
      const tipo = 'usuario';

      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email: emailFormatado,
        password: senha,
        options: {
          data: {
            nome: nome.trim(),
            tipo
          }
        }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabaseAdmin.from('usuarios').insert({
        id: authData.user.id,
        nome: nome.trim(),
        email: emailFormatado,
        tipo,
        multa_pendente: false,
        infantil_xp: 0,
        infantil_level: 1,
        infantil_hearts: 5
      });

      if (dbError) throw dbError;

      res.status(201).json({
        message: 'Conta criada com sucesso! Bem-vindo(a) ao Biblio Verso.',
        token: authData.session?.access_token || null,
        session: authData.session,
        usuario: {
          id: authData.user.id,
          nome: nome.trim(),
          email: emailFormatado,
          tipo,
          permissions: this.getPermissions(tipo)
        }
      });
    } catch (erro) {
      console.error('Erro ao registrar usuario:', erro);
      res.status(500).json({ error: 'Ocorreu um erro interno ao realizar o cadastro.' });
    }
  };

  login = async (req, res) => {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'E-mail e senha sao campos obrigatorios.' });
      }

      const emailFormatado = email.toLowerCase().trim();

      const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
        email: emailFormatado,
        password: senha
      });

      if (authError) {
        return res.status(401).json({ error: 'Credenciais invalidas. Verifique seu e-mail e senha.' });
      }

      const { data: usuarioData } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      const tipo = usuarioData?.tipo || authData.user.user_metadata?.tipo || 'usuario';

      res.json({
        message: 'Login realizado com sucesso!',
        token: authData.session?.access_token || null,
        session: authData.session,
        usuario: {
          id: authData.user.id,
          nome: usuarioData?.nome || authData.user.user_metadata?.nome,
          email: authData.user.email,
          tipo,
          permissions: this.getPermissions(tipo)
        }
      });
    } catch (erro) {
      console.error('Erro ao realizar login:', erro);
      res.status(500).json({ error: 'Ocorreu um erro interno ao tentar autenticar.' });
    }
  };

  editarPerfil = async (req, res) => {
    try {
      const authorization = req.headers.authorization;
      if (!authorization) {
        return res.status(401).json({ error: 'Token nao fornecido.' });
      }

      const token = authorization.replace('Bearer ', '');
      const {
        data: { user },
        error: authError
      } = await supabaseAuth.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token invalido.' });
      }

      const { nome, email, senha } = req.body;
      const mudancas = {};

      if (nome !== undefined) {
        if (nome.trim().length < 3) {
          return res.status(400).json({ error: 'O nome precisa ter ao menos 3 caracteres.' });
        }
        mudancas.nome = nome.trim();
      }

      if (email !== undefined) {
        const emailFormatado = email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailFormatado)) {
          return res.status(400).json({ error: 'O formato do novo e-mail e invalido.' });
        }

        const { error: updateEmailError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          email: emailFormatado
        });

        if (updateEmailError) throw updateEmailError;

        mudancas.email = emailFormatado;
      }

      if (senha !== undefined) {
        if (senha.length < 8) {
          return res.status(400).json({ error: 'A nova senha deve ter no minimo 8 caracteres.' });
        }

        const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: senha
        });

        if (updatePasswordError) throw updatePasswordError;
      }

      if (Object.keys(mudancas).length > 0) {
        const { error } = await supabaseAdmin
          .from('usuarios')
          .update(mudancas)
          .eq('id', user.id);

        if (error) throw error;
      }

      const { data: usuarioAtualizado } = await supabaseAdmin
        .from('usuarios')
        .select('id, nome, email, tipo')
        .eq('id', user.id)
        .single();

      res.json({
        message: 'Perfil atualizado com sucesso!',
        usuario: {
          ...usuarioAtualizado,
          permissions: this.getPermissions(usuarioAtualizado.tipo)
        }
      });
    } catch (erro) {
      console.error('Erro ao atualizar perfil:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar salvar as alteracoes no perfil.' });
    }
  };
}

module.exports = new AuthController();
