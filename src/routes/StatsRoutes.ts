import { Router } from 'express';
import { StatsController } from '../controllers/StatsController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new StatsController();

router.get('/', verificarToken, controller.resumo);
router.get('/detalhado', verificarToken, verificarBibliotecario, controller.detalhado);

export default router;