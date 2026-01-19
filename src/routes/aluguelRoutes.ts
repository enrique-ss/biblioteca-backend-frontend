import { Router } from 'express';
import { AluguelController } from '../controllers/AluguelController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new AluguelController();

router.post('/', verificarToken, verificarBibliotecario, controller.criar);
router.get('/todos', verificarToken, verificarBibliotecario, controller.listarTodos);
router.get('/meus', verificarToken, controller.meus);
router.put('/:id/devolver', verificarToken, verificarBibliotecario, controller.devolver);

export default router;