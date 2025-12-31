import { Router } from 'express';
import { LivroController } from '../controllers/LivroController';
import { authMiddleware, bibliotecarioMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', LivroController.listar);
router.get('/:id', LivroController.buscarPorId);
router.post('/', authMiddleware, bibliotecarioMiddleware, LivroController.criar);
router.put('/:id', authMiddleware, bibliotecarioMiddleware, LivroController.atualizar);
router.delete('/:id', authMiddleware, bibliotecarioMiddleware, LivroController.deletar);

export default router;