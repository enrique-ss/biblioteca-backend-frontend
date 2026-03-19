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

  // ✅ Consultar acervo com busca por título/autor/gênero e filtro de status
  listar = async (req: AuthRequest, res: Response) => {
    try {
      const { status, busca } = req.query;

      let query = db('livros').select('*');

      if (status === 'disponivel') {
        query = query.where('exemplares_disponiveis', '>', 0);
      } else if (status === 'alugado') {
        query = query.where({ status: 'alugado' });
      }

      if (busca && String(busca).trim().length > 0) {
        const termo = `%${String(busca).trim()}%`;
        query = query.where((builder) => {
          builder
            .whereILike('titulo', termo)
            .orWhereILike('autor', termo)
            .orWhereILike('genero', termo);
        });
      }

      const livros = await query.orderBy('titulo', 'asc');
      res.json(livros);
    } catch (error) {
      console.error('Erro ao listar livros:', error);
      res.status(500).json({ error: 'Erro ao listar livros' });
    }
  }

  // ✅ Cadastrar livro com quantidade de exemplares
  cadastrar = async (req: AuthRequest, res: Response) => {
    try {
      const { titulo, autor, ano_lancamento, genero, isbn, exemplares } = req.body;

      if (!titulo || titulo.trim().length === 0)
        return res.status(400).json({ error: 'O título do livro é obrigatório' });

      if (!autor || autor.trim().length === 0)
        return res.status(400).json({ error: 'O nome do autor é obrigatório' });

      const ano = parseInt(ano_lancamento);
      const anoAtual = new Date().getFullYear();
      if (isNaN(ano) || ano < 500 || ano > anoAtual + 1)
        return res.status(400).json({ error: `Ano inválido. Deve ser entre 500 e ${anoAtual + 1}` });

      const qtd = parseInt(exemplares) || 1;
      if (qtd < 1 || qtd > 999)
        return res.status(400).json({ error: 'Quantidade de exemplares deve ser entre 1 e 999' });

      const { corredor, prateleira } = this.gerarLocalizacao();

      const [id] = await db('livros').insert({
        titulo: titulo.trim(),
        autor: autor.trim(),
        ano_lancamento: ano,
        genero: genero?.trim() || 'Não Informado',
        isbn: isbn?.trim() || null,
        corredor,
        prateleira,
        exemplares: qtd,
        exemplares_disponiveis: qtd,
        status: 'disponivel'
      });

      const livro = await db('livros').where({ id }).first();

      res.status(201).json({
        message: '✅ Livro cadastrado com sucesso!',
        info: `📍 Corredor ${corredor} - Prateleira ${prateleira} | ${qtd} exemplar(es)`,
        livro
      });
    } catch (error) {
      console.error('Erro ao cadastrar livro:', error);
      res.status(500).json({ error: 'Erro ao cadastrar livro' });
    }
  }
}