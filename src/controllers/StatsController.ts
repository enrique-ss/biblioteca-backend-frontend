import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

export class StatsController {

    resumo = async (req: AuthRequest, res: Response) => {
        try {
            const isBib = req.usuario!.tipo === 'bibliotecario';
            const usuario_id = req.usuario!.id;
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            if (isBib) {
                // Uma única query com COUNT condicional — 1 roundtrip ao banco
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
                // Uma query para o usuário — agrupa ativos e histórico juntos
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
}