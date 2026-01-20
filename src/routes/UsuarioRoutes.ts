import { Router } from 'express';
import { UsuarioController } from '../controllers/usuarioController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new UsuarioController();

// Bloqueio total: Apenas bibliotecários acessam a lista de usuários
router.use(verificarToken, verificarBibliotecario);

router.get('/', controller.listar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.excluir);

export default router;