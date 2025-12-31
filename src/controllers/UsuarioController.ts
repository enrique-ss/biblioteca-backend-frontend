import { Response } from 'express';
import { db } from '../database';
import { AuthRequest } from '../middlewares/auth';

export const UsuarioController = {
  async perfil(req: AuthRequest, res: Response) {
    const usuario = await db('usuarios').where({ id: req.userId }).first();
    const { senha: _, ...dados } = usuario;
    res.json(dados);
  },

  async listar(req: AuthRequest, res: Response) {
    const usuarios = await db('usuarios').select('id', 'nome', 'email', 'tipo', 'created_at');
    res.json(usuarios);
  }
};