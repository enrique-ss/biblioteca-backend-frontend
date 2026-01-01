import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController';
import { authMiddleware, bibliotecarioMiddleware } from '../middlewares/auth';

const router = Router();

// Apenas bibliotecários podem usar estas rotas
router.get('/', authMiddleware, bibliotecarioMiddleware, UsuarioController.listar);
router.put('/:id', authMiddleware, bibliotecarioMiddleware, UsuarioController.editar);
router.delete('/:id', authMiddleware, bibliotecarioMiddleware, UsuarioController.excluir);

export default router;