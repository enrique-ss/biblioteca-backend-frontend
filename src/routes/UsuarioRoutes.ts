import { Router } from 'express';
import { UsuarioController } from '../controllers/usuarioController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new UsuarioController();

router.get('/', verificarToken, verificarBibliotecario, controller.listar);
router.put('/:id', verificarToken, verificarBibliotecario, controller.atualizar);
router.delete('/:id', verificarToken, verificarBibliotecario, controller.excluir);

export default router;