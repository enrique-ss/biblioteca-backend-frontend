import { Router } from 'express';
import { InfantilController } from '../controllers/InfantilController';
import { verificarToken } from '../middlewares/auth';

const router = Router();
const infantilController = new InfantilController();

// Todas as rotas do espaço literário exigem que o usuário esteja logado (verificarToken)
router.get('/data', verificarToken, infantilController.getData);

export default router;
