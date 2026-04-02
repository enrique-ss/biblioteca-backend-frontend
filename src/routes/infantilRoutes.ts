import { Router } from 'express';
import { InfantilController } from '../controllers/InfantilController';
import { verificarToken } from '../middlewares/auth';

const router = Router();
const infantilController = new InfantilController();

// Todas as rotas do espaço literário exigem que o usuário esteja logado (verificarToken)
router.get('/data', verificarToken, infantilController.getData);
router.post('/validate-answer', verificarToken, infantilController.validateAnswer);
router.post('/finish-quiz', verificarToken, infantilController.finishQuiz);
router.post('/save-progress', verificarToken, infantilController.saveProgress);

export default router;
