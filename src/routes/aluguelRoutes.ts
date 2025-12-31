import { Router } from 'express';
import { AluguelController } from '../controllers/AluguelController';
import { authMiddleware, bibliotecarioMiddleware } from '../middlewares/auth';
const router = Router();
router.post('/', authMiddleware, AluguelController.alugar);
router.get('/meus', authMiddleware, AluguelController.meusAlugueis);
router.put('/:id/devolver', authMiddleware, bibliotecarioMiddleware, AluguelController.devolver);
export default router;