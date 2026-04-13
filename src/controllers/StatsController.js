const supabase = require('../database');

class StatsController {

    resumo = async (req, res) => {
        try {
            const ehBibliotecario = req.usuario.tipo === 'bibliotecario';
            const usuarioId = req.usuario.id;
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            if (ehBibliotecario) {
                const [{ count: totalLivros }, { count: totalDisponiveis }, { count: ativos }, { count: totalUsuarios }] = await Promise.all([
                    supabase.from('livros').select('*', { count: 'exact', head: true }).is('deleted_at', null),
                    supabase.from('livros').select('*', { count: 'exact', head: true }).is('deleted_at', null).gt('exemplares_disponiveis', 0),
                    supabase.from('alugueis').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
                    supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('tipo', 'usuario')
                ]);

                const { data: atrasados } = await supabase
                    .from('alugueis')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'ativo')
                    .lt('data_prevista_devolucao', hoje.toISOString());

                res.json({
                    perfil: 'bibliotecario',
                    stats: [
                        { label: 'Acervo Total', valor: totalLivros || 0, cor: 'gold' },
                        { label: 'Na Prateleira', valor: totalDisponiveis || 0, cor: 'green' },
                        { label: 'Empréstimos Ativos', valor: ativos || 0, cor: 'gold' },
                        { label: 'Livros em Atraso', valor: (atrasados || 0), cor: 'red' },
                        { label: 'Alunos Ativos', valor: totalUsuarios || 0, cor: '' },
                    ]
                });
            } else {
                const [{ count: ativos }, { count: totalHistorico }] = await Promise.all([
                    supabase.from('alugueis').select('*', { count: 'exact', head: true }).eq('usuario_id', usuarioId).eq('status', 'ativo'),
                    supabase.from('alugueis').select('*', { count: 'exact', head: true }).eq('usuario_id', usuarioId)
                ]);

                const { data: atrasados } = await supabase
                    .from('alugueis')
                    .select('*', { count: 'exact', head: true })
                    .eq('usuario_id', usuarioId)
                    .eq('status', 'ativo')
                    .lt('data_prevista_devolucao', hoje.toISOString());

                res.json({
                    perfil: 'usuario',
                    stats: [
                        { label: 'Livros com Você', valor: ativos || 0, cor: 'gold' },
                        { label: 'Itens em Atraso', valor: (atrasados || 0), cor: 'red' },
                        { label: 'Total já Alugado', valor: totalHistorico || 0, cor: '' },
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
            res.json({
                generosMaisEmprestados: [],
                autoresMaisEmprestados: [],
                livrosMaisEmprestados: [],
                usuariosMaisAtivos: [],
                emprestimosPorMes: [],
                cadastrosPorMes: [],
                distribuicaoStatus: [],
                tempoMedioDevolucao: {},
                livrosPorAno: [],
                evolucaoAtrasos: [],
                kpis: []
            });
        } catch (erro) {
            console.error('Erro ao gerar relatório detalhado:', erro);
            res.status(500).json({ error: 'Erro ao processar estatísticas avançadas.' });
        }
    };
}

module.exports = new StatsController();
