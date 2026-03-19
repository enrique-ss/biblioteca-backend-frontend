import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

export class StatsController {

    // Estatísticas adaptadas ao perfil do usuário logado
    resumo = async (req: AuthRequest, res: Response) => {
        try {
            const isBib = req.usuario!.tipo === 'bibliotecario';
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            if (isBib) {
                // ── Bibliotecário: visão geral da biblioteca ─────────
                const [totalLivros] = await db('livros').count('id as total');
                const [disponiveis] = await db('livros').where('exemplares_disponiveis', '>', 0).count('id as total');
                const [ativos] = await db('alugueis').where({ status: 'ativo' }).count('id as total');
                const [atrasados] = await db('alugueis')
                    .where({ status: 'ativo' })
                    .where('data_prevista_devolucao', '<', hoje)
                    .count('id as total');
                const [totalUsuarios] = await db('usuarios').where({ tipo: 'usuario' }).count('id as total');

                res.json({
                    perfil: 'bibliotecario',
                    stats: [
                        { label: 'Total de Livros', valor: totalLivros.total, cor: 'gold' },
                        { label: 'Disponíveis', valor: disponiveis.total, cor: 'green' },
                        { label: 'Empréstimos Ativos', valor: ativos.total, cor: 'gold' },
                        { label: 'Em Atraso', valor: atrasados.total, cor: 'red' },
                        { label: 'Usuários Cadastrados', valor: totalUsuarios.total, cor: '' },
                    ]
                });

            } else {
                // ── Usuário: visão dos próprios empréstimos ──────────
                const usuario_id = req.usuario!.id;

                const [ativos] = await db('alugueis').where({ usuario_id, status: 'ativo' }).count('id as total');
                const [atrasados] = await db('alugueis')
                    .where({ usuario_id, status: 'ativo' })
                    .where('data_prevista_devolucao', '<', hoje)
                    .count('id as total');
                const [historico] = await db('alugueis').where({ usuario_id }).count('id as total');

                res.json({
                    perfil: 'usuario',
                    stats: [
                        { label: 'Livros com Você', valor: ativos.total, cor: 'gold' },
                        { label: 'Em Atraso', valor: atrasados.total, cor: 'red' },
                        { label: 'Total Emprestado', valor: historico.total, cor: '' },
                    ]
                });
            }
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: 'Erro ao buscar estatísticas' });
        }
    };
}