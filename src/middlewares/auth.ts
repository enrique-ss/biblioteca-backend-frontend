import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura';

export interface AuthRequest extends Request {
  usuario?: any;
}

export function gerarToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verificarToken(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function verificarBibliotecario(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.usuario?.tipo !== 'bibliotecario') {
    return res.status(403).json({ error: 'Acesso negado. Apenas bibliotecários podem realizar esta ação.' });
  }
  next();
}