import { Response } from 'express';
import db from '../database';
import { AuthRequest } from '../middlewares/auth';

export class LivroController {

  private gerarLocalizacao() {
    const corredores = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const prateleiras = ['1', '2', '3', '4', '5'];
    return {
      corredor: corredores[Math.floor(Math.random() * corredores.length)],
      prateleira: prateleiras[Math.floor(Math.random() * prateleiras.length)]
    };
  }

  // Listar com busca, filtro, paginação e ordenação
  listar = async (req: AuthRequest, res: Response) => {
    try {
      const { status, busca, page: p, limit: l, sort = 'titulo', order = 'asc' } = req.query;
      const page = Math.max(1, parseInt(String(p || 1)));
      const limit = Math.min(100, parseInt(String(l || 20)));
      const offset = (page - 1) * limit;

      const allowed = ['titulo', 'autor', 'genero', 'ano_lancamento', 'status', 'created_at'];
      const col = allowed.includes(String(sort)) ? String(sort) : 'titulo';
      const dir = order === 'desc' ? 'desc' : 'asc';

      let query = db('livros');

      if (status === 'disponivel') query = query.where('exemplares_disponiveis', '>', 0);
      else if (status === 'alugado') query = query.where({ status: 'alugado' });

      if (busca && String(busca).trim()) {
        const termo = `%${String(busca).trim()}%`;
        query = query.where(b => b.whereILike('titulo', termo).orWhereILike('autor', termo).orWhereILike('genero', termo));
      }

      const [rows, [{ total }]] = await Promise.all([
        query.clone().select('*').orderBy(col, dir).limit(limit).offset(offset),
        query.clone().count('id as total')
      ]);

      res.json({ data: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
    } catch (error) {
      console.error('Erro ao listar livros:', error);
      res.status(500).json({ error: 'Erro ao listar livros' });
    }
  };

  // Cadastrar
  cadastrar = async (req: AuthRequest, res: Response) => {
    try {
      const { titulo, autor, ano_lancamento, genero, isbn, exemplares } = req.body;

      if (!titulo?.trim()) return res.status(400).json({ error: 'O título do livro é obrigatório' });
      if (!autor?.trim()) return res.status(400).json({ error: 'O nome do autor é obrigatório' });

      const ano = parseInt(ano_lancamento);
      const anoAtual = new Date().getFullYear();
      if (isNaN(ano) || ano < 500 || ano > anoAtual + 1)
        return res.status(400).json({ error: `Ano inválido. Deve ser entre 500 e ${anoAtual + 1}` });

      const qtd = Math.min(999, Math.max(1, parseInt(exemplares) || 1));
      const { corredor, prateleira } = this.gerarLocalizacao();

      const [id] = await db('livros').insert({
        titulo: titulo.trim(), autor: autor.trim(), ano_lancamento: ano,
        genero: genero?.trim() || 'Não Informado', isbn: isbn?.trim() || null,
        corredor, prateleira, exemplares: qtd, exemplares_disponiveis: qtd, status: 'disponivel'
      });

      const livro = await db('livros').where({ id }).first();
      res.status(201).json({ message: '✅ Livro cadastrado com sucesso!', info: `📍 Corredor ${corredor} - Prateleira ${prateleira} | ${qtd} exemplar(es)`, livro });
    } catch (error) {
      console.error('Erro ao cadastrar livro:', error);
      res.status(500).json({ error: 'Erro ao cadastrar livro' });
    }
  };
}