import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura';

// Definindo a estrutura do que vai dentro do Token conforme Passo 2
export interface TokenPayload {
  id: number;
  email: string;
  tipo: 'usuario' | 'bibliotecario'; // Regra: Só pode ser um desses dois
}

export interface AuthRequest extends Request {
  usuario?: TokenPayload;
}

// ✅ PASSO 2: Gera a "chave de acesso" (Token)
export function gerarToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// ✅ PROTEÇÃO GERAL: Verifica se a pessoa está logada
export function verificarToken(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.usuario = decoded; // Salva os dados do usuário na requisição
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Sua sessão expirou ou o token é inválido. Faça login novamente.' });
  }
}

// ✅ DIFERENÇA DE PODERES: Regra para funções exclusivas de Bibliotecário
export function verificarBibliotecario(req: AuthRequest, res: Response, next: NextFunction) {
  // O middleware verificarToken deve ser chamado ANTES deste nas rotas
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }

  if (req.usuario.tipo !== 'bibliotecario') {
    return res.status(403).json({
      error: '❌ Acesso Negado: Esta função é exclusiva para Bibliotecários.'
    });
  }

  next();
}