import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

export class StatsController {

    // Resumo rápido para o dashboard do menu
    resumo = async (req: AuthRequest, res: Response) => {
        try {
            const isBib = req.usuario!.tipo === 'bibliotecario';
            const usuario_id = req.usuario!.id;
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            if (isBib) {
                const [livros, emprestimos, totalUsuarios] = await Promise.all([
                    db('livros').select(
                        db.raw('COUNT(*) as total'),
                        db.raw('SUM(exemplares_disponiveis) as disponiveis')
                    ).first(),
                    db('alugueis').where({ status: 'ativo' }).select(
                        db.raw('COUNT(*) as ativos'),
                        db.raw(`SUM(CASE WHEN data_prevista_devolucao < ? THEN 1 ELSE 0 END) as atrasados`, [hoje])
                    ).first(),
                    db('usuarios').where({ tipo: 'usuario' }).count('id as total').first(),
                ]);
                res.json({
                    perfil: 'bibliotecario',
                    stats: [
                        { label: 'Total de Livros', valor: livros?.total ?? 0, cor: 'gold' },
                        { label: 'Disponíveis', valor: livros?.disponiveis ?? 0, cor: 'green' },
                        { label: 'Empréstimos Ativos', valor: emprestimos?.ativos ?? 0, cor: 'gold' },
                        { label: 'Em Atraso', valor: emprestimos?.atrasados ?? 0, cor: 'red' },
                        { label: 'Usuários Cadastrados', valor: totalUsuarios?.total ?? 0, cor: '' },
                    ]
                });
            } else {
                const [resultado, historico] = await Promise.all([
                    db('alugueis').where({ usuario_id, status: 'ativo' }).select(
                        db.raw('COUNT(*) as ativos'),
                        db.raw(`SUM(CASE WHEN data_prevista_devolucao < ? THEN 1 ELSE 0 END) as atrasados`, [hoje])
                    ).first(),
                    db('alugueis').where({ usuario_id }).count('id as total').first(),
                ]);
                res.json({
                    perfil: 'usuario',
                    stats: [
                        { label: 'Livros com Você', valor: resultado?.ativos ?? 0, cor: 'gold' },
                        { label: 'Em Atraso', valor: resultado?.atrasados ?? 0, cor: 'red' },
                        { label: 'Total Emprestado', valor: historico?.total ?? 0, cor: '' },
                    ]
                });
            }
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: 'Erro ao buscar estatísticas' });
        }
    };

    // Estatísticas detalhadas — só bibliotecário
    detalhado = async (req: AuthRequest, res: Response) => {
        try {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const [
                generosMaisEmprestados,
                autoresMaisEmprestados,
                livrosMaisEmprestados,
                usuariosMaisAtivos,
                emprestimosPorMes,
                cadastrosPorMes,
                taxaAtraso,
                distribuicaoStatus,
                tempoMedioDevolucao,
                livrosPorAno,
                atrasosPorMes,
            ] = await Promise.all([

                // Top 8 gêneros mais emprestados
                db('alugueis')
                    .join('livros', 'alugueis.livro_id', 'livros.id')
                    .select('livros.genero as label')
                    .count('alugueis.id as valor')
                    .whereNotNull('livros.genero')
                    .groupBy('livros.genero')
                    .orderBy('valor', 'desc')
                    .limit(8),

                // Top 8 autores mais emprestados
                db('alugueis')
                    .join('livros', 'alugueis.livro_id', 'livros.id')
                    .select('livros.autor as label')
                    .count('alugueis.id as valor')
                    .groupBy('livros.autor')
                    .orderBy('valor', 'desc')
                    .limit(8),

                // Top 8 livros mais emprestados
                db('alugueis')
                    .join('livros', 'alugueis.livro_id', 'livros.id')
                    .select('livros.titulo as label')
                    .count('alugueis.id as valor')
                    .groupBy('livros.titulo')
                    .orderBy('valor', 'desc')
                    .limit(8),

                // Top 8 usuários mais ativos
                db('alugueis')
                    .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
                    .select('usuarios.nome as label')
                    .count('alugueis.id as valor')
                    .groupBy('usuarios.nome')
                    .orderBy('valor', 'desc')
                    .limit(8),

                // Empréstimos por mês (últimos 12 meses)
                db('alugueis')
                    .select(
                        db.raw("DATE_FORMAT(data_aluguel, '%Y-%m') as label"),
                        db.raw('COUNT(*) as valor')
                    )
                    .where('data_aluguel', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 12 MONTH)"))
                    .groupByRaw("DATE_FORMAT(data_aluguel, '%Y-%m')")
                    .orderBy('label', 'asc'),

                // Cadastros de usuários por mês (últimos 12 meses)
                db('usuarios')
                    .select(
                        db.raw("DATE_FORMAT(created_at, '%Y-%m') as label"),
                        db.raw('COUNT(*) as valor')
                    )
                    .where('created_at', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 12 MONTH)"))
                    .groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
                    .orderBy('label', 'asc'),

                // Taxa de atraso geral
                db('alugueis')
                    .select(
                        db.raw('COUNT(*) as total'),
                        db.raw(`SUM(CASE WHEN status = 'ativo' AND data_prevista_devolucao < ? THEN 1 ELSE 0 END) as atrasados`, [hoje]),
                        db.raw(`SUM(CASE WHEN data_devolucao > data_prevista_devolucao THEN 1 ELSE 0 END) as devolvidos_atrasados`),
                        db.raw(`SUM(CASE WHEN status = 'devolvido' AND data_devolucao <= data_prevista_devolucao THEN 1 ELSE 0 END) as devolvidos_prazo`)
                    ).first(),

                // Distribuição do acervo por status
                db('livros')
                    .select('status as label')
                    .count('id as valor')
                    .groupBy('status'),

                // Tempo médio de devolução em dias
                db('alugueis')
                    .where({ status: 'devolvido' })
                    .select(
                        db.raw('ROUND(AVG(DATEDIFF(data_devolucao, data_aluguel)), 1) as media_dias'),
                        db.raw('MIN(DATEDIFF(data_devolucao, data_aluguel)) as min_dias'),
                        db.raw('MAX(DATEDIFF(data_devolucao, data_aluguel)) as max_dias'),
                        db.raw('COUNT(*) as total_devolvidos')
                    ).first(),

                // Livros por década de lançamento
                db('livros')
                    .select(
                        db.raw('CONCAT(FLOOR(ano_lancamento/10)*10, "s") as label'),
                        db.raw('COUNT(*) as valor')
                    )
                    .groupByRaw('CONCAT(FLOOR(ano_lancamento/10)*10, "s")')
                    .orderByRaw('CONCAT(FLOOR(ano_lancamento/10)*10, "s") asc'),

                // Atrasos por mês (últimos 12 meses)
                db('alugueis')
                    .select(
                        db.raw("DATE_FORMAT(data_prevista_devolucao, '%Y-%m') as label"),
                        db.raw('COUNT(*) as valor')
                    )
                    .where('status', 'ativo')
                    .where('data_prevista_devolucao', '<', hoje)
                    .where('data_prevista_devolucao', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 12 MONTH)"))
                    .groupByRaw("DATE_FORMAT(data_prevista_devolucao, '%Y-%m')")
                    .orderBy('label', 'asc'),
            ]);

            res.json({
                generosMaisEmprestados,
                autoresMaisEmprestados,
                livrosMaisEmprestados,
                usuariosMaisAtivos,
                emprestimosPorMes,
                cadastrosPorMes,
                taxaAtraso,
                distribuicaoStatus,
                tempoMedioDevolucao,
                livrosPorAno,
                atrasosPorMes,
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas detalhadas:', error);
            res.status(500).json({ error: 'Erro ao buscar estatísticas detalhadas' });
        }
    };
}