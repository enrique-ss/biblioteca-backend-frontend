import { Router } from 'express';
import { QuizController } from '../controllers/QuizController';
import { verificarToken } from '../middlewares/auth';

const router = Router();
const controller = new QuizController();

/**
 * Rotas de Gamificação (Quiz): Protegidas para todos os alunos autenticados.
 */
router.use(verificarToken);

// Consulta e persistência de progresso (XP, Level, HP e Lições)
router.get('/', controller.buscarProgresso);
router.post('/', controller.salvarProgresso);

export default router;