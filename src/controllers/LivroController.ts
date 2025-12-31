import { Request, Response } from 'express';
import { db } from '../database';

export const LivroController = {
  async listar(req: Request, res: Response) {
    try {
      const { status, busca } = req.query;
      let query = db('livros').select('*');
      if (status) query = query.where({ status });
      if (busca) {
        query = query.where((builder) => {
          builder.where('titulo', 'like', `%${busca}%`)
                 .orWhere('autor', 'like', `%${busca}%`)
                 .orWhere('isbn', 'like', `%${busca}%`);
        });
      }
      const livros = await query.orderBy('created_at', 'desc');
      res.json(livros);
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao listar livros', details: error.message });
    }
  },

  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const livro = await db('livros').where({ id }).first();
      if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });
      res.json(livro);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar livro' });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      const { titulo, autor, ano_lancamento, descricao, isbn } = req.body;
      const [id] = await db('livros').insert({
        titulo, autor, ano_lancamento, status: 'disponivel',
        descricao: descricao || null, isbn: isbn || null
      });
      const livro = await db('livros').where({ id }).first();
      res.status(201).json(livro);
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao criar livro' });
    }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { titulo, autor, ano_lancamento, descricao, isbn } = req.body;
      const result = await db('livros').where({ id }).update({
        titulo, autor, ano_lancamento, descricao, isbn
      });
      if (result === 0) return res.status(404).json({ error: 'Livro não encontrado' });
      res.json({ message: 'Livro atualizado com sucesso' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar livro' });
    }
  },

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await db('livros').where({ id }).delete();
      if (result === 0) return res.status(404).json({ error: 'Livro não encontrado' });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar livro' });
    }
  }
};