const { supabaseAuth } = require('../database');

/**
 * verificarToken: O porteiro da nossa API.
 * Ele verifica se quem está tentando acessar a rota possui um "crachá" (Token JWT) válido.
 * Sem um token válido, o usuário é barrado logo na entrada.
 */
async function verificarToken(req, res, next) {
  // O token geralmente vem no "cabeçalho" (header) da requisição com o nome 'Authorization'
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({ error: 'Acesso negado. Você precisa estar logado para acessar este recurso.' });
  }

  // O padrão do token é "Bearer <codigo_do_token>". Aqui, removemos a palavra 'Bearer' para pegar só o código.
  const token = authorization.replace('Bearer ', '');

  try {
    // Pedimos ao Supabase para validar se esse código de token ainda é oficial e está no prazo
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    // Se o Supabase disser que o token é falso ou expirou, negamos o acesso
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Sua sessão expirou ou o acesso é inválido. Por favor, saia e entre novamente no sistema.' 
      });
    }

    /**
     * Sucesso! Se chegamos aqui, o usuário é real.
     * Guardamos os dados dele (ID, Email, Nome e Cargo) dentro do objeto 'req.usuario'.
     * Assim, qualquer função que venha depois saberá exatamente QUEM está fazendo a ação.
     */
    req.usuario = {
      id: user.id,
      email: user.email,
      nome: user.user_metadata?.nome,
      tipo: user.user_metadata?.tipo || 'usuario'
    };

    // 'next()' diz ao Express: "Tudo certo! Pode passar para a próxima função."
    next();
  } catch (erro) {
    return res.status(401).json({ 
      error: 'Ocorreu uma falha na validação do seu acesso. Tente fazer login novamente.' 
    });
  }
}

/**
 * verificarBibliotecario: O segurança da área restrita.
 * Ele garante que apenas pessoas com o cargo de 'bibliotecario' possam realizar certas ações sensíveis,
 * como apagar livros, cadastrar novos usuários ou gerenciar multas.
 * 
 * ATENÇÃO: Esta função só funciona se for colocada DEPOIS da 'verificarToken'.
 */
function verificarBibliotecario(req, res, next) {
  // Se o porteiro (verificarToken) não tiver preenchido os dados do usuário, paramos por aqui
  if (!req.usuario) {
    return res.status(401).json({ error: 'Não foi possível identificar o seu perfil de acesso.' });
  }

  // Verificamos se o cargo (tipo) do usuário é 'bibliotecario'
  if (req.usuario.tipo !== 'bibliotecario') {
    return res.status(403).json({
      error: '❌ Acesso Negado: Apenas bibliotecários autorizados podem realizar esta operação.'
    });
  }

  // Se for bibliotecário, liberamos a passagem
  next();
}

module.exports = {
  verificarToken,
  verificarBibliotecario
};

