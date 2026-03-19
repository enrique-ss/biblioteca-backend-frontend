import { Router } from 'express';
import { StatsController } from '../controllers/StatsController';
import { verificarToken } from '../middlewares/auth';

const router = Router();
const controller = new StatsController();

router.get('/', verificarToken, controller.resumo);

export default router;