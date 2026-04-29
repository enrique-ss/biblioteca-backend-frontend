const supabaseAdmin = require('../database');
const { supabaseAuth } = require('../database');
const { isOfflineMode } = require('../database');

/**
 * AuthController: Gerencia a segurança e acesso ao sistema.
 * Responsável por criar contas, validar logins e gerenciar dados sensíveis de perfil.
 */
class AuthController {
  
  /**
   * Define o que cada usuário pode fazer no sistema.
   * Centraliza as regras de negócio sobre permissões para facilitar mudanças futuras.
   */
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

  /**
   * Cria um novo usuário no sistema.
   * Realiza validações de segurança (tamanho da senha, formato de email)
   * e salva os dados tanto no módulo de autenticação quanto na tabela de usuários.
   */
  registrar = async (req, res) => {
    try {
      const { nome, email, senha } = req.body;

      // O nome precisa ser identificável
      if (!nome || nome.trim().length < 3) {
        return res.status(400).json({ error: 'O nome deve conter pelo menos 3 caracteres.' });
      }

      // Validação de formato de e-mail para evitar erros de envio
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de e-mail invalido (exemplo: usuario@dominio.com).' });
      }

      // Senhas curtas são fáceis de descobrir; exigimos ao menos 8 caracteres
      if (!senha || senha.length < 8) {
        return res.status(400).json({ error: 'A senha deve conter no minimo 8 caracteres.' });
      }

      const emailFormatado = email.toLowerCase().trim();
      const tipo = 'usuario';

      /**
       * O Supabase gerencia a parte "invisível" do usuário (login/senha).
       * Passamos o nome e o tipo como metadados para o token de acesso.
       */
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

      /**
       * Além do login, salvamos o usuário na nossa tabela principal
       * para gerenciar multas, XP infantil e histórico de livros.
       */
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

      // Avisa o sistema (via Socket) que um novo usuário apareceu, atualizando listas em tempo real
      req.app.get('io').emit('refreshData', 'usuarios');

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

  /**
   * Valida as credenciais do usuário e libera o acesso.
   * Retorna os dados do usuário e um "token" (chave) para as próximas requisições.
   */
  login = async (req, res) => {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'E-mail e senha sao campos obrigatorios.' });
      }

      const emailFormatado = email.toLowerCase().trim();

      // O Supabase verifica se a senha bate com o e-mail cadastrado
      const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
        email: emailFormatado,
        password: senha
      });

      if (authError) {
        return res.status(401).json({ error: 'Credenciais invalidas. Verifique seu e-mail e senha.' });
      }

      // Busca dados extras (como se o usuário é bibliotecário ou leitor)
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
          ...usuarioData,
          permissions: this.getPermissions(tipo)
        }
      });
    } catch (erro) {
      console.error('Erro ao realizar login:', erro);
      res.status(500).json({ error: 'Ocorreu um erro interno ao tentar autenticar.' });
    }
  };

  /**
   * Coleta o histórico completo de ações do usuário (empréstimos, quizzes, uploads)
   * para montar o feed de atividades do perfil.
   */
  getAtividades = async (req, res) => {
    try {
      const usuarioId = req.usuario.id;
      const atividades = [];

      const formatarNomeLeicao = (id) => {
        const parts = id.split('_');
        if (parts.length < 2) return id;
        const ageMap = { 'inf': 'Infantil', 'juv': 'Infanto-Juvenil', 'pre': 'Pré-Adolescente' };
        const catCode = parts[1].replace(/[0-9]/g, '');
        const num = parts[1].replace(/[^0-9]/g, '');
        const catMap = { 'c': 'Contos', 'p': 'Poesia', 'cl': 'Clássicos', 'e': 'Escritoras' };
        const age = ageMap[parts[0]] || parts[0];
        const cat = catMap[catCode] || catCode;
        return `${age} • ${cat} • Lição ${num}`;
      };

      // 1. Empréstimos (Físicos) - Sem limite
      try {
        const { data: alugueis } = await supabaseAdmin
          .from('alugueis')
          .select('*, livros(titulo)')
          .eq('usuario_id', usuarioId)
          .order('data_aluguel', { ascending: false });

        (alugueis || []).forEach(a => {
          atividades.push({
            id: `aluguel_${a.id}`,
            tipo: 'emprestimo',
            data: a.data_aluguel || a.created_at,
            texto: `Alugou o livro <strong>${a.livros?.titulo || 'Desconhecido'}</strong>`,
            icone: '📚'
          });
          if (a.data_devolucao) {
            atividades.push({
              id: `devolucao_${a.id}`,
              tipo: 'devolucao',
              data: a.data_devolucao,
              texto: `Devolveu o livro <strong>${a.livros?.titulo || 'Desconhecido'}</strong>`,
              icone: '↩️'
            });
          }
        });
      } catch (err) { console.error('Erro alugueis feed:', err); }

      // 2. Conquistas no Quiz Literário
      try {
        const { data: leicoes } = await supabaseAdmin
          .from('usuarios_leicoes_infantis')
          .select('*')
          .eq('usuario_id', usuarioId);

        (leicoes || []).forEach(l => {
          atividades.push({
            id: `leicao_${l.id}`,
            tipo: 'quiz',
            data: l.created_at || new Date().toISOString(),
            texto: `Completou a lição <strong>${formatarNomeLeicao(l.leicao_id)}</strong> no Espaço Literário`,
            icone: '🏆'
          });
        });
      } catch (err) { console.error('Erro quizzes feed:', err); }

      // 3. Contribuições Digitais
      try {
        const { data: digitais } = await supabaseAdmin
          .from('acervo_digital')
          .select('*')
          .eq('usuario_id', usuarioId);

        (digitais || []).forEach(d => {
          atividades.push({
            id: `digital_${d.id}`,
            tipo: 'digital',
            data: d.created_at,
            texto: `Enviou o documento <strong>${d.titulo}</strong> para o acervo digital`,
            icone: '📤'
          });
        });
      } catch (err) { console.error('Erro digitais feed:', err); }

      // Ordena por data (mais recente primeiro)
      atividades.sort((a, b) => new Date(b.data) - new Date(a.data));
      
      res.json(atividades);
    } catch (erro) {
      console.error('Erro fatal ao buscar atividades:', erro);
      res.status(500).json({ error: 'Falha ao carregar feed de atividades.' });
    }
  };

  /**
   * Permite que o próprio usuário atualize seus dados de cadastro.
   * Se trocar o e-mail ou senha, o sistema de autenticação é avisado.
   */
  editarPerfil = async (req, res) => {
    try {
      // Verifica se quem está tentando editar é realmente o dono da conta
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

      // Atualiza o nome se enviado e válido
      if (nome !== undefined) {
        if (nome.trim().length < 3) {
          return res.status(400).json({ error: 'O nome precisa ter ao menos 3 caracteres.' });
        }
        mudancas.nome = nome.trim();
      }

      // Processo de troca de e-mail requer atualização no módulo administrativo do Supabase
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

      // Troca de senha: exige segurança mínima e avisa o servidor de Auth
      if (senha !== undefined) {
        if (senha.length < 8) {
          return res.status(400).json({ error: 'A nova senha deve ter no minimo 8 caracteres.' });
        }

        const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: senha
        });

        if (updatePasswordError) throw updatePasswordError;
      }

      // Novos campos sociais
      const { bio, generos_favoritos, avatar_url, banner_url } = req.body;
      if (bio !== undefined) mudancas.bio = bio;
      if (generos_favoritos !== undefined) mudancas.generos_favoritos = generos_favoritos;
      if (avatar_url !== undefined) mudancas.avatar_url = avatar_url;
      if (banner_url !== undefined) mudancas.banner_url = banner_url;

      // Salva todas as alterações de nome/email na nossa tabela de usuários
      if (Object.keys(mudancas).length > 0) {
        const { error } = await supabaseAdmin
          .from('usuarios')
          .update(mudancas)
          .eq('id', user.id);

        if (error) throw error;
      }

      // Retorna o perfil atualizado para o frontend atualizar a interface
      const { data: usuarioAtualizado } = await supabaseAdmin
        .from('usuarios')
        .select('*')
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

