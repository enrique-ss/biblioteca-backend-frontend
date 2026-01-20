import { Response } from 'express';
import db from '../database';
import { AuthRequest } from '../middlewares/auth';

export class LivroController {
  // ✅ PASSO 3: Mágica da Localização Automática
  private gerarLocalizacao() {
    const corredores = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const prateleiras = ['1', '2', '3', '4', '5'];

    const corredor = corredores[Math.floor(Math.random() * corredores.length)];
    const prateleira = prateleiras[Math.floor(Math.random() * prateleiras.length)];

    return { corredor, prateleira };
  }

  // ✅ PASSO 4 & 6: Consultar Acervo (Leitor e Bibliotecário)
  listar = async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.query;

      let query = db('livros').select('*');

      // Filtro opcional: permite buscar só os disponíveis ou só os alugados
      if (status === 'disponivel') {
        query = query.where({ status: 'disponivel' });
      } else if (status === 'alugado') {
        query = query.where({ status: 'alugado' });
      }

      const livros = await query.orderBy('titulo', 'asc');

      // Retorna a lista para alimentar a tabela do CLI
      res.json(livros);
    } catch (error) {
      console.error('Erro ao listar livros:', error);
      res.status(500).json({ error: 'Erro ao listar livros' });
    }
  }

  // ✅ PASSO 3: Bibliotecário Cadastra Livro
  cadastrar = async (req: AuthRequest, res: Response) => {
    try {
      const { titulo, autor, ano_lancamento, genero, isbn } = req.body;

      // Regras de validação (Campos obrigatórios)
      if (!titulo || titulo.trim().length === 0) {
        return res.status(400).json({ error: 'O título do livro é obrigatório' });
      }

      if (!autor || autor.trim().length === 0) {
        return res.status(400).json({ error: 'O nome do autor é obrigatório' });
      }

      const ano = parseInt(ano_lancamento);
      const anoAtual = new Date().getFullYear();

      if (isNaN(ano) || ano < 500 || ano > anoAtual + 1) {
        return res.status(400).json({
          error: `Ano de lançamento inválido. Deve ser entre 500 e ${anoAtual + 1}`
        });
      }

      // Executa a regra de localização automática
      const { corredor, prateleira } = this.gerarLocalizacao();

      const [id] = await db('livros').insert({
        titulo: titulo.trim(),
        autor: autor.trim(),
        ano_lancamento: ano,
        genero: genero?.trim() || 'Não Informado',
        isbn: isbn?.trim() || null,
        corredor,
        prateleira,
        status: 'disponivel' // Regra: Todo livro começa disponível
      });

      const livro = await db('livros').where({ id }).first();

      // Resposta formatada conforme Passo 3 do manual
      res.status(201).json({
        message: '✅ Livro cadastrado com sucesso!',
        info: `📍 Localização automática: Corredor ${corredor} - Prateleira ${prateleira}`,
        livro
      });
    } catch (error) {
      console.error('Erro ao cadastrar livro:', error);
      res.status(500).json({ error: 'Erro ao cadastrar livro' });
    }
  }
}