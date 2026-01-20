import { Response } from 'express';
import db from '../database';
import { AuthRequest } from '../middlewares/auth';

export class UsuarioController {

  // ✅ PASSO 10.1: Ver todos os usuários (Só Bibliotecário)
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

  // ✅ PASSO 10.2: Editar usuário / Promover
  atualizar = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { nome, email, tipo } = req.body;

      const usuario = await db('usuarios').where({ id }).first();
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const dadosAtualizacao: any = {};

      // Regra Passo 1: Nome pelo menos 3 letras
      if (nome !== undefined) {
        if (nome.trim().length < 3) {
          return res.status(400).json({ error: 'O nome deve ter pelo menos 3 caracteres' });
        }
        dadosAtualizacao.nome = nome.trim();
      }

      // Regra Passo 1 e 4: Email válido e único
      if (email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Formato de email inválido' });
        }

        const emailExistente = await db('usuarios')
          .where({ email: email.toLowerCase().trim() })
          .whereNot({ id })
          .first();

        if (emailExistente) {
          return res.status(400).json({ error: 'Este email já está sendo utilizado por outro usuário' });
        }

        dadosAtualizacao.email = email.toLowerCase().trim();
      }

      // Regra Passo 10: Promover ou Alterar Tipo
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
        message: '✅ Usuário atualizado com sucesso!',
        usuario: usuarioAtualizado
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  // ✅ PASSO 10.3: Excluir usuário (Hard Delete)
  excluir = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const usuario = await db('usuarios').where({ id }).first();
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // ⚠️ Regra de Segurança: Não excluir se tiver livro em posse
      const result = await db('alugueis')
        .where({ usuario_id: id, status: 'ativo' })
        .count('id as total')
        .first();

      const totalAtivos = result ? Number(result.total) : 0;

      if (totalAtivos > 0) {
        return res.status(400).json({
          error: `❌ Não é possível excluir: este usuário possui ${totalAtivos} livro(s) pendente(s) de devolução.`
        });
      }

      // Deleta permanentemente conforme a regra do Passo 10
      await db('usuarios').where({ id }).del();

      res.json({ message: '✅ Usuário removido permanentemente do sistema.' });
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
  }
}