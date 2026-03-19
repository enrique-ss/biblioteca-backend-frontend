import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import db from '../database';

export class QuizController {

    // Busca o progresso do usuário logado
    buscarProgresso = async (req: AuthRequest, res: Response) => {
        try {
            const usuario_id = req.usuario!.id;
            const progresso = await db('quiz_progresso')
                .where({ usuario_id })
                .first();

            if (!progresso) {
                return res.json({ xp: 0, level: 1, hp: 5, completedLessons: [] });
            }

            res.json({
                xp: progresso.xp,
                level: progresso.level,
                hp: progresso.hp,
                completedLessons: JSON.parse(progresso.completed_lessons || '[]'),
            });
        } catch (error) {
            console.error('Erro ao buscar progresso:', error);
            res.status(500).json({ error: 'Erro ao buscar progresso do quiz' });
        }
    };

    // Salva o progresso do usuário logado
    salvarProgresso = async (req: AuthRequest, res: Response) => {
        try {
            const usuario_id = req.usuario!.id;
            const { xp, level, hp, completedLessons } = req.body;

            const existe = await db('quiz_progresso').where({ usuario_id }).first();

            const dados = {
                xp: xp ?? 0,
                level: level ?? 1,
                hp: hp ?? 5,
                completed_lessons: JSON.stringify(completedLessons ?? []),
                updated_at: db.fn.now(),
            };

            if (existe) {
                await db('quiz_progresso').where({ usuario_id }).update(dados);
            } else {
                await db('quiz_progresso').insert({ usuario_id, ...dados });
            }

            res.json({ message: 'Progresso salvo!' });
        } catch (error) {
            console.error('Erro ao salvar progresso:', error);
            res.status(500).json({ error: 'Erro ao salvar progresso do quiz' });
        }
    };
}