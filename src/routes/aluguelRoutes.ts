import { Router } from 'express';
import { AluguelController } from '../controllers/AluguelController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new AluguelController();

router.use(verificarToken);

router.get('/meus', controller.meus);
router.get('/todos', verificarBibliotecario, controller.listarTodos);
router.get('/historico', verificarBibliotecario, controller.historico);
router.get('/atrasados', verificarBibliotecario, controller.atrasados);
router.post('/', verificarBibliotecario, controller.criar);
router.put('/:id/devolver', verificarBibliotecario, controller.devolver);
router.put('/:id/renovar', controller.renovar);

export default router;