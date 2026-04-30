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
      tipo: user.user_metadata?.tipo || 'usuario',
      bloqueios: user.user_metadata?.bloqueios || {},
      bloqueado: !!user.user_metadata?.bloqueado
    };

    // Bloqueio total (Banimento)
    if (req.usuario.bloqueado && req.usuario.tipo !== 'bibliotecario') {
      return res.status(403).json({ 
        error: 'Sua conta foi suspensa permanentemente e seu acesso ao sistema foi revogado.' 
      });
    }

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
 * Ele garante que apenas pessoas com o cargo de 'bibliotecario' possam realizar certas ações sensíveis.
 */
function verificarBibliotecario(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Não foi possível identificar o seu perfil de acesso.' });
  }

  if (req.usuario.tipo !== 'bibliotecario') {
    return res.status(403).json({
      error: '❌ Acesso Negado: Apenas bibliotecários autorizados podem realizar esta operação.'
    });
  }

  next();
}

/**
 * verificarRestricao: Verifica se o usuário tem uma restrição específica ativa.
 * @param {string} area - 'fisico', 'digital', 'social' ou 'infantil'
 */
const verificarRestricao = (area) => (req, res, next) => {
  if (req.usuario?.tipo === 'bibliotecario') return next(); // Bibliotecários não têm restrições

  const bloqueios = req.usuario?.bloqueios || {};
  if (bloqueios[area]) {
    const nomesAreas = {
      fisico: 'o aluguel de livros físicos',
      digital: 'o envio de arquivos digitais (PDFs)',
      social: 'a interação com outros usuários',
      infantil: 'o acesso ao Espaço Infantil'
    };
    return res.status(403).json({
      error: `❌ Acesso Negado: Seu acesso para ${nomesAreas[area] || area} foi suspenso por um administrador.`
    });
  }
  next();
};

module.exports = {
  verificarToken,
  verificarBibliotecario,
  verificarRestricao
};

