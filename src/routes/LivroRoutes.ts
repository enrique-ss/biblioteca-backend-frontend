import { Router } from 'express';
import { LivroController } from '../controllers/LivroController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new LivroController();

router.get('/', verificarToken, controller.listar);
router.post('/', verificarToken, verificarBibliotecario, controller.cadastrar);

export default router;