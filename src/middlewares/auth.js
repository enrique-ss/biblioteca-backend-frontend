const jwt = require('jsonwebtoken');

// Carrega a chave secreta das variáveis de ambiente
const SEGREDO_JWT = process.env.JWT_SECRET || 'biblioverso-chave-secreta-2024';

/**
 * Gera um novo Token JWT (JSON Web Token) com validade de 7 dias.
 */
function gerarToken(dados) {
  return jwt.sign(dados, SEGREDO_JWT, { expiresIn: '7d' });
}

/**
 * Middleware para verificar se o usuário está autenticado via cabeçalho Authorization.
 */
function verificarToken(req, res, next) {
  // O token geralmente vem no formato "Bearer [token]"
  const tokenHeader = req.headers.authorization?.replace('Bearer ', '');

  if (!tokenHeader) {
    return res.status(401).json({ error: 'Acesso negado. Nenhum token de autenticação foi fornecido.' });
  }

  try {
    const dadosDecodificados = jwt.verify(tokenHeader, SEGREDO_JWT);
    
    // Anexa os dados do usuário à requisição para acesso nos controladores
    req.usuario = dadosDecodificados; 
    
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
  gerarToken,
  verificarToken,
  verificarBibliotecario
};
