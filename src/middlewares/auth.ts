import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Carrega a chave secreta das variáveis de ambiente
const SEGREDO_JWT = process.env.JWT_SECRET || 'cristalario-chave-secreta-2024';

/**
 * Estrutura de dados contida dentro do Token de Autenticação.
 */
export interface PayloadToken {
  id: number;
  email: string;
  tipo: 'usuario' | 'bibliotecario';
}

/**
 * Interface estendida da requisição Express para incluir os dados do usuário logado.
 */
export interface RequisicaoAutenticada extends Request {
  usuario?: PayloadToken;
}

/**
 * Gera um novo Token JWT (JSON Web Token) com validade de 7 dias.
 */
export function gerarToken(dados: PayloadToken): string {
  return jwt.sign(dados, SEGREDO_JWT, { expiresIn: '7d' });
}

/**
 * Middleware para verificar se o usuário está autenticado via cabeçalho Authorization.
 */
export function verificarToken(req: RequisicaoAutenticada, res: Response, next: NextFunction) {
  // O token geralmente vem no formato "Bearer [token]"
  const tokenHeader = req.headers.authorization?.replace('Bearer ', '');

  if (!tokenHeader) {
    return res.status(401).json({ error: 'Acesso negado. Nenhum token de autenticação foi fornecido.' });
  }

  try {
    const dadosDecodificados = jwt.verify(tokenHeader, SEGREDO_JWT) as PayloadToken;
    
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
export function verificarBibliotecario(req: RequisicaoAutenticada, res: Response, next: NextFunction) {
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