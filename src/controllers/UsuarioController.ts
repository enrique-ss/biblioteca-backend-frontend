import { Response } from 'express';
import db from '../database';
import { AuthRequest } from '../middlewares/auth';

export class UsuarioController {

  // Listar com busca e paginação
  listar = async (req: AuthRequest, res: Response) => {
    try {
      const { busca, page: p, limit: l } = req.query;
      const page = Math.max(1, parseInt(String(p || 1)));
      const limit = Math.min(100, parseInt(String(l || 20)));
      const offset = (page - 1) * limit;

      let query = db('usuarios').select('id', 'nome', 'email', 'tipo', 'created_at');

      if (busca && String(busca).trim()) {
        const termo = `%${String(busca).trim()}%`;
        query = query.where(b => b.whereILike('nome', termo).orWhereILike('email', termo));
      }

      const [rows, [{ total }]] = await Promise.all([
        query.clone().orderBy('nome').limit(limit).offset(offset),
        db('usuarios').modify(q => {
          if (busca && String(busca).trim()) {
            const termo = `%${String(busca).trim()}%`;
            q.where(b => b.whereILike('nome', termo).orWhereILike('email', termo));
          }
        }).count('id as total')
      ]);

      res.json({ data: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  };

  // Atualizar
  atualizar = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { nome, email, tipo } = req.body;

      const usuario = await db('usuarios').where({ id }).first();
      if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

      const dados: any = {};

      if (nome !== undefined) {
        if (nome.trim().length < 3) return res.status(400).json({ error: 'O nome deve ter pelo menos 3 caracteres' });
        dados.nome = nome.trim();
      }

      if (email !== undefined) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return res.status(400).json({ error: 'Formato de email inválido' });
        const existe = await db('usuarios').where({ email: email.toLowerCase().trim() }).whereNot({ id }).first();
        if (existe) return res.status(400).json({ error: 'Este email já está sendo utilizado' });
        dados.email = email.toLowerCase().trim();
      }

      if (tipo !== undefined) {
        if (!['usuario', 'bibliotecario'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
        dados.tipo = tipo;
      }

      if (Object.keys(dados).length > 0) await db('usuarios').where({ id }).update(dados);

      const atualizado = await db('usuarios').where({ id }).select('id', 'nome', 'email', 'tipo').first();
      res.json({ message: '✅ Usuário atualizado com sucesso!', usuario: atualizado });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  };

  // Excluir
  excluir = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const usuario = await db('usuarios').where({ id }).first();
      if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

      const [{ total }] = await db('alugueis').where({ usuario_id: id, status: 'ativo' }).count('id as total');
      if (Number(total) > 0) return res.status(400).json({ error: `❌ Não é possível excluir: ${total} livro(s) pendente(s) de devolução.` });

      await db('usuarios').where({ id }).del();
      res.json({ message: '✅ Usuário removido permanentemente do sistema.' });
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
  };
}