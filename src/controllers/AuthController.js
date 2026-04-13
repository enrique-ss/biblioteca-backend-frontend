const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

// Supabase Admin client para bypass de RLS (igual ao RPG)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://wnsjluwxqkgjttpsrrtp.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Induc2psdXd4cWtnanR0cHNycnRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0NDI1NCwiZXhwIjoyMDkxMzIwMjU0fQ.Qlmhp4kG3y0_X6d2O7aetFj8eYLLfLhobotP-Kk8bCI'
);

// Supabase Client para auth
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://wnsjluwxqkgjttpsrrtp.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Induc2psdXd4cWtnanR0cHNycnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDQyNTQsImV4cCI6MjA5MTMyMDI1NH0.1KGGvHBDA0wmNQXXvhywdJYyoXeRXrzylBTD8tsbHAI'
);

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
        return res.status(400).json({ error: 'Formato de e-mail inválido (exemplo: usuario@dominio.com).' });
      }

      if (!senha || senha.length < 8) {
        return res.status(400).json({ error: 'A senha deve conter no mínimo 8 caracteres.' });
      }

      const emailFormatado = email.toLowerCase().trim();
      const tipo = 'usuario'; // Sempre usuário por padrão
      
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailFormatado,
        password: senha,
        options: {
          data: {
            nome: nome.trim(),
            tipo: tipo
          }
        }
      });

      if (authError) throw authError;

      // Criar registro na tabela usuarios com metadados adicionais
      const { error: dbError } = await supabaseAdmin.from('usuarios').insert({
        id: authData.user.id,
        nome: nome.trim(),
        email: emailFormatado,
        tipo: tipo,
        multa_pendente: false,
        infantil_xp: 0,
        infantil_level: 1,
        infantil_hearts: 5
      });

      if (dbError) throw dbError;

      res.status(201).json({
        message: '✅ Conta criada com sucesso! Bem-vindo(a) ao Biblio Verso.',
        session: authData.session,
        usuario: { 
          id: authData.user.id, 
          nome: nome.trim(), 
          email: emailFormatado, 
          tipo: tipo,
          permissions: this.getPermissions(tipo)
        }
      });
    } catch (erro) {
      console.error('Erro ao registrar usuário:', erro);
      res.status(500).json({ error: 'Ocorreu um erro interno ao realizar o cadastro.' });
    }
  }

  login = async (req, res) => {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'E-mail e senha são campos obrigatórios.' });
      }

      const emailFormatado = email.toLowerCase().trim();
      
      // Login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailFormatado,
        password: senha
      });

      if (authError) {
        return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
      }

      // Buscar dados adicionais do usuário
      const { data: usuarioData } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      const tipo = usuarioData?.tipo || authData.user.user_metadata?.tipo || 'usuario';

      res.json({
        message: '✅ Login realizado com sucesso!',
        session: authData.session,
        usuario: { 
          id: authData.user.id, 
          nome: usuarioData?.nome || authData.user.user_metadata?.nome, 
          email: authData.user.email, 
          tipo: tipo,
          permissions: this.getPermissions(tipo)
        }
      });
    } catch (erro) {
      console.error('Erro ao realizar login:', erro);
      res.status(500).json({ error: 'Ocorreu um erro interno ao tentar autenticar.' });
    }
  }

  editarPerfil = async (req, res) => {
    try {
      const authorization = req.headers.authorization;
      if (!authorization) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const token = authorization.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
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
          return res.status(400).json({ error: 'O formato do novo e-mail é inválido.' });
        }
        
        // Atualizar email no Supabase Auth
        const { error: updateEmailError } = await supabase.auth.updateUser({
          email: emailFormatado
        });
        
        if (updateEmailError) throw updateEmailError;
        
        mudancas.email = emailFormatado;
      }

      if (senha !== undefined) {
        if (senha.length < 8) {
          return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres.' });
        }
        
        // Atualizar senha no Supabase Auth
        const { error: updatePasswordError } = await supabase.auth.updateUser({
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
        .select('id', 'nome', 'email', 'tipo')
        .eq('id', user.id)
        .single();

      res.json({
        message: '✅ Perfil atualizado com sucesso!',
        usuario: {
          ...usuarioAtualizado,
          permissions: this.getPermissions(usuarioAtualizado.tipo)
        }
      });
    } catch (erro) {
      console.error('Erro ao atualizar perfil:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar salvar as alterações no perfil.' });
    }
  }
}

module.exports = new AuthController();
