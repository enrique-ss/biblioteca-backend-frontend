import { Request, Response } from 'express';
import { db } from '../database';

// Definindo interface para estender o Request com o userId do middleware
export interface AuthRequest extends Request {
  userId?: number;
  userTipo?: string;
}

export const UsuarioController = {
  // GET: /api/usuarios (Apenas Bibliotecário)
  async listar(req: Request, res: Response) {
    try {
      const usuarios = await db('usuarios').select('id', 'nome', 'email', 'tipo');
      res.json(usuarios);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar usuários.' });
    }
  },

  // PUT: /api/usuarios/:id (Apenas Bibliotecário)
  async editar(req: Request, res: Response) {
    const { id } = req.params;
    const { nome, email, tipo } = req.body;
    try {
      const existe = await db('usuarios').where({ id }).first();
      if (!existe) return res.status(404).json({ error: 'Usuário não encontrado.' });

      await db('usuarios').where({ id }).update({
        nome: nome || existe.nome,
        email: email || existe.email,
        tipo: tipo || existe.tipo
      });

      res.json({ message: 'Usuário atualizado com sucesso!' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao editar usuário.' });
    }
  },

  // DELETE: /api/usuarios/:id (Apenas Bibliotecário)
  async excluir(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await db('usuarios').where({ id }).del();
      res.json({ message: 'Usuário excluído com sucesso.' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir usuário.' });
    }
  },

  // GET: /api/usuarios/perfil (Qualquer usuário logado)
  async perfil(req: AuthRequest, res: Response) {
    try {
      const usuario = await db('usuarios')
        .where({ id: req.userId })
        .select('id', 'nome', 'email', 'tipo')
        .first();

      if (!usuario) return res.status(404).json({ error: 'Perfil não encontrado.' });
      res.json(usuario);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar perfil.' });
    }
  }
};