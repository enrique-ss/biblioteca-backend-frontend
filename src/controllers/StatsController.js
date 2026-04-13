const db = require('../database');

class StatsController {

    resumo = async (req, res) => {
        try {
            const ehBibliotecario = req.usuario.tipo === 'bibliotecario';
            const usuarioId = req.usuario.id;
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            if (ehBibliotecario) {
                const [dadosLivros, dadosEmprestimos, contagemUsuarios] = await Promise.all([
                    db('livros').select(
                        db.raw('COUNT(*) as total'),
                        db.raw('SUM(exemplares_disponiveis) as disponiveis')
                    ).whereNull('deleted_at').first(),
                    db('alugueis').where({ status: 'ativo' }).select(
                        db.raw('COUNT(*) as ativos'),
                        db.raw(`SUM(CASE WHEN data_prevista_devolucao < ? THEN 1 ELSE 0 END) as atrasados`, [hoje])
                    ).first(),
                    db('usuarios').where({ tipo: 'usuario' }).count('id as total').first(),
                ]);

                res.json({
                    perfil: 'bibliotecario',
                    stats: [
                        { label: 'Acervo Total', valor: Number(dadosLivros?.total || 0), cor: 'gold' },
                        { label: 'Na Prateleira', valor: Number(dadosLivros?.disponiveis || 0), cor: 'green' },
                        { label: 'Empréstimos Ativos', valor: Number(dadosEmprestimos?.ativos || 0), cor: 'gold' },
                        { label: 'Livros em Atraso', valor: Number(dadosEmprestimos?.atrasados || 0), cor: 'red' },
                        { label: 'Alunos Ativos', valor: Number(contagemUsuarios?.total || 0), cor: '' },
                    ]
                });
            } else {
                const [dadosPessoais, totalHistorico] = await Promise.all([
                    db('alugueis').where({ usuario_id: usuarioId, status: 'ativo' }).select(
                        db.raw('COUNT(*) as ativos'),
                        db.raw(`SUM(CASE WHEN data_prevista_devolucao < ? THEN 1 ELSE 0 END) as atrasados`, [hoje])
                    ).first(),
                    db('alugueis').where({ usuario_id: usuarioId }).count('id as total').first(),
                ]);

                res.json({
                    perfil: 'usuario',
                    stats: [
                        { label: 'Livros com Você', valor: Number(dadosPessoais?.ativos || 0), cor: 'gold' },
                        { label: 'Itens em Atraso', valor: Number(dadosPessoais?.atrasados || 0), cor: 'red' },
                        { label: 'Total já Alugado', valor: Number(totalHistorico?.total || 0), cor: '' },
                    ]
                });
            }
        } catch (erro) {
            console.error('Erro ao processar resumo estatístico:', erro);
            res.status(500).json({ error: 'Falha ao carregar indicadores do dashboard.' });
        }
    };

