import { Router } from 'express';
import { LivroController } from '../controllers/LivroController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new LivroController();

router.use(verificarToken);
router.get('/', controller.listar);
router.post('/', verificarBibliotecario, controller.cadastrar);
router.put('/:id', verificarBibliotecario, controller.editar);
router.delete('/:id', verificarBibliotecario, controller.remover);

export default router;