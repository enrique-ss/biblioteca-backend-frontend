import { Router } from 'express';
import { AluguelController } from '../controllers/AluguelController';
import { authMiddleware, bibliotecarioMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, AluguelController.alugar);
// Alterado para buscar todos os registros (visão do admin)
router.get('/todos', authMiddleware, bibliotecarioMiddleware, AluguelController.listarTodos);
router.put('/:id/devolver', authMiddleware, bibliotecarioMiddleware, AluguelController.devolver);

export default router;