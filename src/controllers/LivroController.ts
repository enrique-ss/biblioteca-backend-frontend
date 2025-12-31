import { Request, Response } from 'express';
import { db } from '../database';

/**
 * LÓGICA PROFISSIONAL DE MAPEAMENTO FÍSICO
 * Organiza o acervo por setores temáticos e códigos de prateleira.
 */
function mapearLocalizacao(genero: string) {
  const g = (genero || '').toLowerCase();

  // 00 - Tecnologia e Computação
  if (g.includes('computacao') || g.includes('tecnologia') || g.includes('programacao') || g.includes('informatica')) 
    return { corredor: '00', prateleira: 'TEC-01' };

  // 01 - Filosofia e Psicologia
  if (g.includes('filosofia') || g.includes('psicologia') || g.includes('autoajuda') || g.includes('mente')) 
    return { corredor: '01', prateleira: 'PHI-02' };

  // 02 - Religião e Espiritualidade
  if (g.includes('religiao') || g.includes('teologia') || g.includes('biblia') || g.includes('espiritual')) 
    return { corredor: '02', prateleira: 'REL-01' };

  // 03 - Ciências Sociais e Direito
  if (g.includes('direito') || g.includes('sociologia') || g.includes('politica') || g.includes('economia')) 
    return { corredor: '03', prateleira: 'SOC-03' };

  // 04 - Idiomas e Educação
  if (g.includes('idioma') || g.includes('dicionario') || g.includes('educacao') || g.includes('pedagogia')) 
    return { corredor: '04', prateleira: 'LAN-01' };

  // 05 - Ciências Exatas (Matemática, Física, Química)
  if (g.includes('matematica') || g.includes('fisica') || g.includes('quimica') || g.includes('astronomia')) 
    return { corredor: '05', prateleira: 'EXA-05' };

  // 06 - Ciências Biológicas e Saúde
  if (g.includes('medicina') || g.includes('biologia') || g.includes('saude') || g.includes('enfermagem')) 
    return { corredor: '06', prateleira: 'BIO-02' };

  // 07 - Artes, Arquitetura e Esportes
  if (g.includes('arte') || g.includes('musica') || g.includes('cinema') || g.includes('esporte') || g.includes('fotografia')) 
    return { corredor: '07', prateleira: 'ART-01' };

  // 08 e 09 - Literatura (Setor de maior volume)
  if (g.includes('fantasia')) return { corredor: '08', prateleira: 'LIT-01' };
  if (g.includes('ficcao') || g.includes('sci-fi') || g.includes('ficção')) return { corredor: '08', prateleira: 'LIT-02' };
  if (g.includes('romance')) return { corredor: '09', prateleira: 'LIT-03' };
  if (g.includes('terror') || g.includes('suspense') || g.includes('policial')) return { corredor: '09', prateleira: 'LIT-04' };
  if (g.includes('poesia') || g.includes('teatro')) return { corredor: '09', prateleira: 'LIT-05' };

  // 10 - História e Geografia
  if (g.includes('historia') || g.includes('geografia') || g.includes('biografia') || g.includes('viagem')) 
    return { corredor: '10', prateleira: 'HIS-01' };

  // 11 - Infantil e Juvenil
  if (g.includes('infantil') || g.includes('kids') || g.includes('juvenil')) 
    return { corredor: '11', prateleira: 'KID-01' };

  // Padrão para não categorizados
  return { corredor: '99', prateleira: 'GERAL' };
}

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
                 .orWhere('genero', 'like', `%${busca}%`);
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
      const { titulo, autor, ano_lancamento, genero, descricao, isbn } = req.body;
      
      // Validação básica
      if (!titulo || !autor || !genero) {
        return res.status(400).json({ error: 'Título, autor e gênero são obrigatórios.' });
      }

      const { corredor, prateleira } = mapearLocalizacao(genero);

      const [id] = await db('livros').insert({
        titulo, 
        autor, 
        genero: genero || 'N/A',
        corredor,
        prateleira,
        ano_lancamento, 
        status: 'disponivel',
        descricao: descricao || null, 
        isbn: isbn || null
      });

      const livro = await db('livros').where({ id }).first();
      res.status(201).json(livro);
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao criar livro', details: error.message });
    }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { titulo, autor, ano_lancamento, genero, descricao, isbn, status } = req.body;
      
      // Recalcula localização se o gênero for alterado
      const { corredor, prateleira } = mapearLocalizacao(genero);

      const result = await db('livros').where({ id }).update({
        titulo, 
        autor, 
        ano_lancamento, 
        genero,
        corredor,
        prateleira,
        descricao, 
        isbn,
        status // Permitir atualizar o status manualmente se necessário
      });

      if (result === 0) return res.status(404).json({ error: 'Livro não encontrado' });
      res.json({ message: 'Livro atualizado com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao atualizar livro', details: error.message });
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