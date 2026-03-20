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

  // Recalcula exemplares_disponiveis e status do livro com base nos exemplares reais
  private recalcularContadores = async (livro_id: number) => {
    // Conta todos os exemplares exceto perdidos para o total físico
    // Disponíveis = disponibilidade='disponivel' (independente da condição)
    const [{ total }, { disponiveis }] = await Promise.all([
      db('exemplares').where({ livro_id }).whereNot({ condicao: 'perdido' }).count('id as total').first() as Promise<any>,
      db('exemplares').where({ livro_id, disponibilidade: 'disponivel' }).count('id as disponiveis').first() as Promise<any>
    ]);
    await db('livros').where({ id: livro_id }).update({
      exemplares: Number(total),
      exemplares_disponiveis: Number(disponiveis),
      status: Number(disponiveis) > 0 ? 'disponivel' : 'alugado'
    });
  };

  // Listar com busca, filtro, paginação, ordenação e condição dos exemplares
  listar = async (req: AuthRequest, res: Response) => {
    try {
      const { status, busca, page: p, limit: l, sort = 'titulo', order = 'asc' } = req.query;
      const page = Math.max(1, parseInt(String(p || 1)));
      const limit = Math.min(100, parseInt(String(l || 20)));
      const offset = (page - 1) * limit;

      const allowed = ['titulo', 'autor', 'genero', 'ano_lancamento', 'status', 'created_at'];
      const col = allowed.includes(String(sort)) ? String(sort) : 'titulo';
      const dir = order === 'desc' ? 'desc' : 'asc';

      let query = db('livros').whereNull('deleted_at');

      if (status === 'disponivel') query = query.where('exemplares_disponiveis', '>', 0);
      else if (status === 'alugado') query = query.where({ status: 'alugado' });

      if (busca && String(busca).trim()) {
        const termo = `%${String(busca).trim()}%`;
        query = query.where(b =>
          b.whereILike('titulo', termo)
            .orWhereILike('autor', termo)
            .orWhereILike('genero', termo)
        );
      }

      const [rows, [{ total }]] = await Promise.all([
        query.clone().select('*').orderBy(col, dir).limit(limit).offset(offset),
        query.clone().count('id as total')
      ]);

      // Enriquece cada livro com contagem de exemplares por condição física
      // Enriquece com condição física dos exemplares (independente da disponibilidade)
      const livroIds = (rows as any[]).map((r: any) => r.id);
      let condicoes: any[] = [];
      if (livroIds.length > 0) {
        condicoes = await db('exemplares')
          .whereIn('livro_id', livroIds)
          .select('livro_id', 'condicao')
          .count('id as qtd')
          .groupBy('livro_id', 'condicao');
      }

      const condicaoMap: Record<number, any> = {};
      for (const c of condicoes) {
        if (!condicaoMap[c.livro_id]) condicaoMap[c.livro_id] = {};
        condicaoMap[c.livro_id][c.condicao] = Number(c.qtd);
      }

      const data = (rows as any[]).map((r: any) => ({
        ...r,
        condicao: condicaoMap[r.id] ?? {}
      }));

      res.json({ data, total, page, limit, pages: Math.ceil(Number(total) / limit) });
    } catch (error) {
      console.error('Erro ao listar livros:', error);
      res.status(500).json({ error: 'Erro ao listar livros' });
    }
  };

  // Listar exemplares de um livro específico
  listarExemplares = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const livro = await db('livros').where({ id }).whereNull('deleted_at').first();
      if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });

      const exemplares = await db('exemplares')
        .where({ livro_id: id })
        .select('id', 'codigo', 'disponibilidade', 'condicao', 'observacao', 'created_at')
        .orderBy('id', 'asc');

      const exemplariesComHistorico = await Promise.all(
        exemplares.map(async (ex) => {
          const ultimoAluguel = await db('alugueis')
            .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
            .where({ 'alugueis.exemplar_id': ex.id })
            .select(
              'alugueis.id as aluguel_id',
              'usuarios.nome as usuario',
              'usuarios.email as contato',
              'alugueis.data_aluguel',
              'alugueis.data_prevista_devolucao as prazo',
              'alugueis.status as status_aluguel'
            )
            .orderBy('alugueis.id', 'desc')
            .first();
          return { ...ex, ultimo_aluguel: ultimoAluguel || null };
        })
      );

      res.json({ livro: { id: livro.id, titulo: livro.titulo, autor: livro.autor }, exemplares: exemplariesComHistorico });
    } catch (error) {
      console.error('Erro ao listar exemplares:', error);
      res.status(500).json({ error: 'Erro ao listar exemplares' });
    }
  };

  // Atualizar status de um exemplar individual
  atualizarExemplar = async (req: AuthRequest, res: Response) => {
    try {
      const { exemplar_id } = req.params;
      const { status, observacao } = req.body;

      // Aceita atualização de condicao (bom/danificado/perdido) OU disponibilidade (disponivel/emprestado)
      const { condicao } = req.body;
      const condicoesValidas = ['bom', 'danificado', 'perdido'];
      const disponibilidades = ['disponivel', 'emprestado'];

      const exemplar = await db('exemplares').where({ id: exemplar_id }).first();
      if (!exemplar) return res.status(404).json({ error: 'Exemplar não encontrado' });

      const atualizacao: any = { observacao: observacao?.trim() || null };

      if (condicao !== undefined) {
        if (!condicoesValidas.includes(condicao))
          return res.status(400).json({ error: `Condição inválida. Use: ${condicoesValidas.join(', ')}` });
        atualizacao.condicao = condicao;
      }

      if (status !== undefined) {
        if (!disponibilidades.includes(status))
          return res.status(400).json({ error: `Disponibilidade inválida. Use: ${disponibilidades.join(', ')}` });
        if (exemplar.disponibilidade === 'emprestado' && status === 'disponivel')
          return res.status(400).json({ error: 'Use o fluxo de devolução para marcar como disponível' });
        atualizacao.disponibilidade = status;
      }

      await db('exemplares').where({ id: exemplar_id }).update(atualizacao);

      await this.recalcularContadores(exemplar.livro_id);

      const atualizado = await db('exemplares').where({ id: exemplar_id }).first();
      res.json({ message: '✅ Exemplar atualizado!', exemplar: atualizado });
    } catch (error) {
      console.error('Erro ao atualizar exemplar:', error);
      res.status(500).json({ error: 'Erro ao atualizar exemplar' });
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

      await db.transaction(async (trx) => {
        const [livro_id] = await trx('livros').insert({
          titulo: titulo.trim(), autor: autor.trim(), ano_lancamento: ano,
          genero: genero?.trim() || 'Não Informado', isbn: isbn?.trim() || null,
          corredor, prateleira, exemplares: qtd, exemplares_disponiveis: qtd,
          status: 'disponivel', deleted_at: null
        });

        const inserts = Array.from({ length: qtd }, (_, i) => ({
          livro_id,
          codigo: `EX-${livro_id}-${String(i + 1).padStart(3, '0')}`,
          disponibilidade: 'disponivel',
          condicao: 'bom'
        }));
        await trx('exemplares').insert(inserts);
      });

      const livro = await db('livros')
        .where({ titulo: titulo.trim(), autor: autor.trim() })
        .orderBy('id', 'desc').first();

      res.status(201).json({
        message: '✅ Livro cadastrado com sucesso!',
        info: `📍 Corredor ${corredor} - Prateleira ${prateleira} | ${qtd} exemplar(es)`,
        livro
      });
    } catch (error) {
      console.error('Erro ao cadastrar livro:', error);
      res.status(500).json({ error: 'Erro ao cadastrar livro' });
    }
  };

  // Editar livro
  editar = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { titulo, autor, ano_lancamento, genero, isbn, exemplares } = req.body;

      const livro = await db('livros').where({ id }).whereNull('deleted_at').first();
      if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });

      const dados: any = {};
      if (titulo !== undefined) dados.titulo = titulo.trim();
      if (autor !== undefined) dados.autor = autor.trim();
      if (genero !== undefined) dados.genero = genero.trim() || 'Não Informado';
      if (isbn !== undefined) dados.isbn = isbn.trim() || null;
      if (ano_lancamento !== undefined) {
        const ano = parseInt(ano_lancamento);
        const anoAtual = new Date().getFullYear();
        if (isNaN(ano) || ano < 500 || ano > anoAtual + 1)
          return res.status(400).json({ error: `Ano inválido. Deve ser entre 500 e ${anoAtual + 1}` });
        dados.ano_lancamento = ano;
      }

      if (exemplares !== undefined) {
        const qtd = Math.min(999, Math.max(1, parseInt(exemplares) || 1));
        const diff = qtd - livro.exemplares;

        if (diff > 0) {
          const { total: base } = await db('exemplares').where({ livro_id: id }).count('id as total').first() as any;
          const inserts = Array.from({ length: diff }, (_, i) => ({
            livro_id: Number(id),
            codigo: `EX-${id}-${String(Number(base) + i + 1).padStart(3, '0')}`,
            disponibilidade: 'disponivel',
            condicao: 'bom'
          }));
          await db('exemplares').insert(inserts);
        } else if (diff < 0) {
          const paraRemover = await db('exemplares')
            .where({ livro_id: id, disponibilidade: 'disponivel' })
            .limit(Math.abs(diff)).select('id');

          if (paraRemover.length < Math.abs(diff))
            return res.status(400).json({
              error: `Não é possível reduzir: apenas ${paraRemover.length} exemplar(es) disponível(is) para remover`
            });

          await db('exemplares').whereIn('id', paraRemover.map(e => e.id)).del();
        }

        await this.recalcularContadores(Number(id));
      }

      if (Object.keys(dados).length > 0) await db('livros').where({ id }).update(dados);

      const atualizado = await db('livros').where({ id }).first();
      res.json({ message: '✅ Livro atualizado com sucesso!', livro: atualizado });
    } catch (error) {
      console.error('Erro ao editar livro:', error);
      res.status(500).json({ error: 'Erro ao editar livro' });
    }
  };

  // Soft delete
  remover = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const livro = await db('livros').where({ id }).whereNull('deleted_at').first();
      if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });

      const [{ total }] = await db('alugueis')
        .where({ livro_id: id })
        .whereIn('status', ['ativo', 'atrasado'])
        .count('id as total');

      if (Number(total) > 0)
        return res.status(400).json({ error: `❌ Não é possível remover: ${total} exemplar(es) em empréstimo ativo.` });

      await db('livros').where({ id }).update({ deleted_at: new Date() });
      res.json({ message: '✅ Livro removido do acervo.' });
    } catch (error) {
      console.error('Erro ao remover livro:', error);
      res.status(500).json({ error: 'Erro ao remover livro' });
    }
  };
}