import { Router } from 'express';
import { AluguelController } from '../controllers/aluguelController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new AluguelController();

router.use(verificarToken); // Todos precisam de login

// Rotas do Usuário Comum
router.get('/meus', controller.meus);

// Rotas exclusivas do Bibliotecário
router.get('/todos', verificarBibliotecario, controller.listarTodos);
router.post('/', verificarBibliotecario, controller.criar);
router.put('/:id/devolver', verificarBibliotecario, controller.devolver);

export default router;