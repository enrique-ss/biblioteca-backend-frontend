import { Router } from 'express';
import { AluguelController } from '../controllers/AluguelController';
import { authMiddleware, bibliotecarioMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, bibliotecarioMiddleware, AluguelController.alugar);
router.put('/:id/devolver', authMiddleware, bibliotecarioMiddleware, AluguelController.devolver);
router.get('/todos', authMiddleware, bibliotecarioMiddleware, AluguelController.listarTodos);
router.get('/meus', authMiddleware, AluguelController.meusAlugueis);

export default router;