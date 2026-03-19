import { Router } from 'express';
import { QuizController } from '../controllers/QuizController';
import { verificarToken } from '../middlewares/auth';

const router = Router();
const controller = new QuizController();

router.use(verificarToken);
router.get('/', controller.buscarProgresso);
router.post('/', controller.salvarProgresso);

export default router;