    detalhado = async (req, res) => {
        try {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const [
                generosMaisProcurados,
                autoresPopulares,
                livrosFavoritos,
                usuariosEngajados,
                evolucaoEmprestimos,
                novosCadastros,
                indicadoresAtraso,
                divisaoAcervo,
                performanceDevolucao,
                acervoPorDecada,
                evolucaoAtrasos,
            ] = await Promise.all([

                db('alugueis')
                    .join('livros', 'alugueis.livro_id', 'livros.id')
                    .select('livros.genero as label')
                    .count('alugueis.id as valor')
                    .whereNotNull('livros.genero')
                    .groupBy('livros.genero')
                    .orderBy('valor', 'desc')
                    .limit(8),

                db('alugueis')
                    .join('livros', 'alugueis.livro_id', 'livros.id')
                    .select('livros.autor as label')
                    .count('alugueis.id as valor')
                    .groupBy('livros.autor')
                    .orderBy('valor', 'desc')
                    .limit(8),

                db('alugueis')
                    .join('livros', 'alugueis.livro_id', 'livros.id')
                    .select('livros.titulo as label')
                    .count('alugueis.id as valor')
                    .groupBy('livros.titulo')
                    .orderBy('valor', 'desc')
                    .limit(8),

                db('alugueis')
                    .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
                    .select('usuarios.nome as label')
                    .count('alugueis.id as valor')
                    .groupBy('usuarios.nome')
                    .orderBy('valor', 'desc')
                    .limit(8),

                db('alugueis')
                    .select(
                        db.raw("DATE_FORMAT(data_aluguel, '%Y-%m') as label"),
                        db.raw('COUNT(*) as valor')
                    )
                    .where('data_aluguel', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 12 MONTH)"))
                    .groupByRaw("DATE_FORMAT(data_aluguel, '%Y-%m')")
                    .orderBy('label', 'asc'),

                db('usuarios')
                    .select(
                        db.raw("DATE_FORMAT(created_at, '%Y-%m') as label"),
                        db.raw('COUNT(*) as valor')
                    )
                    .where('created_at', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 12 MONTH)"))
                    .groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
                    .orderBy('label', 'asc'),

                db('alugueis')
                    .select(
                        db.raw('COUNT(*) as total'),
                        db.raw(`SUM(CASE WHEN status = 'ativo' AND data_prevista_devolucao < ? THEN 1 ELSE 0 END) as atrasados_atuais`, [hoje]),
                        db.raw(`SUM(CASE WHEN data_devolucao > data_prevista_devolucao THEN 1 ELSE 0 END) as entregues_com_atraso`),
                        db.raw(`SUM(CASE WHEN status = 'devolvido' AND data_devolucao <= data_prevista_devolucao THEN 1 ELSE 0 END) as entregues_no_prazo`)
                    ).first(),

                db('livros')
                    .select('status as label')
                    .count('id as valor')
                    .whereNull('deleted_at')
                    .groupBy('status'),

                db('alugueis')
                    .where({ status: 'devolvido' })
                    .select(
                        db.raw('ROUND(AVG(DATEDIFF(data_devolucao, data_aluguel)), 1) as media_dias'),
                        db.raw('MIN(DATEDIFF(data_devolucao, data_aluguel)) as min_dias'),
                        db.raw('MAX(DATEDIFF(data_devolucao, data_aluguel)) as max_dias')
                    ).first(),

                db('livros')
                    .select(
                        db.raw('CONCAT(FLOOR(ano_lancamento/10)*10, "s") as label'),
                        db.raw('COUNT(*) as valor')
                    )
                    .whereNull('deleted_at')
                    .groupByRaw('CONCAT(FLOOR(ano_lancamento/10)*10, "s")')
                    .orderByRaw('MIN(ano_lancamento) asc'),

                db('alugueis')
                    .select(
                        db.raw("DATE_FORMAT(data_prevista_devolucao, '%Y-%m') as label"),
                        db.raw('COUNT(*) as valor')
                    )
                    .where('data_prevista_devolucao', '<', hoje)
                    .where('data_prevista_devolucao', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 12 MONTH)"))
                    .groupByRaw("DATE_FORMAT(data_prevista_devolucao, '%Y-%m')")
                    .orderBy('label', 'asc'),
            ]);

            const totalAtrasos = Number(indicadoresAtraso.atrasados_atuais || 0) + Number(indicadoresAtraso.entregues_com_atraso || 0);
            const totalEmprestimos = Number(indicadoresAtraso.total || 0) || 1;
            const taxaAtrasoPct = Math.round((totalAtrasos / totalEmprestimos) * 100);

            res.json({
                generosMaisEmprestados: generosMaisProcurados,
                autoresMaisEmprestados: autoresPopulares,
                livrosMaisEmprestados: livrosFavoritos,
                usuariosMaisAtivos: usuariosEngajados,
                emprestimosPorMes: evolucaoEmprestimos,
                cadastrosPorMes: novosCadastros,
                distribuicaoStatus: divisaoAcervo,
                tempoMedioDevolucao: performanceDevolucao,
                livrosPorAno: acervoPorDecada,
                evolucaoAtrasos,
                kpis: [
                    { label: 'Total de Empréstimos', valor: String(indicadoresAtraso.total || 0) },
                    { label: 'Devolvidos no Prazo', valor: String(indicadoresAtraso.entregues_no_prazo || 0) },
                    { label: 'Devolvidos com Atraso', valor: String(indicadoresAtraso.entregues_com_atraso || 0) },
                    { label: 'Ativos em Atraso', valor: String(indicadoresAtraso.atrasados_atuais || 0) },
                    { label: 'Taxa de Atraso', valor: taxaAtrasoPct + '%' },
                    { label: 'Média de Devolução', valor: (performanceDevolucao.media_dias || '—') + ' d' }
                ]
            });
        } catch (erro) {
            console.error('Erro ao gerar relatório detalhado:', erro);
            res.status(500).json({ error: 'Erro ao processar estatísticas avançadas.' });
        }
    };
}

module.exports = new StatsController();
