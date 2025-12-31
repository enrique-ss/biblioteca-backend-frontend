import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui';

export interface AuthRequest extends Request {
  userId?: number;
  userTipo?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; tipo: string };
    req.userId = decoded.id;
    req.userTipo = decoded.tipo;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

export const bibliotecarioMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userTipo !== 'bibliotecario') {
    return res.status(403).json({ error: 'Acesso negado. Apenas bibliotecários.' });
  }
  next();
};