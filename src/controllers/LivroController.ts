import { Response } from 'express';
import db from '../database';
import { AuthRequest } from '../middlewares/auth';

export class LivroController {
  private gerarLocalizacao() {
    const corredores = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const prateleiras = ['1', '2', '3', '4', '5'];

    const corredor = corredores[Math.floor(Math.random() * corredores.length)];
    const prateleira = prateleiras[Math.floor(Math.random() * prateleiras.length)];

    return { corredor, prateleira };
  }

  // ✅ Arrow function para preservar contexto
  listar = async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.query;

      let query = db('livros').select('*');

      if (status === 'disponivel') {
        query = query.where({ status: 'disponivel' });
      } else if (status === 'alugado') {
        query = query.where({ status: 'alugado' });
      }

      const livros = await query.orderBy('titulo');
      res.json(livros);
    } catch (error) {
      console.error('Erro ao listar livros:', error);
      res.status(500).json({ error: 'Erro ao listar livros' });
    }
  }

  // ✅ Arrow function + validação de ano melhorada
  cadastrar = async (req: AuthRequest, res: Response) => {
    try {
      const { titulo, autor, ano_lancamento, genero, isbn } = req.body;

      if (!titulo || titulo.trim().length === 0) {
        return res.status(400).json({ error: 'Título é obrigatório' });
      }

      if (!autor || autor.trim().length === 0) {
        return res.status(400).json({ error: 'Autor é obrigatório' });
      }

      const ano = parseInt(ano_lancamento);
      const anoAtual = new Date().getFullYear();

      // ✅ Validação melhorada do ano
      if (isNaN(ano) || ano < 1000 || ano > anoAtual + 1) {
        return res.status(400).json({
          error: `Ano de lançamento inválido. Deve ser entre 1000 e ${anoAtual + 1}`
        });
      }

      const { corredor, prateleira } = this.gerarLocalizacao();

      const [id] = await db('livros').insert({
        titulo: titulo.trim(),
        autor: autor.trim(),
        ano_lancamento: ano,
        genero: genero?.trim() || null,
        isbn: isbn?.trim() || null,
        corredor,
        prateleira,
        status: 'disponivel'
      });

      const livro = await db('livros').where({ id }).first();

      res.status(201).json({
        message: 'Livro cadastrado com sucesso!',
        ...livro
      });
    } catch (error) {
      console.error('Erro ao cadastrar livro:', error);
      res.status(500).json({ error: 'Erro ao cadastrar livro' });
    }
  }
}