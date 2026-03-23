import { Response } from 'express';
import { RequisicaoAutenticada } from '../middlewares/auth';
import db from '../database';

/**
 * Controlador do Quiz: Gerencia a gamificação e o progresso de aprendizado dos usuários.
 */
export class QuizController {

    // Recupera a ficha de progresso do aluno logado
    buscarProgresso = async (req: RequisicaoAutenticada, res: Response) => {
        try {
            const usuarioId = req.usuario!.id;
            
            const registro = await db('quiz_progresso')
                .where({ usuario_id: usuarioId })
                .first();

            // Se não houver registro (primeiro acesso), retorna valores padrão de iniciante
            if (!registro) {
                return res.json({ 
                    xp: 0, 
                    level: 1, 
                    hp: 5, 
                    lessons: [] 
                });
            }

            res.json({
                xp: registro.xp,
                level: registro.level,
                hp: registro.hp,
                lessons: JSON.parse(registro.completed_lessons || '[]'),
            });
        } catch (erro) {
            console.error('Erro ao buscar progresso do quiz:', erro);
            res.status(500).json({ error: 'Não foi possível carregar seu progresso no quiz.' });
        }
    };

    // Salva ou atualiza a pontuação e lições completadas pelo aluno
    salvarProgresso = async (req: RequisicaoAutenticada, res: Response) => {
        try {
            const usuarioId = req.usuario!.id;
            const { xp, level, hp, lessons } = req.body;

            const registroExistente = await db('quiz_progresso')
                .where({ usuario_id: usuarioId })
                .first();

            const novosDados = {
                xp: xp ?? 0,
                level: level ?? 1,
                hp: hp ?? 5,
                completed_lessons: JSON.stringify(lessons ?? []),
                updated_at: db.fn.now(),
            };

            // Realiza Insert ou Update dependendo da existência prévia do perfil de quiz
            if (registroExistente) {
                await db('quiz_progresso').where({ usuario_id: usuarioId }).update(novosDados);
            } else {
                await db('quiz_progresso').insert({ 
                    usuario_id: usuarioId, 
                    ...novosDados 
                });
            }

            res.json({ message: '✅ Progresso sincronizado com sucesso!' });
        } catch (erro) {
            console.error('Erro ao salvar progresso do quiz:', erro);
            res.status(500).json({ error: 'Falha ao salvar as alterações do quiz.' });
        }
    };
}