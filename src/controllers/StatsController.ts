import { Response } from 'express';
import { RequisicaoAutenticada } from '../middlewares/auth';
import db from '../database';

/**
 * Controlador de Estatísticas: Fornece dados consolidados para o Dashboard e Relatórios.
 */
export class StatsController {

    // Resumo simplificado para os cartões da tela inicial (Dashboard)
    resumo = async (req: RequisicaoAutenticada, res: Response) => {
        try {
            const ehBibliotecario = req.usuario!.tipo === 'bibliotecario';
            const usuarioId = req.usuario!.id;
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            if (ehBibliotecario) {
                // Visão Geral do Sistema (Apenas para Administradores)
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
                // Visão Individual (Para Alunos)
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

    // Dados detalhados para gráficos e análise profunda (Exclusivo Bibliotecário)
    detalhado = async (req: RequisicaoAutenticada, res: Response) => {
        try {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            // Coleta múltiplas análises em paralelo para otimizar o tempo de resposta
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

                // Top 8 gêneros com maior circulação
                db('alugueis')
                    .join('livros', 'alugueis.livro_id', 'livros.id')
                    .select('livros.genero as label')
                    .count('alugueis.id as valor')
                    .whereNotNull('livros.genero')
                    .groupBy('livros.genero')
                    .orderBy('valor', 'desc')
                    .limit(8),

                // Top 8 autores com mais retiradas
                db('alugueis')
                    .join('livros', 'alugueis.livro_id', 'livros.id')
                    .select('livros.autor as label')
                    .count('alugueis.id as valor')
                    .groupBy('livros.autor')
                    .orderBy('valor', 'desc')
                    .limit(8),

                // Os 8 livros mais emprestados de todos os tempos
                db('alugueis')
                    .join('livros', 'alugueis.livro_id', 'livros.id')
                    .select('livros.titulo as label')
                    .count('alugueis.id as valor')
                    .groupBy('livros.titulo')
                    .orderBy('valor', 'desc')
                    .limit(8),

                // Alunos que mais utilizam a biblioteca
                db('alugueis')
                    .join('usuarios', 'alugueis.usuario_id', 'usuarios.id')
                    .select('usuarios.nome as label')
                    .count('alugueis.id as valor')
                    .groupBy('usuarios.nome')
                    .orderBy('valor', 'desc')
                    .limit(8),

                // Evolução mensal de empréstimos (último ano)
                db('alugueis')
                    .select(
                        db.raw("DATE_FORMAT(data_aluguel, '%Y-%m') as label"),
                        db.raw('COUNT(*) as valor')
                    )
                    .where('data_aluguel', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 12 MONTH)"))
                    .groupByRaw("DATE_FORMAT(data_aluguel, '%Y-%m')")
                    .orderBy('label', 'asc'),

                // Crescimento da base de usuários
                db('usuarios')
                    .select(
                        db.raw("DATE_FORMAT(created_at, '%Y-%m') as label"),
                        db.raw('COUNT(*) as valor')
                    )
                    .where('created_at', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 12 MONTH)"))
                    .groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
                    .orderBy('label', 'asc'),

                // Monitoramento de saúde de prazos
                db('alugueis')
                    .select(
                        db.raw('COUNT(*) as total'),
                        db.raw(`SUM(CASE WHEN status = 'ativo' AND data_prevista_devolucao < ? THEN 1 ELSE 0 END) as atrasados_atuais`, [hoje]),
                        db.raw(`SUM(CASE WHEN data_devolucao > data_prevista_devolucao THEN 1 ELSE 0 END) as entregues_com_atraso`),
                        db.raw(`SUM(CASE WHEN status = 'devolvido' AND data_devolucao <= data_prevista_devolucao THEN 1 ELSE 0 END) as entregues_no_prazo`)
                    ).first(),

                // Status atual das obras no catálogo
                db('livros')
                    .select('status as label')
                    .count('id as valor')
                    .whereNull('deleted_at')
                    .groupBy('status'),

                // Métricas de tempo de posse do livro
                db('alugueis')
                    .where({ status: 'devolvido' })
                    .select(
                        db.raw('ROUND(AVG(DATEDIFF(data_devolucao, data_aluguel)), 1) as media_dias'),
                        db.raw('MIN(DATEDIFF(data_devolucao, data_aluguel)) as min_dias'),
                        db.raw('MAX(DATEDIFF(data_devolucao, data_aluguel)) as max_dias')
                    ).first(),

                // Distribuição cronológica das obras
                db('livros')
                    .select(
                        db.raw('CONCAT(FLOOR(ano_lancamento/10)*10, "s") as label'),
                        db.raw('COUNT(*) as valor')
                    )
                    .whereNull('deleted_at')
                    .groupByRaw('CONCAT(FLOOR(ano_lancamento/10)*10, "s")')
                    .orderByRaw('MIN(ano_lancamento) asc'),

                // Histórico mensal de atrasos
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

            res.json({
                generosMaisEmprestados: generosMaisProcurados,
                autoresMaisEmprestados: autoresPopulares,
                livrosMaisEmprestados: livrosFavoritos,
                usuariosMaisAtivos: usuariosEngajados,
                emprestimosPorMes: evolucaoEmprestimos,
                cadastrosPorMes: novosCadastros,
                taxaAtraso: indicadoresAtraso,
                distribuicaoStatus: divisaoAcervo,
                tempoMedioDevolucao: performanceDevolucao,
                livrosPorAno: acervoPorDecada,
                evolucaoAtrasos,
            });
        } catch (erro) {
            console.error('Erro ao gerar relatório detalhado:', erro);
            res.status(500).json({ error: 'Erro ao processar estatísticas avançadas.' });
        }
    };
}