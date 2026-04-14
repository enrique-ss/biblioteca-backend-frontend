const { supabaseAuth } = require('../database');

/**
 * Middleware para verificar se o usuário está autenticado via Supabase Auth.
 */
async function verificarToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({ error: 'Acesso negado. Nenhum token de autenticação foi fornecido.' });
  }

  const token = authorization.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Sua sessão expirou ou o acesso é inválido. Por favor, realize o login novamente.' 
      });
    }

    // Anexa os dados do usuário à requisição para acesso nos controladores
    req.usuario = {
      id: user.id,
      email: user.email,
      nome: user.user_metadata?.nome,
      tipo: user.user_metadata?.tipo || 'usuario'
    };

    next();
  } catch (erro) {
    return res.status(401).json({ 
      error: 'Sua sessão expirou ou o acesso é inválido. Por favor, realize o login novamente.' 
    });
  }
}

/**
 * Middleware de restrição por cargo: Garante que apenas Bibliotecários acessem certas rotas.
 * IMPORTANTE: Deve ser usado sempre APÓS o middleware 'verificarToken'.
 */
function verificarBibliotecario(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Autenticação necessária para esta ação.' });
  }

  if (req.usuario.tipo !== 'bibliotecario') {
    return res.status(403).json({
      error: '❌ Acesso Negado: Esta funcionalidade é exclusiva para Administradores (Bibliotecários).'
    });
  }

  next();
}

module.exports = {
  verificarToken,
  verificarBibliotecario
};
