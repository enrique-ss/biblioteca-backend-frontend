import { Response } from 'express';
import db from '../database';
import { AuthRequest } from '../middlewares/auth';

export class UsuarioController {
  listar = async (req: AuthRequest, res: Response) => {
    try {
      const usuarios = await db('usuarios')
        .select('id', 'nome', 'email', 'tipo', 'created_at')
        .orderBy('nome');

      res.json(usuarios);
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  atualizar = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { nome, email, tipo } = req.body;

      const usuario = await db('usuarios').where({ id }).first();
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const dadosAtualizacao: any = {};

      if (nome !== undefined) {
        if (nome.trim().length < 3) {
          return res.status(400).json({ error: 'Nome deve ter pelo menos 3 caracteres' });
        }
        dadosAtualizacao.nome = nome.trim();
      }

      if (email !== undefined) {
        if (!email.includes('@')) {
          return res.status(400).json({ error: 'Email inválido' });
        }

        const emailExistente = await db('usuarios')
          .where({ email: email.toLowerCase().trim() })
          .whereNot({ id })
          .first();

        if (emailExistente) {
          return res.status(400).json({ error: 'Email já está em uso' });
        }

        dadosAtualizacao.email = email.toLowerCase().trim();
      }

      if (tipo !== undefined) {
        if (!['usuario', 'bibliotecario'].includes(tipo)) {
          return res.status(400).json({ error: 'Tipo deve ser "usuario" ou "bibliotecario"' });
        }
        dadosAtualizacao.tipo = tipo;
      }

      if (Object.keys(dadosAtualizacao).length > 0) {
        await db('usuarios').where({ id }).update(dadosAtualizacao);
      }

      const usuarioAtualizado = await db('usuarios')
        .where({ id })
        .select('id', 'nome', 'email', 'tipo')
        .first();

      res.json({
        message: 'Usuário atualizado com sucesso!',
        usuario: usuarioAtualizado
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  excluir = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const usuario = await db('usuarios').where({ id }).first();
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // ✅ Correção: count retorna string no MySQL
      const result = await db('alugueis')
        .where({ usuario_id: id, status: 'ativo' })
        .count('id as total')
        .first();

      const total = result ? Number(result.total) : 0;

      if (total > 0) {
        return res.status(400).json({
          error: 'Não é possível excluir usuário com empréstimos ativos'
        });
      }

      await db('usuarios').where({ id }).del();

      res.json({ message: 'Usuário excluído com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
  }
}